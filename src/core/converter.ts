import { convertToBraille } from './braille';
import { buildToneLut, computeLuminance } from './luminance';
import { resolveRampChars } from './ramps';
import { computeGridDimensions, sampleBoxGrid } from './sampler';
import type { AsciiResult, ConversionOptions, RawImageBuffer } from './types';

export const DEFAULT_CONVERSION_OPTIONS: ConversionOptions = {
  cols: 110,
  rampId: 'standard',
  customRamp: ' .:-=+*#%@',
  invert: false,
  brightness: 0,
  contrast: 0,
  charAspect: 0.55,
  colorMode: 'mono',
  alphaBg: [12, 14, 20],
};

/**
 * Orquestador principal de conversión pura:
 * RawImageBuffer -> Escalado con corrección de aspecto -> LUT tonal -> Mapeo a glifos.
 */
export function convertImageToAscii(
  buffer: RawImageBuffer,
  partialOptions: Partial<ConversionOptions> = {}
): AsciiResult {
  const options: ConversionOptions = {
    ...DEFAULT_CONVERSION_OPTIONS,
    ...partialOptions,
  };

  if (
    !Number.isInteger(buffer.width) ||
    !Number.isInteger(buffer.height) ||
    buffer.width <= 0 ||
    buffer.height <= 0 ||
    buffer.data.length < buffer.width * buffer.height * 4
  ) {
    throw new Error('Buffer de imagen inválido o incompleto.');
  }

  const startTime =
    typeof performance !== 'undefined' ? performance.now() : Date.now();

  const { cols, rows } = computeGridDimensions(
    buffer.width,
    buffer.height,
    options.cols,
    options.charAspect
  );

  const toneLut = buildToneLut(
    options.brightness,
    options.contrast,
    options.invert
  );

  if (options.rampId === 'braille') {
    const braille = convertToBraille(
      buffer,
      cols,
      rows,
      options.alphaBg,
      toneLut,
      toneLut,
      options.colorMode
    );
    const endTime =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    return {
      cols,
      rows,
      lines: braille.lines,
      plainText: braille.lines.join('\n'),
      colors: braille.colors,
      colorMode: options.colorMode,
      durationMs: Math.max(0, endTime - startTime),
    };
  }

  const sampled = sampleBoxGrid(buffer, cols, rows, options.alphaBg);
  const rampChars = resolveRampChars(options.rampId, options.customRamp);
  const maxRampIdx = rampChars.length - 1;

  const lines: string[] = new Array(rows);
  const colors = new Uint8Array(cols * rows * 3);

  for (let y = 0; y < rows; y++) {
    let line = '';
    const rowOffset = y * cols;

    for (let x = 0; x < cols; x++) {
      const idx = (rowOffset + x) * 3;
      const r = sampled[idx];
      const g = sampled[idx + 1];
      const b = sampled[idx + 2];

      const lum = computeLuminance(r, g, b);
      const mappedLum = toneLut[lum];
      const charIdx = Math.round((mappedLum / 255) * maxRampIdx);
      line += rampChars[charIdx];

      colors[idx] = toneLut[r];
      colors[idx + 1] = toneLut[g];
      colors[idx + 2] = toneLut[b];
    }

    lines[y] = line;
  }

  const endTime =
    typeof performance !== 'undefined' ? performance.now() : Date.now();

  return {
    cols,
    rows,
    lines,
    plainText: lines.join('\n'),
    colors,
    colorMode: options.colorMode,
    durationMs: Math.max(0, endTime - startTime),
  };
}
