import multer from "multer";
import { MAX_ID_DOCUMENT_SIZE_MB } from "../config/env.js";
import { ACCEPTED_ID_DOCUMENT_TYPES } from "../utils/identityDocuments.js";

const MAX_MB = Number(MAX_ID_DOCUMENT_SIZE_MB || 8);

// Mémoire et non disque : le fichier n'est écrit qu'une fois la collecte
// validée, et directement dans le dossier privé (jamais dans `uploads/`).
const identityUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MB * 1024 * 1024, files: 1 },
  fileFilter: (_, file, cb) => {
    if (!ACCEPTED_ID_DOCUMENT_TYPES.includes(file.mimetype)) {
      return cb(new Error("Format non accepté : envoyez une photo (JPEG, PNG, WebP) ou un PDF."));
    }
    cb(null, true);
  },
});

/**
 * La collecte reste un corps JSON. Quand une pièce d'identité est jointe,
 * le formulaire envoie un multipart avec deux parties : `data` (le même
 * JSON, sérialisé) et `pieceIdentite` (le fichier). Les booléens et les
 * nombres gardent ainsi leur type — un multipart « champ par champ » les
 * transformerait tous en chaînes.
 */
export const parseCollectionUpload = (req, res, next) => {
  if (!req.is("multipart/form-data")) return next();

  identityUpload.single("pieceIdentite")(req, res, (error) => {
    if (error) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? `La pièce d'identité dépasse ${MAX_MB} Mo.`
          : error.message || "Fichier refusé.";
      return res.status(400).json({ message });
    }

    try {
      req.body = JSON.parse(req.body?.data ?? "{}");
    } catch {
      return res.status(400).json({ message: "Les données du formulaire sont illisibles." });
    }
    return next();
  });
};
