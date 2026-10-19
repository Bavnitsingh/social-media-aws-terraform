import { Request, Response } from "express";
import svgCaptcha from "svg-captcha";
import { createCaptchaToken } from "../utils/captcha.utils.js";

export function getCaptcha(_req: Request, res: Response) {
  const captcha = svgCaptcha.create({
    size: 5,
    noise: 1,
    ignoreChars: "0o1il",
    color: true,
    background: "#dbcbcb",
  });

  // Never cache: a cached response would hand the same captcha to many users.
  res.set("Cache-Control", "no-store");

  // "id" keeps its name so the existing frontend (captchaId / captchaAns) is unchanged.
  // It is now a signed token instead of a lookup key.
  res.type("json").send({
    id: createCaptchaToken(captcha.text),
    svg: captcha.data,
  });
}
