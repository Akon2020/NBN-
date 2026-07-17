import multer from "multer";
import fs from "fs";
import path from "path";
import { MAX_IMAGE_SIZE_MB, MAX_VIDEO_SIZE_MB } from "../config/env.js";

const dossierMap = {
  avatar: "uploads/avatars",
  image: "uploads/images",
  video: "uploads/videos",
  autre: "uploads/autres",
};

const storage = multer.diskStorage({
  destination: (_, file, cb) => {
    const dossier = dossierMap[file.fieldname] || "uploads/autres";
    if (!fs.existsSync(dossier)) {
      fs.mkdirSync(dossier, { recursive: true });
    }
    cb(null, dossier);
  },
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

// SEC-G06 : whitelist MIME + limite de taille propre à multer, indépendante
// de la limite globale body-parser (1024mb) qui n'est là que pour les gros
// payloads JSON. GOAL 2 — limites en variables d'environnement (CLAUDE.md
// §13, jamais une constante en dur), la vidéo n'étant jamais recompressée
// côté serveur (coût CPU disproportionné sur un hébergement cPanel
// mono-process) a donc une limite de taille plus stricte que l'image
// (compressée par sharp après réception, cf. property.controller.js).
const MIME_IMAGES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MIME_VIDEOS = ["video/mp4", "video/quicktime", "video/webm"];
const TAILLE_MAX_IMAGE_OCTETS = Number(MAX_IMAGE_SIZE_MB || 5) * 1024 * 1024;
const TAILLE_MAX_VIDEO_OCTETS = Number(MAX_VIDEO_SIZE_MB || 50) * 1024 * 1024;

const buildFileFilter = (mimesAutorises) => (_, file, cb) => {
  if (!mimesAutorises.includes(file.mimetype)) {
    return cb(
      new multer.MulterError(
        "LIMIT_UNEXPECTED_FILE",
        `Type de fichier non autorisé : ${file.mimetype}. Formats acceptés : ${mimesAutorises.join(", ")}`
      )
    );
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter: buildFileFilter(MIME_IMAGES),
  limits: { fileSize: TAILLE_MAX_IMAGE_OCTETS },
});

export const uploadVideo = multer({
  storage,
  fileFilter: buildFileFilter(MIME_VIDEOS),
  limits: { fileSize: TAILLE_MAX_VIDEO_OCTETS },
});

export default upload;
