import multer from "multer";
import { ALLOWED_MIME, UploadError } from "../utils/uploads.js";

// Files are held in memory (max 5 MB each) and then saved by storeUploads.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 2 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) cb(null, true);
    else cb(new UploadError("Only JPEG, PNG, GIF or WebP images are allowed"));
  },
});

export default upload;
