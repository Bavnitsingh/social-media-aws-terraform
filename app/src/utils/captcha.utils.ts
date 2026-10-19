import crypto from "node:crypto";
import { Request } from "express";
import { CAPTCHA_SECRET, CAPTCHA_TTL_MS } from "../config/config.env.js";

// Stateless captcha: nothing is stored on the server.
// Token = "<expiresAtMs>.<nonce>.<mac>" where
//   mac = HMAC-SHA256(secret, "<expiresAtMs>.<nonce>.<lowercased answer>")
// The mac depends on the answer, but without the secret nobody can compute it,
// so the token does not reveal the answer and guesses can only be tested online.
// Any instance holding the same CAPTCHA_SECRET can verify a token from any other.

const MAX_TOKEN_LENGTH = 200;
const MAX_ANSWER_LENGTH = 16;

function sign(expiresAt: string, nonce: string, answer: string): Buffer {
  return crypto
    .createHmac("sha256", CAPTCHA_SECRET)
    .update(`${expiresAt}.${nonce}.${answer}`)
    .digest();
}

export function createCaptchaToken(text: string): string {
  const expiresAt = String(Date.now() + CAPTCHA_TTL_MS);
  const nonce = crypto.randomBytes(16).toString("base64url");
  const mac = sign(expiresAt, nonce, text.toLowerCase()).toString("base64url");
  return `${expiresAt}.${nonce}.${mac}`;
}

// Same call signature as before: controllers keep calling verifyCaptcha(req).
export default function verifyCaptcha(req: Request): boolean {
  const { captchaId, captchaAns } = (req.body ?? {}) as {
    captchaId?: unknown;
    captchaAns?: unknown;
  };

  if (typeof captchaId !== "string" || typeof captchaAns !== "string")
    return false;
  if (
    captchaId.length > MAX_TOKEN_LENGTH ||
    captchaAns.length > MAX_ANSWER_LENGTH
  )
    return false;

  const parts = captchaId.split(".");
  if (parts.length !== 3) return false;
  const [expiresAt, nonce, mac] = parts;
  if (!expiresAt || !nonce || !mac) return false;

  const expiry = Number(expiresAt);
  if (!Number.isFinite(expiry) || Date.now() > expiry) return false;

  const provided = Buffer.from(mac, "base64url");
  const expected = sign(expiresAt, nonce, captchaAns.trim().toLowerCase());

  // timingSafeEqual throws on different lengths, so check first.
  return (
    provided.length === expected.length &&
    crypto.timingSafeEqual(provided, expected)
  );
}
