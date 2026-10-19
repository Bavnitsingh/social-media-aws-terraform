# Docker + Nginx: what every line does and why

Interview-prep notes for the Twitter Clone project. Each entry says what the directive does, why it is there, and the follow-up question an interviewer is likely to ask.

Files covered:

1. `docker/Dockerfile` (the app image)
2. `docker/compose.yml` (local development stack)
3. `nginx/conf.d/default.conf` (reverse proxy config)
4. `nginx/Docker/Dockerfile` (the nginx image)
5. `.dockerignore`

---

## 0. The 30-second pitch

> "The app is a Node/TypeScript Express service. I package it as a multi-stage Docker image that runs as a non-root user on a read-only filesystem. Locally, compose runs it with MySQL and an nginx reverse proxy. The same image is what I deploy to AWS behind an ALB, where TLS is handled by ACM, MySQL becomes RDS, and uploads move to S3. Compose is only my dev environment."
> 

---

## 1. Dockerfile (the app image)

Analogy: a multi-stage build is a kitchen with a prep area and a serving area. You chop, peel and make a mess in the prep area (compilers, dev tools). Only the finished dish goes out to the table (the final image).

### `# syntax=docker/dockerfile:1`

- Picks the BuildKit Dockerfile frontend, which enables newer features such as `RUN --mount=type=cache`.
- Without it, the cache-mount lines fail on older builders.

### Why multi-stage (four `FROM` lines)

- The TypeScript compiler and all `devDependencies` are needed to build but are dead weight at runtime.
- Only the last stage becomes the image you ship. Earlier stages are discarded.
- Result: smaller image, smaller attack surface, faster pulls on every ASG instance launch.
- Interview question: "Why is your image small?" Answer: build tools never reach the runtime stage.

### `FROM node:24-slim AS deps`

- `slim` is a minimal Debian. It uses glibc, so native npm modules work. Alpine uses musl, which occasionally breaks native modules.
- `AS deps` names the stage so later stages can copy from it.
- Gap to be honest about: the tag floats. Production would pin an exact version or digest for reproducibility.

### `WORKDIR /app`

- Sets the working directory for the following instructions and for the running process. Creates the folder if missing.
- It also means `express.static('public')` resolves to `/app/public`, because relative paths resolve against the working directory.

### `COPY package.json package-lock.json ./` before the source code

- Docker caches each layer. A layer is rebuilt only if its inputs change.
- Dependencies change rarely, source code changes constantly. Copying only the manifests first means `npm ci` is re-run only when dependencies change.
- Interview question: "How do you speed up builds?" Answer: order instructions from least to most frequently changing.

### `RUN --mount=type=cache,target=/root/.npm npm ci`

- `npm ci` installs exactly what the lockfile says, deletes any existing `node_modules`, and fails if `package.json` and the lockfile disagree. `npm install` can silently change versions.
- The cache mount keeps npm's download cache between builds without baking it into the image.

### `FROM node:24-slim AS prod-deps` and `npm ci --omit=dev`

- A second install with only runtime dependencies. The final stage copies from here instead of running npm itself.
- Benefits: no `devDependencies` in production, and the final stage needs no network access.

### `FROM node:24-slim AS build`

- `COPY --from=deps /app/node_modules ./node_modules` takes the full dependencies from the first stage.
- `COPY package.json tsconfig.json ./` and `COPY src ./src` copy only what the compiler needs. This is deliberate: it keeps `.env` files, local `node_modules` and uploads out of the build even if `.dockerignore` is wrong.
- `RUN npm run build` compiles TypeScript into `dist/`.

### `FROM node:24-slim AS runner`

- The stage that becomes the image.

### `ENV NODE_ENV=production`

- Express caches compiled views and hides stack traces from users. Many libraries also skip debug behaviour.

### The `COPY` lines in the runner

- `node_modules` comes from `prod-deps`, and `dist` and the views come from `build`.
- `package.json` is needed at runtime. The project uses ES modules (`import.meta.dirname`, `.js` import suffixes), and Node reads `"type": "module"` from `package.json` to decide how to load files.
- `src/views` is copied to `dist/views` because `tsc` only compiles `.ts` files and does not copy `.ejs` templates.
- `public` is copied so the app image works on its own even without nginx.
- These files stay root-owned. The runtime user can read them but cannot modify them. If the app is ever compromised, it cannot rewrite its own code.

### `RUN mkdir -p /app/uploads /app/data && chown node:node ...`

- Only these two folders are writable by the app user. Everything else is read-only.

### `USER node`

- Runs as the built-in non-root `node` user (UID 1000). Least privilege: if someone breaks into the process, they are not root inside the container.
- The compose tmpfs mounts use `uid=1000,gid=1000` to match.
- Previously the image used `useradd -r`, whose UID is assigned dynamically, so it could silently mismatch compose.

### `EXPOSE 1234`

- Documentation only. It does not publish the port. Publishing is done by `ports:` in compose, or by the ALB target group on AWS.

### `HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=5`

- `interval`: how often to check.
- `timeout`: how long one check may take.
- `start-period`: grace time while the app boots. Failures during this window do not count.
- `retries`: consecutive failures before the container is marked `unhealthy`.
- It runs a one-liner with Node's built-in `http` module because the slim image has no `curl` or `wget`. Installing them just for a health check would add attack surface.
- The JSON array (exec) form runs the command directly without a shell.
- It lives in the image, not in compose, so there is one source of truth for compose and for any plain `docker run` on EC2.

### `CMD ["node", "dist/index.js"]`

- Exec form: Node is launched directly. Shell form (`CMD node dist/index.js`) wraps it in `/bin/sh -c`, and signals like SIGTERM go to the shell, not Node.
- `CMD` is the default command and is overridable at run time. `ENTRYPOINT` is the fixed executable. Interview classic.

---

## 2. compose.yml (local dev stack)

Analogy: if each container is one employee, compose is the office floor plan. It decides who sits where, who can talk to whom, and who must arrive before whom.

### `name: twitter-clone`

- Project name. It prefixes container, network and volume names, so two projects do not collide.

### `x-logging: &default-logging` and `logging: *default-logging`

- Top-level keys starting with `x-` are ignored by Compose, so you can use them as scratch space.
- `&default-logging` defines a YAML anchor and `default-logging` reuses it. It avoids repeating the same block in every service.
- `json-file` with `max-size: 10m` and `max-file: 3` rotates logs. The default has no limit and slowly fills the disk.
- On AWS this becomes the CloudWatch logging driver or agent.

### Service `db`

- `image: mysql:8.4`: pinned to a version line (LTS). Never `latest`, since a surprise major upgrade can corrupt data or break the app.
- `restart: unless-stopped`: restarts on crash or reboot, but not if you stopped it deliberately.
- `env_file: .env.db`: secrets come from a file that is not committed.
- `tmpfs` for `/tmp` and `/run/mysqld`: ephemeral in-memory mounts for socket and pid files. They never need to persist. `noexec` and `nosuid` forbid running programs or setuid binaries from there.
- `volumes: mysql-data:/var/lib/mysql`: a named volume, so data survives container recreation. The data lives outside the container's writable layer.
- `../schema.sql:/docker-entrypoint-initdb.d/schema.sql:ro`: a bind mount of one file, read-only. The MySQL image runs scripts in that folder only on the first start with an empty data directory. Schema changes are not re-applied later. `docker compose down -v` wipes the volume and re-initialises.
- `healthcheck` with `mysqladmin ping -h 127.0.0.1`: marks the DB healthy only when it accepts connections. `start_period: 30s` allows time for initialisation.
- `deploy.resources.limits`: caps CPU and memory so one service cannot starve the rest. If MySQL gets OOM-killed, raise the memory limit.
- `networks: internal-net`: the DB has no `ports:` entry, so it is unreachable from your laptop's network. Only containers on the same network can connect, using the service name `db` as the hostname (Docker's built-in DNS).

### Service `app`

- `build: context: ..` and `dockerfile: docker/Dockerfile`: the compose file lives in `app/docker/`, so the build context is the parent folder. Paths in the Dockerfile are relative to the context.
- `image: twitter-clone-app:local`: names the built image. The same image is what gets tagged and pushed to ECR later.
- `init: true`: runs a tiny init process (tini) as PID 1. It forwards signals and reaps zombie processes. Node as PID 1 does not get default signal handling from the kernel, so without an init `docker stop` waits 10s and then kills it.
- `read_only: true`: the container's root filesystem is immutable. A bug or attacker cannot write files. Anything that must be written goes in explicit `tmpfs`.
- `cap_drop: [ALL]`: removes every Linux capability. A Node web app needs none, because port 1234 is above 1024.
- `security_opt: no-new-privileges:true`: blocks privilege escalation via setuid binaries.
- `tmpfs` with `rw,noexec,nosuid,size=...,uid=1000,gid=1000`: writable in-memory folders. `noexec` means nothing written there can be executed, which blocks the classic "download and run a payload" attack. `size` limits memory use. `uid/gid` match the `node` user so it can write.
- `env_file: .env`: app configuration from an uncommitted file. On AWS this comes from Secrets Manager or SSM.
- `expose: "1234"`: opens the port to other containers on the network only. It is different from `ports`, which publishes to the host.
- `depends_on: db: condition: service_healthy`: waits until the DB healthcheck passes, not merely until the container has started.
- `deploy.resources.limits`: 0.5 CPU and 384 MB, to be tuned.

### Why the replica count is 1 right now

- With 3 replicas, nginx round-robins requests. The captcha is stored in the session of whichever instance generated it, and the check lands on a different one, so it fails.
- This is a real finding: the app keeps state in process memory, so it cannot scale horizontally yet. Removing replicas hides the problem, it does not fix it. The fix (stateless captcha) is planned before the ASG goes beyond one instance.

### Service `nginx`

- `build` with `dockerfile: nginx/Docker/Dockerfile`: config, error pages and static files are baked in, so there are no bind mounts from the repo. An EC2 instance has no repo checkout.
- `ports: "8080:8080"`: host port 8080 maps to container port 8080.
- `tmpfs: /tmp`: the unprivileged nginx image writes its pid file and temp files there. With `read_only: true`, it needs this.
- `depends_on: app: service_healthy`: nginx resolves the upstream name `app` at startup, so the app must exist and be healthy first.

### Top-level `networks` and `volumes`

- `internal-net` (bridge driver): a private virtual network with name-based DNS between containers.
- `mysql-data`: declares the named volume used by `db`.

---

## 3. nginx/conf.d/default.conf

Analogy: nginx here is a receptionist. It greets every visitor, turns away abusers, hands out static brochures itself, and only forwards real questions to the specialist (the app).

This file is included inside nginx's `http {}` block, which is why `limit_req_zone`, `map` and `upstream` can sit at the top.

### `limit_req_zone $binary_remote_addr zone=global_limit:10m rate=15r/s;`

- Defines a rate-limit bucket. It does not enforce anything by itself. A `limit_req` directive does.
- `$binary_remote_addr`: the client IP in compact binary form (4 bytes for IPv4), so more clients fit in memory than with the text form.
- `zone=global_limit:10m`: a named shared-memory zone of 10 MB. nginx's docs say 1 MB holds about 16,000 states, so roughly 160,000 IPs.
- `rate=15r/s`: 15 requests per second per client IP (leaky-bucket algorithm).

### `set_real_ip_from`, `real_ip_header X-Forwarded-For`, `real_ip_recursive on`

- Behind an ALB, the TCP connection to nginx comes from the ALB, not from the visitor. Without this, `$remote_addr` is the ALB's IP, so every visitor shares one rate-limit bucket and the whole site gets 429s.
- `set_real_ip_from`: only trust the forwarded header when the connection comes from these ranges (private networks: the VPC or Docker). Trusting it from anyone would let attackers spoof their IP.
- `real_ip_header X-Forwarded-For`: read the client IP from that header.
- `real_ip_recursive on`: walk the header from the right, skip trusted addresses, and take the first untrusted one. This resists a client putting a fake IP at the start of the header.
- It is only safe if the EC2 security group lets just the ALB reach port 8080.

### `map $http_x_forwarded_proto $forwarded_proto { ... }`

- Creates a variable. `$http_x_forwarded_proto` is the incoming `X-Forwarded-Proto` header from the ALB (`https`).
- `default $http_x_forwarded_proto`: pass it through. `"" $scheme`: if the header is missing (local dev), use nginx's own scheme.
- Why: nginx's `$scheme` is always `http` behind an ALB. If the app were told `http`, secure cookies and redirects would break.

### `upstream backend_app { server app:1234; keepalive 32; }`

- Names a backend pool. `app:1234` is resolved through Docker's DNS when nginx starts.
- `keepalive 32`: keeps up to 32 idle connections to the backend open per worker, avoiding a new TCP handshake on every request.
- Keepalive only works together with `proxy_http_version 1.1` and `proxy_set_header Connection ""`, set below.
- There is deliberately no `ip_hash`. Sticky routing by IP hid the shared-state problem and, behind an ALB, would route everything to one backend.
- Known caveat: nginx resolves the name once at startup. If the app container is recreated with a new IP, nginx must be restarted.

### `server { listen 8080; ... }`

- `listen 8080`: the unprivileged nginx cannot bind ports below 1024.
- `server_name _`: a catch-all placeholder name. The underscore has no special meaning, it simply never matches a real hostname.
- `server_tokens off`: hides the nginx version in headers and error pages.
- `client_max_body_size 10m`: larger request bodies get a 413. Align this with the multer upload limit.
- `keepalive_timeout 75s`: must be longer than the ALB's idle timeout (60s default). If nginx closes idle connections first, the ALB occasionally sends a request down a dead connection and returns a 502.

### Security headers (`add_header ... always`)

- `Strict-Transport-Security max-age=300`: tells browsers to use HTTPS only. Short value now, because a mistake is cached by browsers for that long. Raise it after verifying HTTPS works everywhere. `includeSubDomains` was dropped deliberately, since it forces HTTPS on all subdomains.
- `X-Frame-Options SAMEORIGIN`: stops other sites from embedding your pages in an iframe (clickjacking).
- `X-Content-Type-Options nosniff`: the browser must trust the declared content type. It prevents an uploaded file from being interpreted as a script.
- `Referrer-Policy strict-origin-when-cross-origin`: limits what URL data leaks to other sites.
- `always`: send the header on error responses too, not only 2xx/3xx.

### gzip block

- `gzip on` plus `gzip_types`: compresses text responses. HTML is always compressed once gzip is on, so it is not listed.
- `gzip_comp_level 5`: a middle trade-off between CPU and size.
- `gzip_min_length 256`: tiny responses are not worth compressing.
- `gzip_vary on`: adds `Vary: Accept-Encoding` so caches do not serve compressed content to clients that cannot read it.
- The ALB does not compress responses, so nginx does.

### Proxy defaults at server level

- `proxy_http_version 1.1`: nginx defaults to HTTP/1.0 towards backends, which has no keepalive.
- `proxy_set_header Connection ""`: clears the header so connections can be reused. The previous config sent `Connection: upgrade` on every request, which defeated `keepalive 32`. WebSocket upgrade headers were removed because this app does not use WebSockets.
- `Host $host`: passes the original hostname to the app.
- `X-Real-IP $remote_addr` and `X-Forwarded-For $remote_addr`: after the real-IP module, `$remote_addr` is the verified client IP. A single clean value matches `trust proxy 1` in Express (exactly one proxy hop).
- `X-Forwarded-Proto $forwarded_proto`: the scheme from the map above.
- `proxy_connect_timeout 5s`: fail fast if the backend is down, so the user sees the 502 page quickly.
- These `proxy_set_header` lines are inherited by any location that does not define its own `proxy_set_header`.

### Error handling

- `limit_req_status 429`: the default for rate limiting is 503, which looks like an outage. 429 says "Too Many Requests".
- `error_page 502 503 504 /50x.html;` and similar: serve custom pages.
- `location = /50x.html { root ...; internal; }`: `=` is an exact match. `internal` means clients cannot request that URL directly, only nginx can serve it for an error.

### `location = /health`

- The ALB health check endpoint. Proxied to the app, not rate limited, not logged.
- It is a shallow check on purpose. If it also checked the database, a DB hiccup would fail every instance at once and the ASG would replace the whole fleet.

### `location ~ ^/(css|js|assets)/`

- `~` is a regular-expression match for static assets.
- nginx serves them straight from `/var/www/public`, outside the rate limit, so a page load that fetches many files does not burn the burst allowance.
- `try_files $uri =404`: serve the file if it exists, otherwise 404 without bothering the backend.
- `expires 1h`: sets caching headers. It is used instead of `add_header Cache-Control` on purpose. nginx rule: if a location defines any `add_header`, it drops all `add_header` lines inherited from the server block, which would silently remove your security headers.
- One hour because filenames are not versioned. Longer caching would serve stale CSS after a deploy.
- `access_log off`: static files would flood the logs.

### `location /`

- The catch-all, forwarded to the app.
- `limit_req zone=global_limit burst=30 nodelay`: apply the rate limit. `burst=30` lets up to 30 extra requests through above the 15 r/s rate. `nodelay` serves that burst immediately instead of spacing it out. Beyond it, requests get 429.
- Matching order, a classic interview question: exact (`=`) first, then the longest prefix, then regexes in file order override prefixes, and `/` is the weakest match.

---

## 4. nginx/Docker/Dockerfile

- `FROM nginxinc/nginx-unprivileged:1.27-alpine`: official nginx image variant that runs as a non-root user (UID 101) on port 8080. Required for `cap_drop: ALL` and `read_only`. Stock nginx needs root and capabilities to bind port 80 and chown directories.
- The tag is old. Pin the current stable version (ideally by digest) before using this for real.
- `COPY nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf`: bakes the config into the image. The same image runs identically on any instance.
- `COPY nginx/errors /var/www/errors` and `COPY public /var/www/public`: custom error pages and static assets.
- `EXPOSE 8080`: documentation only.

---

## 5. .dockerignore

- Lists what never gets sent to the Docker daemon as build context: `node_modules`, `dist`, `uploads`, `.git`, `.env*`, logs.
- Benefits: faster builds, smaller context, and secrets in `.env` files never enter the build.
- `!.env.example` re-includes the safe template.
- Especially relevant when the project is on a Windows drive under WSL, where large contexts are slow to transfer.

---

## 6. Likely interview questions, with honest answers

**Why not run certbot in the container on AWS?**
Instances are disposable and sit in private subnets. Certbot needs port 80 reachable from the internet, and every new instance would request its own certificate and hit rate limits. ACM on the ALB is free and renews itself.

**Why did you remove replicas locally?**
The app stores captcha state in per-process session memory, so requests spread across instances failed. It showed the app is not yet stateless. The planned fix is a signed, short-lived token instead of server-side session state.

**Why is your root filesystem read-only?**
Limits what a compromised process can do. Writable paths are explicit, small, `noexec` tmpfs mounts.

**Why a shallow health check?**
A deep check ties fleet health to the database. A DB blip would make the ASG replace every healthy instance at the same time.

**Why `init: true`?**
PID 1 in a container does not get default signal handling. An init process forwards signals and reaps zombies, so shutdown is clean.

**What would you improve?**

- Pin image digests.
- Make captchas stateless.
- Move uploads to S3.
- Move secrets to Secrets Manager.
- Add per-route rate limits on login and OTP endpoints.
- Version static asset filenames so they can be cached for longer.

## 7. Do not claim in an interview

- That the app is horizontally scalable, until captchas are stateless and uploads are in S3.
- That `compose.yml` is deployed to AWS. It is the local dev environment only.
- That the HSTS and cache settings are final. They are conservative starting values.