import { computeLuminance } from './luminance';
import { sampleBoxGrid } from './sampler';
import type { ColorMode, RawImageBuffer } from './types';

/**
 * Mapa de bits del bloque Unicode Braille Patterns (U+2800..U+28FF).
 * Cada carácter representa una matriz de 2 columnas × 4 filas de subpíxeles.
 */
const BRAILLE_DOT_BITS: readonly [number, number][] = [
  [0x01, 0x08], // fila 0: punto 1, punto 4
  [0x02, 0x10], // fila 1: punto 2, punto 5
  [0x04, 0x20], // fila 2: punto 3, punto 6
  [0x40, 0x80], // fila 3: punto 7, punto 8
];

/** Matriz de dithering ordenado Bayer 2×4 para suavizar degradados en 1-bit. */
const BAYER_2X4: readonly [number, number][] = [
  [0, 4],
  [2, 6],
  [3, 7],
  [1, 5],
];

export interface BrailleRenderOutput {
  lines: string[];
  colors: Uint8Array;
}

/**
 * Convierte el buffer fuente a arte Braille 2×4 (resolución efectiva 2× ancho y 4× alto).
 */
export function convertToBraille(
  buffer: RawImageBuffer,
  cols: number,
  rows: number,
  alphaBg: [number, number, number],
  luminanceLut: Uint8Array,
  colorLut: Uint8Array,
  _colorMode: ColorMode
): BrailleRenderOutput {
  const subW = cols * 2;
  const subH = rows * 4;
  const subGrid = sampleBoxGrid(buffer, subW, subH, alphaBg);

  const lines: string[] = new Array(rows);
  const colors = new Uint8Array(cols * rows * 3);

  for (let cy = 0; cy < rows; cy++) {
    let line = '';
    const baseSubY = cy * 4;

    for (let cx = 0; cx < cols; cx++) {
      const baseSubX = cx * 2;
      let mask = 0;

      let activeR = 0;
      let activeG = 0;
      let activeB = 0;
      let activeCount = 0;

      let allR = 0;
      let allG = 0;
      let allB = 0;

      for (let dy = 0; dy < 4; dy++) {
        const sy = baseSubY + dy;
        const rowOffset = sy * subW;

        for (let dx = 0; dx < 2; dx++) {
          const sx = baseSubX + dx;
          const idx = (rowOffset + sx) * 3;
          const r = subGrid[idx];
          const g = subGrid[idx + 1];
          const b = subGrid[idx + 2];

          allR += r;
          allG += g;
          allB += b;

          const lum = luminanceLut[computeLuminance(r, g, b)];
          // Umbral ordenado entre 37 y 219 para preservar negros puros y blancos puros.
          const threshold = 24 + ((BAYER_2X4[dy][dx] + 0.5) / 8) * 208;

          if (lum >= threshold) {
            mask |= BRAILLE_DOT_BITS[dy][dx];
            activeR += r;
            activeG += g;
            activeB += b;
            activeCount++;
          }
        }
      }

      line += String.fromCharCode(0x2800 + mask);

      const outIdx = (cy * cols + cx) * 3;
      if (activeCount > 0) {
        colors[outIdx] = colorLut[Math.round(activeR / activeCount)];
        colors[outIdx + 1] = colorLut[Math.round(activeG / activeCount)];
        colors[outIdx + 2] = colorLut[Math.round(activeB / activeCount)];
      } else {
        colors[outIdx] = colorLut[Math.round(allR / 8)];
        colors[outIdx + 1] = colorLut[Math.round(allG / 8)];
        colors[outIdx + 2] = colorLut[Math.round(allB / 8)];
      }
    }

    lines[cy] = line;
  }

  return { lines, colors };
}
