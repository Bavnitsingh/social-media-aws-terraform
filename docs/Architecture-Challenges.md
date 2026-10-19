# Architecture Challenges: Twitter Clone (Horizontal Scaling)

**Setup:** Node/Express + MySQL behind nginx, Docker Compose, 3 app replicas.
nginx distributes requests across replicas with **round-robin**.
**Goal:** an app tier where any instance can serve any request.

---

## Challenge 1: Captcha state (stateful → stateless)

### Symptom

Login and signup randomly failed with "incorrect captcha", even when the answer was typed correctly.

### Root cause

- The captcha answer was stored in `express-session`, which is **in-memory and per process**.
- nginx round-robins every request, so `GET /captcha` hit replica A (stored the answer) and `POST /login` hit replica B (no record of it).
- Health checks were not the cause. They only decide whether a replica is eligible for traffic. Distribution itself is round-robin.

### Options considered

| Option | Verdict |
| --- | --- |
| Sticky sessions (`ip_hash` / ALB cookie) | Hides the problem. Breaks on scale-in or instance replacement. Behind an ALB, `ip_hash` routes everything to one backend. |
| Redis as shared session store | Works and allows single-use captchas. Adds a service, cost, and a new failure mode for a value that lives ~2 minutes. |
| MySQL session store | Works, but adds DB load and a table for throwaway data. |
| **Stateless signed token** | **Chosen.** No new infrastructure. |

### Decision: stateless HMAC-signed token

- `GET /captcha` returns `{ id, svg }`. `id` is now a token: `expiresAt.nonce.mac`.
- `mac = HMAC-SHA256(secret, expiresAt.nonce.answer)`, with the answer lowercased.
- Verification: parse the token, check expiry, recompute the HMAC from the submitted answer, compare with `timingSafeEqual`.
- All instances share `CAPTCHA_SECRET` through an environment variable, so any instance can verify any token.
- `Cache-Control: no-store` on `/captcha`, so a cache never serves one captcha to many users.
- Removed `express-session` entirely, which also removed the in-memory session store leak.
- No frontend change: the response field is still called `id`.

### Why the design holds up

- **Keyed HMAC, not a plain hash:** the answer cannot be brute-forced offline. Guesses have to go through the endpoint.
- **Expiry inside the signed data:** a client cannot extend its own token.
- **Constant-time comparison:** no timing leak.

### Trade-offs and status

- A solved token can be **replayed until it expires** (default 120s, set by `CAPTCHA_TTL_SECONDS`).
- **Planned, not done yet:** stricter nginx rate limit on login, signup, forgot-password and OTP routes.
- If single-use captchas become a requirement, move to Redis with an atomic get-and-delete.

### How I verified it

- Ran 3 replicas and enabled an `X-Served-By` header plus per-request logs (debug mode, off by default).
- One login flow was served by different containers, and login still succeeded.

### Lesson

Stateless does not mean "no state". The app process keeps no per-user memory. State lives in the client (signed tokens, JWT) and in shared stores (MySQL).

---

## Challenge 2: Uploads across replicas (tmpfs → shared named volume)

### Symptom

- A profile photo appeared once after upload, then vanished on reload.
- After rebuilding the containers, all uploaded images were gone.

### Root cause

Multer wrote to `/app/uploads`, which was a **per-container tmpfs** (in memory).

1. **Per replica:** the file existed on only one replica. A request for `/uploads/photo.png` went to a random replica, so about 2 in 3 requests missed the file. A missing file falls through to the catch-all route and redirects to `/login`, so the image just looked broken.
2. **Ephemeral:** a tmpfs is destroyed whenever the container is recreated or restarted, while the database still held the old paths.

### Side effect worth remembering

`docker compose down -v` also deletes named volumes. It wiped MySQL, and the browser still held a valid JWT for a user that no longer existed, so profile updates silently failed. Fix: log out or clear cookies and sign up again.

### Fix (local)

- Replaced the tmpfs with a **named volume (`uploads-data`) mounted at `/app/uploads` in every replica**.
- All replicas see the same files, and files survive rebuilds.

### Limitation

A shared local volume only works on a **single Docker host**. It does not work across separate servers. Multi-server storage is a future decision.

### Debugging commands

- `docker compose exec --index N app ls -la /app/uploads` shows which replica actually holds the file.
- Use `docker compose down` without `v` unless a full reset is intended. If the DB is reset, reset the uploads volume too, otherwise the DB points at missing files.

### Lesson

Anything written to a container's filesystem or tmpfs is **per replica and ephemeral**. Treat containers as disposable, and keep durable data in a store that outlives and is shared by all of them.

---

## Open items (honest status)

- Stricter rate limiting on auth routes.
- Multer saves files under `file.originalname`, so two users uploading the same filename overwrite each other. There is also no size limit or file-type filter.
- Shared volume is a single-host solution only.

## Interview summary (30 seconds)

1. **Captcha:** "The captcha lived in per-process session memory, so with 3 replicas it failed at random. I weighed sticky sessions, Redis, and a signed token, and chose a stateless HMAC token. It needed no new infrastructure, and I verified it by watching one login flow served by different containers."
2. **Uploads:** "Uploads went to per-container tmpfs, so photos only existed on one replica and vanished on restart. I moved them to a named volume shared by all replicas, and I know that only works on a single host."