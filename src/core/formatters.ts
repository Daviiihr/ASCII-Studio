import type {
  AnimatedAsciiFrame,
  AsciiResult,
  ExportStyleOptions,
} from './types';

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Devuelve el arte ASCII en texto plano UTF-8.
 */
export function toPlainText(result: AsciiResult): string {
  return result.plainText;
}

/**
 * Devuelve texto compatible con terminales TrueColor (24-bit ANSI escape codes).
 * Agrupa caracteres consecutivos del mismo color en cada línea para reducir tamaño.
 */
export function toAnsiText(result: AsciiResult): string {
  if (result.colorMode !== 'color') {
    return result.plainText;
  }

  const ansiLines: string[] = new Array(result.rows);

  for (let y = 0; y < result.rows; y++) {
    const glyphs = Array.from(result.lines[y]);
    let lineOut = '';
    let prevColorKey = '';

    for (let x = 0; x < glyphs.length; x++) {
      const ch = glyphs[x];
      const idx = (y * result.cols + x) * 3;
      const r = result.colors[idx];
      const g = result.colors[idx + 1];
      const b = result.colors[idx + 2];
      const colorKey = `${r};${g};${b}`;

      if (colorKey !== prevColorKey) {
        lineOut += `\x1b[38;2;${colorKey}m`;
        prevColorKey = colorKey;
      }
      lineOut += ch;
    }

    lineOut += '\x1b[0m';
    ansiLines[y] = lineOut;
  }

  return ansiLines.join('\n');
}

/**
 * Genera un documento HTML5 autocontenido con tipografía monoespaciada exacta
 * y agrupación run-length de spans cuando está en modo color.
 */
export function toHtmlDocument(
  result: AsciiResult,
  style: ExportStyleOptions
): string {
  const { bgColor, fgColor, colorMode } = style;
  const fontSize = style.fontSize ?? 12;

  let bodyContent = '';
  if (colorMode === 'mono') {
    bodyContent = escapeXml(result.plainText);
  } else {
    const htmlLines: string[] = new Array(result.rows);
    for (let y = 0; y < result.rows; y++) {
      const glyphs = Array.from(result.lines[y]);
      let lineHtml = '';
      let runColor = '';
      let runText = '';

      const flushRun = () => {
        if (!runText) return;
        if (!runColor) {
          lineHtml += escapeXml(runText);
        } else {
          lineHtml += `<span style="color:rgb(${runColor})">${escapeXml(runText)}</span>`;
        }
        runText = '';
      };

      for (let x = 0; x < glyphs.length; x++) {
        const ch = glyphs[x];
        if (ch === ' ' || ch === '\u2800') {
          runText += ch;
          continue;
        }
        const idx = (y * result.cols + x) * 3;
        const colorKey = `${result.colors[idx]},${result.colors[idx + 1]},${result.colors[idx + 2]}`;

        if (colorKey !== runColor) {
          flushRun();
          runColor = colorKey;
        }
        runText += ch;
      }
      flushRun();
      htmlLines[y] = lineHtml;
    }
    bodyContent = htmlLines.join('\n');
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ASCII Studio Export (${result.cols}×${result.rows})</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      background: ${escapeXml(bgColor)};
      color: ${escapeXml(fgColor)};
      display: flex;
      justify-content: center;
      overflow-x: auto;
    }
    pre {
      margin: 0;
      font-family: 'JetBrains Mono', 'Fira Code', Consolas, 'Liberation Mono', monospace;
      font-size: ${fontSize}px;
      line-height: 1;
      letter-spacing: 0;
      white-space: pre;
      font-variant-ligatures: none;
      font-feature-settings: 'liga' 0, 'calt' 0;
    }
  </style>
</head>
<body>
<pre>${bodyContent}</pre>
</body>
</html>`;
}

const BRAILLE_DOT_BITS: readonly [number, number][] = [
  [0x01, 0x08],
  [0x02, 0x10],
  [0x04, 0x20],
  [0x40, 0x80],
];
const BRAILLE_COL_OFFSETS = [0.28, 0.72] as const;
const BRAILLE_ROW_OFFSETS = [0.13, 0.37, 0.61, 0.85] as const;

function appendSvgCirclePath(cx: number, cy: number, r: number): string {
  const x0 = (cx - r).toFixed(2);
  const y0 = cy.toFixed(2);
  const rad = r.toFixed(2);
  const diam = (r * 2).toFixed(2);
  return `M${x0},${y0}a${rad},${rad} 0 1,0 ${diam},0a${rad},${rad} 0 1,0 -${diam},0`;
}

function renderSvgBrailleLayer(
  result: AsciiResult,
  colorMode: 'mono' | 'color',
  offsetX: number,
  offsetY: number,
  fontSize: number,
  charAspect: number,
  indent: string
): string {
  const charWidth = fontSize * charAspect;
  const lineHeight = fontSize;
  const dotRadius = Math.max(
    0.55,
    Math.min(charWidth * 0.165, lineHeight * 0.088)
  );

  if (colorMode === 'mono') {
    const parts: string[] = [];
    for (let y = 0; y < result.rows; y++) {
      const line = result.lines[y];
      const cellY = offsetY + y * lineHeight;
      for (let x = 0; x < line.length; x++) {
        const mask = line.charCodeAt(x) - 0x2800;
        if (mask <= 0 || mask > 0xff) continue;
        const cellX = offsetX + x * charWidth;
        for (let dy = 0; dy < 4; dy++) {
          const dotY = cellY + lineHeight * BRAILLE_ROW_OFFSETS[dy];
          for (let dx = 0; dx < 2; dx++) {
            if ((mask & BRAILLE_DOT_BITS[dy][dx]) !== 0) {
              const dotX = cellX + charWidth * BRAILLE_COL_OFFSETS[dx];
              parts.push(appendSvgCirclePath(dotX, dotY, dotRadius));
            }
          }
        }
      }
    }
    if (parts.length === 0) return '';
    return `${indent}<path d="${parts.join('')}" />`;
  }

  const byColor = new Map<string, string[]>();
  for (let y = 0; y < result.rows; y++) {
    const line = result.lines[y];
    const cellY = offsetY + y * lineHeight;
    for (let x = 0; x < line.length; x++) {
      const mask = line.charCodeAt(x) - 0x2800;
      if (mask <= 0 || mask > 0xff) continue;

      const idx = (y * result.cols + x) * 3;
      const colorKey = `${result.colors[idx]},${result.colors[idx + 1]},${result.colors[idx + 2]}`;
      let bucket = byColor.get(colorKey);
      if (!bucket) {
        bucket = [];
        byColor.set(colorKey, bucket);
      }

      const cellX = offsetX + x * charWidth;
      for (let dy = 0; dy < 4; dy++) {
        const dotY = cellY + lineHeight * BRAILLE_ROW_OFFSETS[dy];
        for (let dx = 0; dx < 2; dx++) {
          if ((mask & BRAILLE_DOT_BITS[dy][dx]) !== 0) {
            const dotX = cellX + charWidth * BRAILLE_COL_OFFSETS[dx];
            bucket.push(appendSvgCirclePath(dotX, dotY, dotRadius));
          }
        }
      }
    }
  }

  const paths: string[] = [];
  for (const [colorKey, parts] of byColor.entries()) {
    paths.push(`${indent}<path fill="rgb(${colorKey})" d="${parts.join('')}" />`);
  }
  return paths.join('\n');
}

/**
 * Serializa un AsciiResult para SVG. Si contiene patrones Braille Unicode,
 * traza puntos vectoriales exactos (<path>) para evitar desbordamientos por
 * fuentes de respaldo del sistema operativo.
 */
export function renderSvgTextRows(
  result: AsciiResult,
  colorMode: 'mono' | 'color',
  offsetX: number,
  offsetY: number,
  fontSize: number,
  indent = '  ',
  charAspect = 0.6
): string {
  const isBraille = result.lines.some((line) => /[\u2800-\u28ff]/.test(line));
  if (isBraille) {
    return renderSvgBrailleLayer(
      result,
      colorMode,
      offsetX,
      offsetY,
      fontSize,
      charAspect,
      indent
    );
  }
  const lineHeight = fontSize;
  const textLines: string[] = new Array(result.rows);

  for (let y = 0; y < result.rows; y++) {
    const posY = (offsetY + (y + 1) * lineHeight - fontSize * 0.15).toFixed(2);

    if (colorMode === 'mono') {
      textLines[y] =
        `${indent}<text x="${offsetX}" y="${posY}" xml:space="preserve">${escapeXml(result.lines[y])}</text>`;
      continue;
    }

    const glyphs = Array.from(result.lines[y]);
    let tspans = '';
    let runColor = '';
    let runText = '';

    const flushTspan = () => {
      if (!runText) return;
      if (!runColor) {
        tspans += escapeXml(runText);
      } else {
        tspans += `<tspan fill="rgb(${runColor})">${escapeXml(runText)}</tspan>`;
      }
      runText = '';
    };

    for (let x = 0; x < glyphs.length; x++) {
      const ch = glyphs[x];
      if (ch === ' ' || ch === '\u2800') {
        runText += ch;
        continue;
      }
      const idx = (y * result.cols + x) * 3;
      const colorKey = `${result.colors[idx]},${result.colors[idx + 1]},${result.colors[idx + 2]}`;
      if (colorKey !== runColor) {
        flushTspan();
        runColor = colorKey;
      }
      runText += ch;
    }
    flushTspan();

    textLines[y] =
      `${indent}<text x="${offsetX}" y="${posY}" xml:space="preserve">${tspans}</text>`;
  }

  return textLines.join('\n');
}

/**
 * Construye las reglas CSS @keyframes puras (sin JS) para animar N fotogramas
 * dentro de un SVG compatible con <img> y perfiles README de GitHub.
 */
export function buildSvgFrameAnimationCss(
  frames: readonly AnimatedAsciiFrame[]
): string {
  if (frames.length <= 1) return '';

  const delays = frames.map((f) => Math.max(20, Math.round(f.delayMs)));
  const totalMs = delays.reduce((sum, ms) => sum + ms, 0);
  const totalSec = (totalMs / 1000).toFixed(3);

  const rules: string[] = ['.af { opacity: 0; }'];
  let elapsed = 0;

  for (let i = 0; i < frames.length; i++) {
    const startPct = ((elapsed / totalMs) * 100).toFixed(3);
    elapsed += delays[i];
    const endPct = ((elapsed / totalMs) * 100).toFixed(3);

    if (i === 0) {
      rules.push(
        `@keyframes af${i} { 0% { opacity: 1; } ${endPct}%, 100% { opacity: 0; } }`
      );
    } else if (i === frames.length - 1) {
      rules.push(
        `@keyframes af${i} { 0% { opacity: 0; } ${startPct}% { opacity: 1; } 100% { opacity: 0; } }`
      );
    } else {
      rules.push(
        `@keyframes af${i} { 0% { opacity: 0; } ${startPct}% { opacity: 1; } ${endPct}%, 100% { opacity: 0; } }`
      );
    }
    rules.push(
      `.af-${i} { animation: af${i} ${totalSec}s steps(1, end) infinite; }`
    );
  }

  rules.push(
    '@media (prefers-reduced-motion: reduce) { .af { animation: none !important; opacity: 0; } .af-0 { opacity: 1; } }'
  );

  return rules.join('\n    ');
}

/**
 * Genera un gráfico vectorial SVG escalable manteniendo la grilla monoespaciada.
 */
export function toSvgDocument(
  result: AsciiResult,
  style: ExportStyleOptions
): string {
  const fontSize = style.fontSize ?? 14;
  const charAspect = style.charAspect ?? 0.58;
  const charWidth = fontSize * charAspect;
  const lineHeight = fontSize;
  const padding = 24;

  const width = Math.ceil(result.cols * charWidth + padding * 2);
  const height = Math.ceil(result.rows * lineHeight + padding * 2);
  const rowsXml = renderSvgTextRows(
    result,
    style.colorMode,
    padding,
    padding,
    fontSize,
    '    ',
    charAspect
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="${escapeXml(style.bgColor)}" />
  <g font-family="'JetBrains Mono', 'Fira Code', Consolas, 'Liberation Mono', monospace" font-size="${fontSize}px" fill="${escapeXml(style.fgColor)}" style="font-variant-ligatures: none; font-feature-settings: 'liga' 0, 'calt' 0; letter-spacing: 0; white-space: pre;">
${rowsXml}
  </g>
</svg>`;
}

/**
 * Genera un SVG animado con CSS @keyframes (sin JavaScript) a partir de una
 * secuencia de fotogramas ASCII (ideal para GIFs en README de GitHub).
 */
export function toAnimatedSvgDocument(
  frames: readonly AnimatedAsciiFrame[],
  style: ExportStyleOptions
): string {
  if (frames.length === 0) {
    throw new Error('Se requiere al menos un fotograma para exportar SVG animado.');
  }

  if (frames.length === 1) {
    return toSvgDocument(frames[0].result, style);
  }

  const first = frames[0].result;
  const fontSize = style.fontSize ?? 12;
  const charAspect = style.charAspect ?? 0.6;
  const charWidth = fontSize * charAspect;
  const lineHeight = fontSize;
  const padding = 20;

  const width = Math.ceil(first.cols * charWidth + padding * 2);
  const height = Math.ceil(first.rows * lineHeight + padding * 2);
  const animCss = buildSvgFrameAnimationCss(frames);

  const frameGroups = frames
    .map((frame, index) => {
      const rowsXml = renderSvgTextRows(
        frame.result,
        style.colorMode,
        padding,
        padding,
        fontSize,
        '      ',
        charAspect
      );
      return `    <g class="af af-${index}">\n${rowsXml}\n    </g>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    ${animCss}
  </style>
  <rect width="100%" height="100%" fill="${escapeXml(style.bgColor)}" />
  <g font-family="'JetBrains Mono', 'Fira Code', Consolas, 'Liberation Mono', monospace" font-size="${fontSize}px" fill="${escapeXml(style.fgColor)}" style="font-variant-ligatures: none; font-feature-settings: 'liga' 0, 'calt' 0; letter-spacing: 0; white-space: pre;">
${frameGroups}
  </g>
</svg>`;
}
