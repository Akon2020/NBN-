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
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
// Vidéos de téléphone comprises : .mov (iPhone), .m4v, .3gp (Android).
const MIME_VIDEOS = ["video/mp4", "video/quicktime", "video/webm", "video/x-m4v", "video/3gpp", "video/3gpp2"];
const VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm", ".m4v", ".3gp"];
// Certains navigateurs (Windows notamment) n'annoncent aucun type précis pour
// une vidéo .mov : l'extension fait alors foi.
const GENERIC_MIMES = ["application/octet-stream", ""];

export const MAX_IMAGE_MB = Number(MAX_IMAGE_SIZE_MB || 5);
export const MAX_VIDEO_MB = Number(MAX_VIDEO_SIZE_MB || 50);

const buildFileFilter = (mimes, extensions, label) => (_, file, cb) => {
  const extension = path.extname(file.originalname || "").toLowerCase();
  const accepted =
    mimes.includes(file.mimetype) || (GENERIC_MIMES.includes(file.mimetype || "") && extensions.includes(extension));
  if (!accepted) {
    // Le second argument de MulterError est le nom du champ, pas le message :
    // le passer en message affichait « Unexpected field » pour tout refus.
    const error = new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname);
    error.code = "INVALID_FILE_TYPE";
    error.message = `Format de ${label} non accepté : ${file.originalname}. Formats acceptés : ${extensions.join(", ")}.`;
    return cb(error);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter: buildFileFilter(MIME_IMAGES, IMAGE_EXTENSIONS, "image"),
  limits: { fileSize: MAX_IMAGE_MB * 1024 * 1024 },
});

export const uploadVideo = multer({
  storage,
  fileFilter: buildFileFilter(MIME_VIDEOS, VIDEO_EXTENSIONS, "vidéo"),
  limits: { fileSize: MAX_VIDEO_MB * 1024 * 1024 },
});

export default upload;
