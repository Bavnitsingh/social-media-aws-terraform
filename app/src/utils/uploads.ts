import { RequestHandler } from "express";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { AWS_REGION, UPLOADS_BUCKET } from "../config/config.env.js";

// Allowed types and the extension we store them with. The extension comes from the
// MIME type, never from the client's file name.
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};
export const ALLOWED_MIME = Object.keys(EXT_BY_MIME);

export class UploadError extends Error {}

const KEY_RE = /^[0-9a-f-]{36}\.(jpg|png|gif|webp)$/;
const LOCAL_DIR = "uploads";

// Credentials come from the instance role (default provider chain). No keys in config.
const s3 = UPLOADS_BUCKET ? new S3Client({ region: AWS_REGION }) : null;

async function saveOne(file: Express.Multer.File): Promise<void> {
  const name = `${randomUUID()}.${EXT_BY_MIME[file.mimetype]}`;

  if (s3) {
    await s3.send(
      new PutObjectCommand({
        Bucket: UPLOADS_BUCKET,
        Key: `uploads/${name}`,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );
  } else {
    await mkdir(LOCAL_DIR, { recursive: true });
    await writeFile(path.join(LOCAL_DIR, name), file.buffer);
  }

  // Same shape the app has always stored in the database ("uploads/<name>"),
  // so controllers and views do not change.
  file.path = `uploads/${name}`;
}

// Runs after multer: saves each received file and sets file.path.
export const storeUploads: RequestHandler = async (req, _res, next) => {
  try {
    const files: Express.Multer.File[] = [];
    if (req.file) files.push(req.file);
    if (Array.isArray(req.files)) {
      files.push(...req.files);
    } else if (req.files) {
      for (const list of Object.values(req.files)) files.push(...list);
    }
    await Promise.all(files.map(saveOne));
    next();
  } catch (err) {
    next(err);
  }
};

// GET /uploads/<name>. In S3 mode it streams the object from the private bucket.
// In local mode it calls next(), and express.static serves the disk folder.
export const serveUploads: RequestHandler = async (req, res, next) => {
  if (!s3) return next();

  const name = req.path.replace(/^\//, "");
  if (!KEY_RE.test(name)) {
    res.sendStatus(404);
    return;
  }

  try {
    const out = await s3.send(
      new GetObjectCommand({ Bucket: UPLOADS_BUCKET, Key: `uploads/${name}` }),
    );
    res.setHeader(
      "Content-Type",
      out.ContentType ?? "application/octet-stream",
    );
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (out.ContentLength !== undefined) {
      res.setHeader("Content-Length", String(out.ContentLength));
    }
    await pipeline(out.Body as Readable, res);
  } catch (err: any) {
    if (res.headersSent) return;
    if (err?.name === "NoSuchKey") {
      res.sendStatus(404);
      return;
    }
    next(err);
  }
};
