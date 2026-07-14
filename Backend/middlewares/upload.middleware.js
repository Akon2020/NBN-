import multer from "multer";
import fs from "fs";
import path from "path";

const dossierMap = {
  avatar: "uploads/avatars",
  image: "uploads/images",
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
// de la limite globale body-parser (1024mb) qui n'est là que pour les gros payloads JSON.
const MIME_AUTORISES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const TAILLE_MAX_OCTETS = 5 * 1024 * 1024; // 5 Mo par fichier

const fileFilter = (_, file, cb) => {
  if (!MIME_AUTORISES.includes(file.mimetype)) {
    return cb(
      new multer.MulterError(
        "LIMIT_UNEXPECTED_FILE",
        `Type de fichier non autorisé : ${file.mimetype}. Formats acceptés : ${MIME_AUTORISES.join(", ")}`
      )
    );
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: TAILLE_MAX_OCTETS },
});

export default upload;