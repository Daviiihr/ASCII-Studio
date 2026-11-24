import { clamp } from '../core/luminance';

export const STUDIO_MONO_FONT =
  "'JetBrains Mono', 'Fira Code', Consolas, 'Liberation Mono', monospace";

export interface FontMetrics {
  charWidth: number;
  lineHeight: number;
  /** Relación ancho / alto del glifo cuando line-height es 1. */
  charAspect: number;
}

/**
 * Mide dinámicamente las dimensiones de un carácter monoespaciado real
 * en el navegador actual para calibrar automáticamente el factor de aspecto.
 */
export function measureMonospaceMetrics(
  fontFamily = STUDIO_MONO_FONT,
  fontSizePx = 16
): FontMetrics {
  if (typeof document === 'undefined') {
    return {
      charWidth: fontSizePx * 0.6,
      lineHeight: fontSizePx,
      charAspect: 0.6,
    };
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return {
      charWidth: fontSizePx * 0.6,
      lineHeight: fontSizePx,
      charAspect: 0.6,
    };
  }

  ctx.font = `${fontSizePx}px ${fontFamily}`;
  const sample = 'MMMMMMMMMM';
  const measuredWidth = ctx.measureText(sample).width / sample.length;
  const lineHeight = fontSizePx;
  const charAspect = clamp(measuredWidth / lineHeight, 0.42, 0.78);

  return {
    charWidth: measuredWidth,
    lineHeight,
    charAspect: Number(charAspect.toFixed(3)),
  };
}
