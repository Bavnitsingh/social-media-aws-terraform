import * as dotenv from "dotenv";

dotenv.config();

const isProd = process.env.NODE_ENV === "production";
const missing: string[] = [];

// Secrets and deployment-specific values: in production the app refuses to start
// without them. A hardcoded fallback in a repo is a published secret.
function required(name: string, devDefault: string): string {
  const value = process.env[name];
  if (value) return value;
  if (isProd) {
    missing.push(name);
    return "";
  }
  return devDefault;
}

function optional(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

// Auth
export const JWT_SECRET: string = required("JWT_SECRET", "dev-only-jwt-secret");
export const OTP_SECRET: string = required("OTP_SECRET", "JBSWY3DPEHPK3PXP");
export const CAPTCHA_SECRET: string = required(
  "CAPTCHA_SECRET",
  "dev-only-captcha-secret",
);
export const CAPTCHA_TTL_MS: number =
  (parseInt(optional("CAPTCHA_TTL_SECONDS", "120"), 10) || 120) * 1000;

// Database
export const DB_HOST: string = required("DB_HOST", "localhost");
export const DB_PASSWORD: string = required("DB_PASSWORD", "Dev@1234");
export const DB_NAME: string = optional("DB_NAME", "twitterClone");
export const DB_USER: string = optional("DB_USER", "root");
export const DB_PORT: number = parseInt(optional("DB_PORT", "3306"), 10);

// Public URL of the site (used to build links such as password reset)
export const SITE_URL: string = required("SITE_URL", "http://localhost:1234");

// Uploads: S3 bucket on AWS. If unset, files go to the local disk (local development only).
export const UPLOADS_BUCKET: string = optional("UPLOADS_BUCKET", "");
export const AWS_REGION: string = optional("AWS_REGION", "ap-south-1");

// Database TLS (path to the RDS CA bundle) and per-instance connection pool size
export const DB_SSL_CA: string = optional("DB_SSL_CA", "");
export const DB_POOL_SIZE: number =
  parseInt(optional("DB_POOL_SIZE", "10"), 10) || 10;

if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables in production: ${missing.join(", ")}`,
  );
}
