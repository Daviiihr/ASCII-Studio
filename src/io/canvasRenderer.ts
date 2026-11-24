import { clamp } from '../core/luminance';
import type { AsciiResult, MonoTheme } from '../core/types';
import { STUDIO_MONO_FONT } from './fontMetrics';

export interface ThemePalette {
  id: MonoTheme;
  label: string;
  bg: string;
  fg: string;
  alphaBg: [number, number, number];
}

export const MONO_THEMES: Record<MonoTheme, ThemePalette> = {
  'light-on-dark': {
    id: 'light-on-dark',
    label: 'Estudio Oscuro',
    bg: '#0c0c0f',
    fg: '#f4f4f5',
    alphaBg: [12, 12, 15],
  },
  matrix: {
    id: 'matrix',
    label: 'Fósforo Verde',
    bg: '#05110a',
    fg: '#34d399',
    alphaBg: [5, 17, 10],
  },
  amber: {
    id: 'amber',
    label: 'Monitor Ámbar',
    bg: '#130d05',
    fg: '#fbbf24',
    alphaBg: [19, 13, 5],
  },
  'dark-on-light': {
    id: 'dark-on-light',
    label: 'Tinta / Papel',
    bg: '#f8fafc',
    fg: '#0f172a',
    alphaBg: [248, 250, 252],
  },
};

export interface CanvasRenderOptions {
  bgColor: string;
  fgColor: string;
  fontSizePx: number;
  fontFamily?: string;
  paddingPx?: number;
  dpr?: number;
}

export interface CanvasRenderMetrics {
  cssWidth: number;
  cssHeight: number;
}

const BRAILLE_DOT_BITS: readonly [number, number][] = [
  [0x01, 0x08],
  [0x02, 0x10],
  [0x04, 0x20],
  [0x40, 0x80],
];
const BRAILLE_COL_OFFSETS = [0.28, 0.72] as const;
const BRAILLE_ROW_OFFSETS = [0.13, 0.37, 0.61, 0.85] as const;

function renderBrailleToCanvas(
  ctx: CanvasRenderingContext2D,
  result: AsciiResult,
  fgColor: string,
  padding: number,
  charWidth: number,
  lineHeight: number
): void {
  const dotRadius = Math.max(
    0.65,
    Math.min(charWidth * 0.165, lineHeight * 0.088)
  );
  const twoPi = Math.PI * 2;

  if (result.colorMode === 'mono') {
    ctx.fillStyle = fgColor;
    ctx.beginPath();

    for (let y = 0; y < result.rows; y++) {
      const line = result.lines[y];
      const cellY = padding + y * lineHeight;

      for (let x = 0; x < line.length; x++) {
        const mask = line.charCodeAt(x) - 0x2800;
        if (mask <= 0 || mask > 0xff) continue;

        const cellX = padding + x * charWidth;
        for (let dy = 0; dy < 4; dy++) {
          const dotY = cellY + lineHeight * BRAILLE_ROW_OFFSETS[dy];
          for (let dx = 0; dx < 2; dx++) {
            if ((mask & BRAILLE_DOT_BITS[dy][dx]) !== 0) {
              const dotX = cellX + charWidth * BRAILLE_COL_OFFSETS[dx];
              ctx.moveTo(dotX + dotRadius, dotY);
              ctx.arc(dotX, dotY, dotRadius, 0, twoPi);
            }
          }
        }
      }
    }

    ctx.fill();
    return;
  }

  let activeColor = '';
  let hasOpenPath = false;

  const flushPath = () => {
    if (hasOpenPath) {
      ctx.fill();
      hasOpenPath = false;
    }
  };

  for (let y = 0; y < result.rows; y++) {
    const line = result.lines[y];
    const cellY = padding + y * lineHeight;

    for (let x = 0; x < line.length; x++) {
      const mask = line.charCodeAt(x) - 0x2800;
      if (mask <= 0 || mask > 0xff) continue;

      const idx = (y * result.cols + x) * 3;
      const colorKey = `${result.colors[idx]},${result.colors[idx + 1]},${result.colors[idx + 2]}`;

      if (colorKey !== activeColor) {
        flushPath();
        activeColor = colorKey;
        ctx.fillStyle = `rgb(${colorKey})`;
        ctx.beginPath();
        hasOpenPath = true;
      } else if (!hasOpenPath) {
        ctx.beginPath();
        hasOpenPath = true;
      }

      const cellX = padding + x * charWidth;
      for (let dy = 0; dy < 4; dy++) {
        const dotY = cellY + lineHeight * BRAILLE_ROW_OFFSETS[dy];
        for (let dx = 0; dx < 2; dx++) {
          if ((mask & BRAILLE_DOT_BITS[dy][dx]) !== 0) {
            const dotX = cellX + charWidth * BRAILLE_COL_OFFSETS[dx];
            ctx.moveTo(dotX + dotRadius, dotY);
            ctx.arc(dotX, dotY, dotRadius, 0, twoPi);
          }
        }
      }
    }
  }

  flushPath();
}

/**
 * Renderiza un AsciiResult sobre un <canvas> con alineación de rejilla exacta,
 * trazado vectorial nativo para Braille 2×4 y lotes de color para mantener 60 FPS.
 */
export function renderAsciiToCanvas(
  canvas: HTMLCanvasElement,
  result: AsciiResult,
  options: CanvasRenderOptions
): CanvasRenderMetrics {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { cssWidth: 0, cssHeight: 0 };
  }

  const fontFamily = options.fontFamily ?? STUDIO_MONO_FONT;
  const fontSize = options.fontSizePx;
  const padding = options.paddingPx ?? 16;
  const dpr = options.dpr ?? (window.devicePixelRatio || 1);

  ctx.font = `${fontSize}px ${fontFamily}`;
  if ('fontKerning' in ctx) {
    (ctx as CanvasRenderingContext2D & { fontKerning: string }).fontKerning =
      'none';
  }

  const charWidth = ctx.measureText('MMMMMMMMMM').width / 10;
  const lineHeight = fontSize;
  const isBraille = result.lines.some((line) => /[\u2800-\u28ff]/.test(line));

  let contentWidth = result.cols * charWidth;
  if (!isBraille) {
    for (let y = 0; y < result.rows; y++) {
      const measured = ctx.measureText(result.lines[y]).width;
      if (measured > contentWidth) {
        contentWidth = measured;
      }
    }
  }

  const cssWidth = Math.ceil(contentWidth + padding * 2);
  const cssHeight = Math.ceil(result.rows * lineHeight + padding * 2);

  canvas.width = Math.max(1, Math.ceil(cssWidth * dpr));
  canvas.height = Math.max(1, Math.ceil(cssHeight * dpr));
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = options.bgColor;
  ctx.fillRect(0, 0, cssWidth, cssHeight);

  if (isBraille) {
    renderBrailleToCanvas(
      ctx,
      result,
      options.fgColor,
      padding,
      charWidth,
      lineHeight
    );
    return { cssWidth, cssHeight };
  }

  ctx.font = `${fontSize}px ${fontFamily}`;
  if ('fontKerning' in ctx) {
    (ctx as CanvasRenderingContext2D & { fontKerning: string }).fontKerning =
      'none';
  }
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  if (result.colorMode === 'mono') {
    ctx.fillStyle = options.fgColor;
    for (let y = 0; y < result.rows; y++) {
      ctx.fillText(result.lines[y], padding, padding + y * lineHeight);
    }
    return { cssWidth, cssHeight };
  }

  // Modo color: dibuja runs contiguos del mismo RGB por fila
  for (let y = 0; y < result.rows; y++) {
    const glyphs = Array.from(result.lines[y]);
    const posY = padding + y * lineHeight;

    let runStart = 0;
    let runText = '';
    let runColor = '';

    const flush = () => {
      if (!runText || !runColor) return;
      ctx.fillStyle = `rgb(${runColor})`;
      ctx.fillText(runText, padding + runStart * charWidth, posY);
      runText = '';
    };

    for (let x = 0; x < glyphs.length; x++) {
      const ch = glyphs[x];
      if (ch === ' ') {
        flush();
        runColor = '';
        continue;
      }

      const idx = (y * result.cols + x) * 3;
      const colorKey = `${result.colors[idx]},${result.colors[idx + 1]},${result.colors[idx + 2]}`;

      if (colorKey !== runColor) {
        flush();
        runStart = x;
        runColor = colorKey;
      }
      runText += ch;
    }

    flush();
  }

  return { cssWidth, cssHeight };
}

/**
 * Renderiza el ASCII art a alta resolución y lo exporta como PNG Blob,
 * limitando dimensiones máximas para evitar fallos en imágenes panorámicas extremas.
 */
export async function exportResultToPngBlob(
  result: AsciiResult,
  bgColor: string,
  fgColor: string
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const maxSafeDim = 8192;
  const padding = 24;
  const baseFont = result.cols > 200 ? 10 : 14;

  const estWidthAt1 = result.cols * 0.65;
  const estHeightAt1 = result.rows;
  const maxByDim = Math.floor(
    (maxSafeDim - padding * 2) / Math.max(estWidthAt1, estHeightAt1, 1)
  );
  const fontSizePx = clamp(Math.min(baseFont, maxByDim), 4, 14);

  const estWidth = result.cols * fontSizePx * 0.65 + padding * 2;
  const estHeight = result.rows * fontSizePx + padding * 2;
  const dpr = Math.max(estWidth, estHeight) * 2 <= maxSafeDim ? 2 : 1;

  renderAsciiToCanvas(canvas, result, {
    bgColor,
    fgColor,
    fontSizePx,
    paddingPx: padding,
    dpr,
  });

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('No se pudo codificar la imagen PNG.'));
      }
    }, 'image/png');
  });
}
