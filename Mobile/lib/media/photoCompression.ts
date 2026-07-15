import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { File } from 'expo-file-system';

// CLAUDE.md §8 — compression dès la prise de photo, avant tout stockage
// local (jamais l'image brute de l'appareil, trop lourde pour une
// connexion faible RDC).
const MAX_WIDTH = 1280;
const JPEG_QUALITY = 0.6;

export async function compressAndHashPhoto(
  sourceUri: string
): Promise<{ uri: string; hash: string | null }> {
  const context = ImageManipulator.manipulate(sourceUri);
  context.resize({ width: MAX_WIDTH });
  const imageRef = await context.renderAsync();
  const result = await imageRef.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });

  // Déduplication via hash de fichier (CLAUDE.md §8).
  const file = new File(result.uri);
  return { uri: result.uri, hash: file.md5 };
}

export function deleteLocalPhoto(uri: string) {
  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Le fichier a peut-être déjà été nettoyé par le système (cache) —
    // ne jamais faire échouer la synchronisation pour ça.
  }
}
