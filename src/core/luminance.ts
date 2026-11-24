/**
 * Utilidades de luminancia perceptual, mezcla alfa y tablas LUT O(1).
 */

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function clampByte(value: number): number {
  return clamp(Math.round(value), 0, 255);
}

/**
 * Luminancia perceptual relativa según estándar ITU-R BT.709 (sRGB):
 * Y = 0.2126 * R + 0.7152 * G + 0.0722 * B
 */
export function computeLuminance(r: number, g: number, b: number): number {
  return clampByte(0.2126 * r + 0.7152 * g + 0.0722 * b);
}

/**
 * Compone un canal de color RGBA sobre un fondo sólido cuando alpha < 255.
 */
export function blendChannelWithAlpha(
  channel: number,
  alphaByte: number,
  bgChannel: number
): number {
  if (alphaByte >= 255) return channel;
  if (alphaByte <= 0) return bgChannel;
  const alpha = alphaByte / 255;
  return channel * alpha + bgChannel * (1 - alpha);
}

/**
 * Precalcula una tabla de búsqueda (LUT) de 256 posiciones para aplicar
 * brillo, contraste e inversión en tiempo O(1) por celda o píxel.
 */
export function buildToneLut(
  brightness: number,
  contrast: number,
  invert: boolean
): Uint8Array {
  const lut = new Uint8Array(256);
  const safeBrightness = clamp(brightness, -100, 100) * 2.55;
  const safeContrast = clamp(contrast * 2.55, -254, 254);
  const contrastFactor =
    (259 * (safeContrast + 255)) / (255 * (259 - safeContrast));

  for (let i = 0; i < 256; i++) {
    const withBrightness = i + safeBrightness;
    const withContrast = contrastFactor * (withBrightness - 128) + 128;
    const byteVal = clampByte(withContrast);
    lut[i] = invert ? 255 - byteVal : byteVal;
  }

  return lut;
}
