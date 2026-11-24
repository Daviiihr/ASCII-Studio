import { GifReader } from 'omggif';
import type { RawImageBuffer } from '../core/types';

export interface DecodedFrame {
  buffer: RawImageBuffer;
  delayMs: number;
}

export interface DecodedGifResult {
  frames: DecodedFrame[];
  naturalWidth: number;
  naturalHeight: number;
}

const MAX_GIF_WORKING_DIM = 640;
const MAX_DECODED_GIF_FRAMES = 96;

function computeScaledDimensions(
  width: number,
  height: number,
  maxDim: number
): { width: number; height: number } {
  const maxSide = Math.max(width, height);
  if (maxSide <= maxDim) {
    return { width, height };
  }
  const scale = maxDim / maxSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Decodifica un Blob GIF animado (GIF87a / GIF89a) en fotogramas RGBA
 * compuestos correctamente respetando métodos de disposición y transparencia.
 */
export async function decodeGifBlob(blob: Blob): Promise<DecodedGifResult> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const reader = new GifReader(bytes);
  const naturalWidth = reader.width;
  const naturalHeight = reader.height;
  const totalFrames = reader.numFrames();

  if (naturalWidth <= 0 || naturalHeight <= 0 || totalFrames <= 0) {
    throw new Error('El archivo GIF no contiene fotogramas válidos.');
  }

  const target = computeScaledDimensions(
    naturalWidth,
    naturalHeight,
    MAX_GIF_WORKING_DIM
  );

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = naturalWidth;
  srcCanvas.height = naturalHeight;
  const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });

  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = target.width;
  dstCanvas.height = target.height;
  const dstCtx = dstCanvas.getContext('2d', { willReadFrequently: true });

  if (!srcCtx || !dstCtx) {
    throw new Error('No se pudo inicializar Canvas 2D para decodificar el GIF.');
  }

  const compPixels = new Uint8ClampedArray(naturalWidth * naturalHeight * 4);
  const srcImageData = srcCtx.createImageData(naturalWidth, naturalHeight);
  const frameStep =
    totalFrames > MAX_DECODED_GIF_FRAMES
      ? totalFrames / MAX_DECODED_GIF_FRAMES
      : 1;

  const frames: DecodedFrame[] = [];
  let nextKeepIndex = 0;
  let accumulatedDelay = 0;

  for (let i = 0; i < totalFrames; i++) {
    const info = reader.frameInfo(i);
    const prevSnapshot =
      info.disposal === 3 ? new Uint8ClampedArray(compPixels) : null;

    reader.decodeAndBlitFrameRGBA(i, compPixels);

    const rawDelay = info.delay * 10;
    const frameDelay = rawDelay <= 15 ? 100 : rawDelay;
    accumulatedDelay += frameDelay;

    if (i >= Math.floor(nextKeepIndex) || i === totalFrames - 1) {
      srcImageData.data.set(compPixels);
      srcCtx.putImageData(srcImageData, 0, 0);

      dstCtx.clearRect(0, 0, target.width, target.height);
      dstCtx.drawImage(srcCanvas, 0, 0, target.width, target.height);
      const scaled = dstCtx.getImageData(0, 0, target.width, target.height);

      frames.push({
        buffer: {
          width: target.width,
          height: target.height,
          data: new Uint8ClampedArray(scaled.data),
        },
        delayMs: accumulatedDelay,
      });
      accumulatedDelay = 0;
      nextKeepIndex += frameStep;
    }

    // Aplicar método de disposición tras capturar el fotograma
    if (info.disposal === 2) {
      for (let py = info.y; py < info.y + info.height; py++) {
        const rowOff = py * naturalWidth;
        for (let px = info.x; px < info.x + info.width; px++) {
          const idx = (rowOff + px) * 4;
          compPixels[idx] = 0;
          compPixels[idx + 1] = 0;
          compPixels[idx + 2] = 0;
          compPixels[idx + 3] = 0;
        }
      }
    } else if (info.disposal === 3 && prevSnapshot) {
      compPixels.set(prevSnapshot);
    }
  }

  return {
    frames,
    naturalWidth,
    naturalHeight,
  };
}
