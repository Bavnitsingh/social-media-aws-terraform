import express, { Request, Response } from "express";
import path from "node:path";
import os from "node:os";
import mainroute from "./routes/main.route.js";
import cookieParser from "cookie-parser";
import passport from "passport";
import configurePassport from "./middlewares/passport.middleware.js";

const app = express();
const port = Number(process.env.PORT) || 1234;

// Debug aid for load-balancing tests. Off by default: exposing the container id
// to clients is information disclosure, so it must not be on in production.
const SHOW_SERVED_BY = process.env.SHOW_SERVED_BY === "true";
const instanceId = os.hostname(); // inside Docker this is the container id

app.disable("x-powered-by");

// Exactly one proxy (nginx) sits in front of the app and sets X-Forwarded-* itself.
app.set("trust proxy", 1);

// Shallow liveness check for the ALB and Docker. It must not touch the database:
// a DB blip would mark every instance unhealthy at once and the ASG would replace them all.
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).send("ok");
});

app.use(express.static("public"));
app.use("/uploads", express.static(path.join("uploads"))); // goes away when uploads move to S3

if (SHOW_SERVED_BY) {
  app.use((req: Request, res: Response, next) => {
    const start = Date.now();
    res.setHeader("X-Served-By", instanceId);
    res.on("finish", () => {
      // Log only the first path segment: paths like /reset/<token> contain secrets.
      const route = "/" + (req.path.split("/")[1] ?? "");
      console.log(
        `[${instanceId}] ${req.method} ${route} -> ${res.statusCode} (${Date.now() - start}ms)`,
      );
    });
    next();
  });
}

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// No server-side session: auth is a JWT, the captcha is a signed token.
// The app keeps no per-user state in memory, so any instance can serve any request.

app.set("view engine", "ejs");
app.set("views", path.join(import.meta.dirname, "views"));
app.use(passport.initialize());
configurePassport(passport);
app.use("/", mainroute);

const server = app.listen(port, () => {
  console.log(`App is listening on port ${port}`);
});

// Graceful shutdown: docker stop / ASG instance refresh send SIGTERM.
// Node >= 19 closes idle keep-alive connections on close(); the timer is a hard stop.
const shutdown = (signal: string) => {
  console.log(`${signal} received, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 8000).unref();
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
