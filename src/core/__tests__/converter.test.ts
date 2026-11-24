import { describe, expect, it } from 'vitest';
import { convertImageToAscii } from '../converter';
import {
  toAnimatedSvgDocument,
  toAnsiText,
  toHtmlDocument,
  toPlainText,
  toSvgDocument,
} from '../formatters';
import {
  DEFAULT_GITHUB_PROFILE,
  toGitHubProfileSvg,
  toGitHubReadmeMarkdown,
} from '../githubCard';
import { buildToneLut, computeLuminance } from '../luminance';
import { RAMP_REGISTRY, resolveRampChars } from '../ramps';
import { computeGridDimensions, sampleBoxGrid } from '../sampler';
import type { RawImageBuffer } from '../types';

function makeSolidBuffer(
  width: number,
  height: number,
  r: number,
  g: number,
  b: number,
  a = 255
): RawImageBuffer {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = a;
  }
  return { width, height, data };
}

function makeHorizontalGradient(width: number, height: number): RawImageBuffer {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = width === 1 ? 0 : Math.round((x / (width - 1)) * 255);
      const idx = (y * width + x) * 4;
      data[idx] = v;
      data[idx + 1] = v;
      data[idx + 2] = v;
      data[idx + 3] = 255;
    }
  }
  return { width, height, data };
}

describe('luminance y LUT tonal', () => {
  it('aplica pesos perceptuales Rec. 709 (Verde > Rojo > Azul)', () => {
    const greenLum = computeLuminance(0, 255, 0);
    const redLum = computeLuminance(255, 0, 0);
    const blueLum = computeLuminance(0, 0, 255);

    expect(greenLum).toBeGreaterThan(redLum);
    expect(redLum).toBeGreaterThan(blueLum);
    expect(computeLuminance(0, 0, 0)).toBe(0);
    expect(computeLuminance(255, 255, 255)).toBe(255);
  });

  it('construye LUT O(1) para brillo, contraste e inversión', () => {
    const identity = buildToneLut(0, 0, false);
    expect(identity[0]).toBe(0);
    expect(identity[128]).toBe(128);
    expect(identity[255]).toBe(255);

    const inverted = buildToneLut(0, 0, true);
    expect(inverted[0]).toBe(255);
    expect(inverted[255]).toBe(0);

    const maxBright = buildToneLut(100, 0, false);
    expect(maxBright[0]).toBe(255);

    const lowContrast = buildToneLut(0, -100, false);
    expect(lowContrast[0]).toBeGreaterThanOrEqual(126);
    expect(lowContrast[255]).toBeLessThanOrEqual(130);
  });
});

describe('sampler y corrección de proporción', () => {
  it('compensa el factor de aspecto de caracteres en imágenes cuadradas', () => {
    const dims = computeGridDimensions(200, 200, 80, 0.5);
    expect(dims).toEqual({ cols: 80, rows: 40 });
  });

  it('compone transparencia alfa sobre alphaBg durante el box-sampling', () => {
    const transparentPixel = makeSolidBuffer(2, 2, 255, 0, 0, 0);
    const sampled = sampleBoxGrid(transparentPixel, 1, 1, [10, 20, 30]);
    expect(Array.from(sampled)).toEqual([10, 20, 30]);
  });

  it('soporta imagen mínima 1×1 sin desbordamientos', () => {
    const tiny = makeSolidBuffer(1, 1, 255, 255, 255);
    const result = convertImageToAscii(tiny, { cols: 4, charAspect: 0.5 });
    expect(result.cols).toBe(4);
    expect(result.rows).toBe(2);
    expect(result.lines).toEqual(['@@@@', '@@@@']);
  });
});

describe('rampas y motor convertImageToAscii', () => {
  it('mapea gradiente horizontal en rampa estándar e invierte correctamente', () => {
    const grad = makeHorizontalGradient(100, 20);
    const normal = convertImageToAscii(grad, {
      cols: 10,
      rampId: 'standard',
      charAspect: 0.5,
      invert: false,
    });
    expect(normal.lines[0].startsWith(' ')).toBe(true);
    expect(normal.lines[0].endsWith('@')).toBe(true);

    const inverted = convertImageToAscii(grad, {
      cols: 10,
      rampId: 'standard',
      charAspect: 0.5,
      invert: true,
    });
    expect(inverted.lines[0].startsWith('@')).toBe(true);
    expect(inverted.lines[0].endsWith(' ')).toBe(true);
  });

  it('resuelve rampa personalizada, limpia caracteres de control y hace fallback si < 2', () => {
    expect(resolveRampChars('custom', '01')).toEqual(['0', '1']);
    expect(resolveRampChars('custom', 'X')).toEqual(
      Array.from(RAMP_REGISTRY.standard.chars)
    );
    expect(resolveRampChars('custom', '\n\tA')).toEqual(
      Array.from(RAMP_REGISTRY.standard.chars)
    );
  });

  it('rechaza dimensiones NaN o no enteras en el buffer origen', () => {
    expect(() =>
      convertImageToAscii({
        width: Number.NaN,
        height: 10,
        data: new Uint8ClampedArray(400),
      })
    ).toThrow();
  });

  it('genera bloques Unicode correctamente en extremos blanco/negro', () => {
    const white = makeSolidBuffer(20, 20, 255, 255, 255);
    const black = makeSolidBuffer(20, 20, 0, 0, 0);

    const whiteBlocks = convertImageToAscii(white, {
      cols: 5,
      rampId: 'blocks',
      charAspect: 0.5,
    });
    const blackBlocks = convertImageToAscii(black, {
      cols: 5,
      rampId: 'blocks',
      charAspect: 0.5,
    });

    expect(whiteBlocks.lines[0]).toBe('█████');
    expect(blackBlocks.lines[0]).toBe('     ');
  });

  it('codifica Braille 2×4 (U+2800 para negro y U+28FF ⣿ para blanco)', () => {
    const black = makeSolidBuffer(16, 16, 0, 0, 0);
    const white = makeSolidBuffer(16, 16, 255, 255, 255);

    const resBlack = convertImageToAscii(black, {
      cols: 4,
      rampId: 'braille',
      charAspect: 0.5,
    });
    const resWhite = convertImageToAscii(white, {
      cols: 4,
      rampId: 'braille',
      charAspect: 0.5,
    });

    expect(resBlack.lines[0]).toBe('\u2800\u2800\u2800\u2800');
    expect(resWhite.lines[0]).toBe('⣿⣿⣿⣿');
  });
});

describe('formateadores de exportación', () => {
  it('exporta texto plano, ANSI TrueColor, HTML y SVG escapando caracteres especiales', () => {
    const grad = makeHorizontalGradient(140, 20);
    const result = convertImageToAscii(grad, {
      cols: 70,
      rampId: 'detailed',
      colorMode: 'color',
      charAspect: 0.5,
    });

    expect(toPlainText(result)).toBe(result.plainText);

    const ansi = toAnsiText(result);
    expect(ansi).toContain('\x1b[38;2;');
    expect(ansi.endsWith('\x1b[0m')).toBe(true);

    const html = toHtmlDocument(result, {
      bgColor: '#0c0e14',
      fgColor: '#e2e8f0',
      colorMode: 'color',
    });
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('line-height: 1;');
    expect(html).toContain('font-variant-ligatures: none;');
    // Verifica que caracteres especiales como '<', '>', '&', '"' en detailed están escapados.
    expect(html).toContain('&lt;');
    expect(html).toContain('&gt;');
    expect(html).toContain('&amp;');
    expect(html).toContain('&quot;');

    const svg = toSvgDocument(result, {
      bgColor: '#0c0e14',
      fgColor: '#e2e8f0',
      colorMode: 'color',
    });
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('<tspan fill="rgb(');
  });

  it('exporta SVG animado con CSS @keyframes puro y prefers-reduced-motion', () => {
    const f1 = convertImageToAscii(makeSolidBuffer(10, 10, 0, 0, 0), {
      cols: 6,
      charAspect: 0.5,
    });
    const f2 = convertImageToAscii(makeSolidBuffer(10, 10, 255, 255, 255), {
      cols: 6,
      charAspect: 0.5,
    });

    const animSvg = toAnimatedSvgDocument(
      [
        { result: f1, delayMs: 100 },
        { result: f2, delayMs: 150 },
      ],
      { bgColor: '#0d1117', fgColor: '#e6edf3', colorMode: 'mono' }
    );

    expect(animSvg).toContain('@keyframes af0');
    expect(animSvg).toContain('@keyframes af1');
    expect(animSvg).toContain('steps(1, end) infinite');
    expect(animSvg).toContain('prefers-reduced-motion: reduce');
    expect(animSvg).not.toContain('<script');
  });

  it('genera tarjeta SVG de perfil de GitHub (estática y animada) y Markdown listo para README', () => {
    const f1 = convertImageToAscii(makeHorizontalGradient(40, 20), {
      cols: 24,
      charAspect: 0.6,
      colorMode: 'color',
    });
    const f2 = convertImageToAscii(makeHorizontalGradient(40, 20), {
      cols: 24,
      charAspect: 0.6,
      colorMode: 'color',
      invert: true,
    });

    const profile = {
      ...DEFAULT_GITHUB_PROFILE,
      username: 'daviihr',
      bio: 'Construyendo herramientas <rápidas> & limpias.',
    };

    const ghSvg = toGitHubProfileSvg(
      [
        { result: f1, delayMs: 120 },
        { result: f2, delayMs: 120 },
      ],
      profile,
      { colorMode: 'color', charAspect: 0.6 }
    );

    expect(ghSvg).toContain('@daviihr');
    expect(ghSvg).toContain('&lt;rápidas&gt; &amp;');
    expect(ghSvg).toContain('limpias.');
    expect(ghSvg).toContain('@keyframes af0');
    expect(ghSvg).toContain('daviihr@github — ~/README.md · 2f');

    const mdEmbed = toGitHubReadmeMarkdown(f1, profile, 'svg-embed', 'daviihr-ascii.svg');
    expect(mdEmbed).toContain('<img src="./daviihr-ascii.svg"');

    const mdTable = toGitHubReadmeMarkdown(f1, profile, 'inline-table');
    expect(mdTable).toContain('<table width="100%">');
    expect(mdTable).toContain('<pre>');
    expect(mdTable).toContain('### @daviihr');
  });

  it('renderiza Braille en SVG como trazado vectorial <path> sin desbordar el ancho de celda', () => {
    const white = makeSolidBuffer(20, 20, 255, 255, 255);
    const braille = convertImageToAscii(white, {
      cols: 10,
      rampId: 'braille',
      charAspect: 0.6,
    });

    const ghSvg = toGitHubProfileSvg(
      [{ result: braille, delayMs: 0 }],
      DEFAULT_GITHUB_PROFILE,
      { colorMode: 'mono', charAspect: 0.6 }
    );

    expect(ghSvg).toContain('<path d="M');
    expect(ghSvg).not.toContain('⣿');
  });
});
