# Micro-Blogging Social Media App: Dockerised app, deployed on AWS with Terraform

A Twitter-style Micro-blogging social media app (Node.js / TypeScript / Express), packaged for horizontal scaling and deployed on AWS with Terraform.

> **Status: infrastructure complete, CI/CD in progress.** The app, its local multi-replica setup and the full AWS infrastructure are done. The last remaining piece is the GitHub Actions pipeline, which **will be updated soon**. Anything marked *planned* does not exist yet (see [CI/CD pipeline](#cicd-pipeline-planned) and [Roadmap](#roadmap)).





![twitter-clone-screenshots](images/register.png) 

![twitter-clone-screenshots](images/login.png) 

![twitter-clone-screenshots](images/home.png) 

![twitter-clone-screenshots](images/your-profile.png)

![twitter-clone-home](images/edit-profile.png)

![twitter-clone-screenshots](images/following.png) 

## What the app does

- Sign up and log in with a captcha, JWT cookie authentication (Passport)
- OTP verification, forgot / reset password, change password
- Tweets with media, likes, comments, retweets
- Follow / unfollow, people recommendations, search
- Profile and cover pictures

**Stack:** Node.js 24, TypeScript, Express, EJS views, MySQL 8.4, nginx, Docker Compose, Terraform, AWS.

## Architecture

### Local

```mermaid
flowchart LR
  B[Browser] -->|http://localhost:8080| N[nginx]
  N --> A1[app replica 1]
  N --> A2[app replica 2]
  N --> A3[app replica 3]
  A1 & A2 & A3 --> DB[(MySQL)]
  A1 & A2 & A3 --> V[(uploads volume)]
```

nginx distributes requests round-robin across three identical app containers, so the app has to be stateless to work. That is deliberate: it is the local rehearsal for an Auto Scaling Group.

### On AWS

```mermaid
flowchart LR
  U[User] --> R53[Route 53] --> ALB[ALB + ACM certificate]
  ALB --> ASG[Auto Scaling Group<br/>private subnets, 2 AZs]
  ASG --> RDS[(RDS MySQL<br/>private subnets)]
  ASG --> S3[(S3 uploads)]
  ECR[(ECR images)] -.->|image pull| ASG
```

Services: VPC (public, private-app and private-db subnets across 2 AZs), ALB, EC2 Auto Scaling Group, RDS MySQL, ECR, S3 for uploads, Route 53, ACM, IAM roles with least privilege, Secrets Manager / SSM, CloudWatch and SNS alarms, remote Terraform state.

The infrastructure is meant to be built, demonstrated, and destroyed with `terraform destroy` to keep cost down.

## CI/CD pipeline (planned)

> **Planned, not implemented yet.** The GitHub Actions workflows will be added soon. This is the intended flow.

```mermaid
flowchart LR
  DEV[Developer] -->|git push or pull request| GH[GitHub]
  GH -->|triggers| CI

  subgraph CI ["CI: every push and PR"]
    direction TB
    S1[Checkout code] --> S2[Install dependencies and type-check]
    S2 --> S3[Build Docker image]
  end

  CI -->|merge to main| CD

  subgraph CD ["CD: main branch only"]
    direction TB
    D1[Assume AWS role via OIDC] --> D2[Tag image with commit SHA]
    D2 --> D3[Push image to ECR]
    D3 --> D4[Roll out to Auto Scaling Group<br/>using instance refresh]
  end

  CD --> HC[ALB health checks on /health]
  HC -->|healthy| LIVE[New version live]
  HC -->|unhealthy| RB[Rollout stops, old instances keep serving]
```

- **CI** runs on every push and pull request, so broken code is caught before it reaches `main`.
- **CD** runs only after a merge to `main`. GitHub authenticates to AWS with a short-lived OIDC role, so no long-lived AWS keys are stored in GitHub.
- **Images** are tagged with the commit SHA, so every deployed version can be traced and rolled back.
- **Rollout** replaces instances gradually, and the ALB only sends traffic to instances that pass the `/health` check.

## Run it locally

**Requirements:** Docker with Compose v2.

```bash
cd app/docker
cp .env.example .env
cp .env.db.example .env.db
# edit both files: set secrets, and keep DB_NAME / DB_USER / DB_PASSWORD
# in .env identical to MYSQL_DATABASE / MYSQL_USER / MYSQL_PASSWORD in .env.db

docker compose up --build -d
docker compose ps          # expect 1 db, 1 nginx, 3 app, all healthy
```

Open **http://localhost:8080**.

The app container runs with `NODE_ENV=production`, so it **refuses to start** if a required secret is missing and tells you which one.

| Variable | Purpose |
|---|---|
| `JWT_SECRET` | signs login tokens |
| `OTP_SECRET` | OTP generation (must be base32) |
| `CAPTCHA_SECRET` | signs captcha tokens |
| `DB_HOST` (`db`), `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | MySQL connection |
| `SITE_URL` | public URL, used to build links such as password reset |
| `CAPTCHA_TTL_SECONDS` | optional, captcha lifetime (default 120) |
| `SHOW_SERVED_BY` | optional, `true` adds an `X-Served-By` header and request logs for load-balancing demos. Never enable in production. |

Generate secrets with `openssl rand -base64 48`. For `OTP_SECRET`: `head -c 20 /dev/urandom | base32`.

**Stop it:** `docker compose down`. Avoid `-v` unless you want a full reset: it deletes the database and the uploads volume together.

### See requests spread across replicas

Set `SHOW_SERVED_BY=true` in `.env`, rebuild, then:

```bash
docker compose logs -f app
for i in $(seq 1 9); do curl -sI http://localhost:8080/login | grep -i x-served-by; done
```

## Repository layout

```
.
├── app/
│   ├── docker/          Dockerfile, compose.yml, env examples
│   ├── nginx/           nginx image: config, error pages
│   ├── src/             TypeScript source
│   ├── public/          static assets
│   └── schema.sql
├── terraform/           AWS infrastructure (remote state, VPC, RDS, ECR, ALB, ASG, ...)
├── .github/workflows/   GitHub Actions pipeline (planned)
├── docs/                design notes
└── README.md
```

## Design decisions

- **Stateless app tier.** Auth is a JWT cookie and the captcha is an HMAC-signed token, so any replica can serve any request. No server-side sessions.
- **Multi-stage image, non-root.** Build tools never reach the runtime image. The container runs as a non-root user.
- **Hardened containers.** Read-only root filesystem, all Linux capabilities dropped, `no-new-privileges`, resource limits.
- **TLS terminates at the load balancer** (ALB + ACM), so nginx and the app speak plain HTTP and no certificates live on instances.
- **nginx reverse proxy.** Real client IP recovery from `X-Forwarded-For`, per-IP rate limiting, static assets served outside the limit, custom error pages.
- **Shallow `/health` endpoint** that does not touch the database, so a database blip cannot make a load balancer mark every instance unhealthy.
- **Infrastructure as code.** The whole environment is defined in Terraform with remote state, so it can be created and destroyed on demand.
- **No secrets in the repo.** Only `.example` env files are committed.

More detail:
- [Challenges I hit while scaling horizontally](docs/Architecture-Challenges.md)
- [Every Dockerfile, compose and nginx directive explained](docs/Docker-Nginx.md)

## Roadmap

- [x] App containerised (multi-stage image) with nginx reverse proxy
- [x] Local multi-replica test rig (3 app replicas behind nginx)
- [x] Stateless captcha, so login works across replicas
- [x] Shared uploads volume (local only, single host)
- [x] Phase 0: AWS account safety, budget alert, non-root access, tooling
- [x] Phase 1: Terraform remote state
- [x] Phase 2: VPC, subnets, gateways, routing
- [x] Phase 3: security groups and IAM
- [x] Phase 4: RDS and secrets
- [x] Phase 5: ECR and remaining app changes
- [x] Phase 6: launch template, ALB, Auto Scaling Group
- [x] Phase 7: Route 53 and ACM (HTTPS on my own domain)
- [x] Phase 8: CloudWatch alarms and SNS
- [ ] Phase 9: CI/CD with GitHub Actions (in progress, will be updated soon)

