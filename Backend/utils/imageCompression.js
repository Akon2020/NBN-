import sharp from "sharp";
import path from "path";

// GOAL 2 — compression pertinente uniquement : redimensionne les images
// trop larges (jamais utile au-delà de la largeur d'affichage réelle,
// CLAUDE.md — "images optimisées à chaque étape") et recompresse
// jpeg/png/webp à une qualité raisonnable. Le GIF est laissé tel quel :
// sharp n'en garde que la première frame, ce qui casserait une éventuelle
// animation pour un gain de taille marginal sur une simple photo.
const MAX_WIDTH = 1920;
const QUALITY = 80;

export const compressImageInPlace = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".gif") return;

  try {
    const image = sharp(filePath);
    const metadata = await image.metadata();

    let pipeline = image;
    if (metadata.width && metadata.width > MAX_WIDTH) {
      pipeline = pipeline.resize({ width: MAX_WIDTH });
    }

    if (ext === ".jpg" || ext === ".jpeg") {
      pipeline = pipeline.jpeg({ quality: QUALITY });
    } else if (ext === ".png") {
      pipeline = pipeline.png({ quality: QUALITY });
    } else if (ext === ".webp") {
      pipeline = pipeline.webp({ quality: QUALITY });
    }

    const buffer = await pipeline.toBuffer();
    const fs = await import("fs/promises");
    await fs.writeFile(filePath, buffer);
  } catch (error) {
    // Une image déjà valide (acceptée par le fileFilter multer) qui échoue
    // à la compression ne doit jamais bloquer l'upload — le fichier original
    // reste utilisable tel quel.
    console.error(`Compression d'image ignorée pour ${filePath} :`, error.message);
  }
};
