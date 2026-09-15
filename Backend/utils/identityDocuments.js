import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { IDENTITY_DOCUMENTS_DIR } from "../config/env.js";

// Pièces d'identité : jamais sous `uploads/` (servi statiquement par
// app.js, donc public à qui devine le nom). Le dossier est privé et le
// fichier ne sort que par une route authentifiée, soumise à permission.
const RELATIVE_DIR = IDENTITY_DOCUMENTS_DIR || "private/identity-documents";
const BASE_DIR = path.resolve(process.cwd(), RELATIVE_DIR);

export const ACCEPTED_ID_DOCUMENT_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

// Chemin absolu d'un document stocké, en refusant tout chemin qui sortirait
// du dossier privé (la valeur vient de la base, mais on ne lui fait pas
// aveuglément confiance pour lire un fichier du disque).
export const resolveIdentityDocument = (storedPath) => {
  const absolute = path.resolve(process.cwd(), storedPath);
  return absolute.startsWith(BASE_DIR + path.sep) ? absolute : null;
};

/**
 * Enregistre une pièce d'identité reçue en mémoire (multer).
 * - Image : orientation corrigée, réduite à 2000 px, réencodée en JPEG —
 *   lisible à l'écran, légère sur réseau faible, et débarrassée des
 *   métadonnées EXIF (position GPS du téléphone comprise).
 * - PDF : conservé tel quel après contrôle de sa signature.
 * Lève une erreur si le contenu ne correspond pas au type annoncé.
 */
export const storeIdentityDocument = async (file) => {
  await fs.mkdir(BASE_DIR, { recursive: true });

  let buffer;
  let extension;
  let mimeType;
  if (file.mimetype === "application/pdf") {
    if (file.buffer.subarray(0, 5).toString("latin1") !== "%PDF-") {
      throw new Error("Le fichier annoncé comme PDF n'en est pas un.");
    }
    buffer = file.buffer;
    extension = "pdf";
    mimeType = "application/pdf";
  } else {
    buffer = await sharp(file.buffer)
      .rotate()
      .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
    extension = "jpg";
    mimeType = "image/jpeg";
  }

  const fileName = `${randomUUID()}.${extension}`;
  await fs.writeFile(path.join(BASE_DIR, fileName), buffer);

  return {
    idDocumentPath: path.posix.join(RELATIVE_DIR.split(path.sep).join("/"), fileName),
    idDocumentMimeType: mimeType,
    idDocumentUploadedAt: new Date(),
  };
};

// Suppression silencieuse : un fichier déjà absent n'est pas une erreur.
export const deleteIdentityDocument = async (storedPath) => {
  const absolute = storedPath ? resolveIdentityDocument(storedPath) : null;
  if (!absolute) return;
  await fs.rm(absolute, { force: true });
};
