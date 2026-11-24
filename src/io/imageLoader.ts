import type { RawImageBuffer } from '../core/types';
import { decodeGifBlob, type DecodedFrame } from './gifDecoder';

export interface LoadedImage {
  name: string;
  buffer: RawImageBuffer;
  frames: DecodedFrame[];
  isAnimated: boolean;
  previewUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  isObjectUrl: boolean;
}

const MAX_WORKING_DIMENSION = 1920;

function computeScaledSize(
  width: number,
  height: number
): { width: number; height: number } {
  const maxSide = Math.max(width, height);
  if (maxSide <= MAX_WORKING_DIMENSION) {
    return { width, height };
  }
  const scale = MAX_WORKING_DIMENSION / maxSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function isGifFile(blob: Blob, fileName: string): boolean {
  return (
    blob.type === 'image/gif' || fileName.toLowerCase().trim().endsWith('.gif')
  );
}

/**
 * Decodifica un File o Blob (incluyendo GIFs animados multi-frame) en LoadedImage.
 */
export async function loadImageFromBlob(
  blob: Blob,
  fileName = 'imagen-subida'
): Promise<LoadedImage> {
  const objectUrl = URL.createObjectURL(blob);

  try {
    if (isGifFile(blob, fileName)) {
      try {
        const decodedGif = await decodeGifBlob(blob);
        if (decodedGif.frames.length > 0) {
          return {
            name: fileName,
            buffer: decodedGif.frames[0].buffer,
            frames: decodedGif.frames,
            isAnimated: decodedGif.frames.length > 1,
            previewUrl: objectUrl,
            naturalWidth: decodedGif.naturalWidth,
            naturalHeight: decodedGif.naturalHeight,
            isObjectUrl: true,
          };
        }
      } catch {
        // Si no es un GIF válido o falla omggif, continúa con decodificación estándar
      }
    }

    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(blob);
      try {
        const naturalWidth = bitmap.width;
        const naturalHeight = bitmap.height;
        if (naturalWidth <= 0 || naturalHeight <= 0) {
          throw new Error('La imagen no tiene dimensiones válidas.');
        }
        const target = computeScaledSize(naturalWidth, naturalHeight);

        const canvas = document.createElement('canvas');
        canvas.width = target.width;
        canvas.height = target.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          throw new Error('No se pudo inicializar el contexto Canvas 2D.');
        }

        ctx.drawImage(bitmap, 0, 0, target.width, target.height);
        const imageData = ctx.getImageData(0, 0, target.width, target.height);
        const buffer: RawImageBuffer = {
          width: target.width,
          height: target.height,
          data: imageData.data,
        };

        return {
          name: fileName,
          buffer,
          frames: [{ buffer, delayMs: 0 }],
          isAnimated: false,
          previewUrl: objectUrl,
          naturalWidth,
          naturalHeight,
          isObjectUrl: true,
        };
      } finally {
        bitmap.close();
      }
    }

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () =>
        reject(new Error('No se pudo decodificar el archivo de imagen.'));
      element.src = objectUrl;
    });

    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    if (naturalWidth <= 0 || naturalHeight <= 0) {
      throw new Error('La imagen no tiene dimensiones válidas.');
    }
    const target = computeScaledSize(naturalWidth, naturalHeight);

    const canvas = document.createElement('canvas');
    canvas.width = target.width;
    canvas.height = target.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('No se pudo inicializar el contexto Canvas 2D.');
    }

    ctx.drawImage(img, 0, 0, target.width, target.height);
    const imageData = ctx.getImageData(0, 0, target.width, target.height);
    const buffer: RawImageBuffer = {
      width: target.width,
      height: target.height,
      data: imageData.data,
    };

    return {
      name: fileName,
      buffer,
      frames: [{ buffer, delayMs: 0 }],
      isAnimated: false,
      previewUrl: objectUrl,
      naturalWidth,
      naturalHeight,
      isObjectUrl: true,
    };
  } catch (err) {
    URL.revokeObjectURL(objectUrl);
    throw err;
  }
}

export function revokeLoadedImage(image: LoadedImage | null): void {
  if (image?.isObjectUrl) {
    URL.revokeObjectURL(image.previewUrl);
  }
}
