import { blendChannelWithAlpha, clamp } from './luminance';
import type { RawImageBuffer } from './types';

export interface GridDimensions {
  cols: number;
  rows: number;
}

/**
 * Calcula las dimensiones de la rejilla ASCII compensando el factor de aspecto
 * del carácter monoespaciado para evitar que la imagen se estire verticalmente.
 *
 * Fórmula: rows = round(cols * (srcHeight / srcWidth) * charAspect)
 */
export function computeGridDimensions(
  srcWidth: number,
  srcHeight: number,
  cols: number,
  charAspect: number
): GridDimensions {
  if (
    !Number.isFinite(srcWidth) ||
    !Number.isFinite(srcHeight) ||
    srcWidth <= 0 ||
    srcHeight <= 0
  ) {
    throw new Error('Las dimensiones de la imagen origen deben ser mayores a 0.');
  }

  const safeColsInput = Number.isFinite(cols) ? cols : 1;
  const safeCols = Math.max(1, Math.round(safeColsInput));
  const safeAspect = clamp(charAspect, 0.1, 2.0);
  const rows = Math.max(
    1,
    Math.round(safeCols * (srcHeight / srcWidth) * safeAspect)
  );

  return { cols: safeCols, rows };
}

/**
 * Submuestreo por promedio de área (Box Sampling).
 * Promedia los píxeles dentro de cada celda [x0..x1) × [y0..y1) para evitar
 * aliasing/moiré al reducir imágenes de alta resolución.
 *
 * Retorna un buffer RGB plano de tamaño gridW * gridH * 3.
 */
export function sampleBoxGrid(
  buffer: RawImageBuffer,
  gridW: number,
  gridH: number,
  alphaBg: [number, number, number]
): Uint8ClampedArray {
  const { width: srcW, height: srcH, data } = buffer;
  const output = new Uint8ClampedArray(gridW * gridH * 3);
  const [bgR, bgG, bgB] = alphaBg;

  for (let gy = 0; gy < gridH; gy++) {
    const y0 = Math.min(srcH - 1, Math.floor((gy * srcH) / gridH));
    const y1 = Math.min(srcH, Math.max(y0 + 1, Math.floor(((gy + 1) * srcH) / gridH)));
    const boxH = y1 - y0;

    for (let gx = 0; gx < gridW; gx++) {
      const x0 = Math.min(srcW - 1, Math.floor((gx * srcW) / gridW));
      const x1 = Math.min(srcW, Math.max(x0 + 1, Math.floor(((gx + 1) * srcW) / gridW)));
      const boxW = x1 - x0;

      // Promedia 100 % de los píxeles en cajas normales (<=32 px) para preservar líneas de 1 px;
      // solo submuestrea bloques muy grandes para acotar el peor caso en imágenes 8K.
      const stepX = boxW > 32 ? Math.max(1, Math.floor(boxW / 16)) : 1;
      const stepY = boxH > 32 ? Math.max(1, Math.floor(boxH / 16)) : 1;

      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let count = 0;

      for (let py = y0; py < y1; py += stepY) {
        const rowOffset = py * srcW;
        for (let px = x0; px < x1; px += stepX) {
          const idx = (rowOffset + px) * 4;
          const a = data[idx + 3];
          if (a === 255) {
            sumR += data[idx];
            sumG += data[idx + 1];
            sumB += data[idx + 2];
          } else {
            sumR += blendChannelWithAlpha(data[idx], a, bgR);
            sumG += blendChannelWithAlpha(data[idx + 1], a, bgG);
            sumB += blendChannelWithAlpha(data[idx + 2], a, bgB);
          }
          count++;
        }
      }

      const outIdx = (gy * gridW + gx) * 3;
      output[outIdx] = Math.round(sumR / count);
      output[outIdx + 1] = Math.round(sumG / count);
      output[outIdx + 2] = Math.round(sumB / count);
    }
  }

  return output;
}
