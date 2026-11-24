import {
  buildSvgFrameAnimationCss,
  escapeXml,
  renderSvgTextRows,
} from './formatters';
import type {
  AnimatedAsciiFrame,
  AsciiResult,
  ColorMode,
  GitHubProfileConfig,
  GitHubThemeId,
} from './types';

export interface GitHubThemePalette {
  id: GitHubThemeId;
  label: string;
  bg: string;
  surface: string;
  border: string;
  fg: string;
  muted: string;
  accent: string;
  keyColor: string;
  alphaBg: [number, number, number];
  isLight: boolean;
  swatches: readonly string[];
}

export const GITHUB_THEMES: Record<GitHubThemeId, GitHubThemePalette> = {
  'github-dark': {
    id: 'github-dark',
    label: 'GitHub Dark',
    bg: '#0d1117',
    surface: '#161b22',
    border: '#30363d',
    fg: '#e6edf3',
    muted: '#8b949e',
    accent: '#58a6ff',
    keyColor: '#79c0ff',
    alphaBg: [13, 17, 23],
    isLight: false,
    swatches: ['#ff7b72', '#ffa657', '#d29922', '#3fb950', '#58a6ff', '#bc8cff'],
  },
  'github-light': {
    id: 'github-light',
    label: 'GitHub Light',
    bg: '#ffffff',
    surface: '#f6f8fa',
    border: '#d0d7de',
    fg: '#1f2328',
    muted: '#656d76',
    accent: '#0969da',
    keyColor: '#0550ae',
    alphaBg: [255, 255, 255],
    isLight: true,
    swatches: ['#cf222e', '#bc4c00', '#9a6700', '#1a7f37', '#0969da', '#8250df'],
  },
  'tokyo-night': {
    id: 'tokyo-night',
    label: 'Tokyo Night',
    bg: '#1a1b26',
    surface: '#24283b',
    border: '#414868',
    fg: '#c0caf5',
    muted: '#7aa2f7',
    accent: '#bb9af7',
    keyColor: '#7dcfff',
    alphaBg: [26, 27, 38],
    isLight: false,
    swatches: ['#f7768e', '#ff9e64', '#e0af68', '#9ece6a', '#7aa2f7', '#bb9af7'],
  },
  catppuccin: {
    id: 'catppuccin',
    label: 'Catppuccin Mocha',
    bg: '#1e1e2e',
    surface: '#181825',
    border: '#313244',
    fg: '#cdd6f4',
    muted: '#a6adc8',
    accent: '#fab387',
    keyColor: '#89b4fa',
    alphaBg: [30, 30, 46],
    isLight: false,
    swatches: ['#f38ba8', '#fab387', '#f9e2af', '#a6e3a1', '#89b4fa', '#cba6f7'],
  },
  dracula: {
    id: 'dracula',
    label: 'Dracula',
    bg: '#282a36',
    surface: '#21222c',
    border: '#44475a',
    fg: '#f8f8f2',
    muted: '#6272a4',
    accent: '#ff79c6',
    keyColor: '#50fa7b',
    alphaBg: [40, 42, 54],
    isLight: false,
    swatches: ['#ff5555', '#ffb86c', '#f1fa8c', '#50fa7b', '#8be9fd', '#bd93f9'],
  },
};

export const DEFAULT_GITHUB_PROFILE: GitHubProfileConfig = {
  username: 'usuario',
  role: 'Ingeniero de Software & Open Source',
  bio: 'Construyendo herramientas rápidas, interfaces limpias y sistemas escalables.',
  statsText: [
    'Stack: TypeScript · React · Rust',
    'OS: Linux / Terminal-first',
    'Repos: 42 públicos',
    'Enfoque: Producto & DX',
    'Web: github.com/usuario',
  ].join('\n'),
  themeId: 'github-dark',
  showWindowBar: true,
};

export interface ParsedStatLine {
  key: string;
  value: string;
}

export function parseProfileStats(statsText: string): ParsedStatLine[] {
  return statsText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const sepIdx = line.indexOf(':');
      if (sepIdx <= 0) {
        return { key: '•', value: line };
      }
      return {
        key: line.slice(0, sepIdx).trim(),
        value: line.slice(sepIdx + 1).trim(),
      };
    });
}

function wrapText(text: string, maxChars: number): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const words = normalized.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (!current) {
      current = word;
    } else if (current.length + 1 + word.length <= maxChars) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines.slice(0, 4);
}

/**
 * Genera una tarjeta SVG completa estilo perfil de GitHub (neofetch / README.md)
 * con el arte ASCII (estático o GIF animado con CSS @keyframes) a la izquierda
 * y el perfil, bio y estadísticas a la derecha.
 */
export function toGitHubProfileSvg(
  frames: readonly AnimatedAsciiFrame[],
  profile: GitHubProfileConfig,
  options: {
    colorMode: ColorMode;
    charAspect?: number;
    fontSize?: number;
  }
): string {
  if (frames.length === 0) {
    throw new Error('Se requiere al menos un fotograma para generar la tarjeta GitHub.');
  }

  const theme = GITHUB_THEMES[profile.themeId];
  const first = frames[0].result;
  const charAspect = options.charAspect ?? 0.6;
  const fontSize = options.fontSize ?? (first.cols > 80 ? 8.5 : 10.5);
  const charWidth = fontSize * charAspect;
  const lineHeight = fontSize;

  const padX = 24;
  const padY = 22;
  const headerH = profile.showWindowBar ? 36 : 0;
  const asciiW = Math.ceil(first.cols * charWidth);
  const asciiH = Math.ceil(first.rows * lineHeight);

  const dividerGap = 24;
  const infoColW = 340;
  const totalW = Math.max(660, padX + asciiW + dividerGap * 2 + infoColW + padX);

  const bioLines = wrapText(profile.bio, 42);
  const stats = parseProfileStats(profile.statsText).slice(0, 10);
  const infoContentH =
    56 + bioLines.length * 18 + (bioLines.length > 0 ? 14 : 0) + stats.length * 22 + 34;

  const bodyH = Math.max(asciiH, infoContentH);
  const totalH = headerH + padY + bodyH + padY;

  const asciiOffsetX = padX;
  const asciiOffsetY = headerH + padY + Math.floor((bodyH - asciiH) / 2);
  const dividerX = padX + asciiW + dividerGap;
  const infoX = dividerX + dividerGap;
  const cleanUser = profile.username.trim().replace(/^@+/, '') || 'usuario';

  const isAnimated = frames.length > 1;
  const animCss = isAnimated ? buildSvgFrameAnimationCss(frames) : '';

  const asciiXml = isAnimated
    ? frames
        .map((frame, index) => {
          const rows = renderSvgTextRows(
            frame.result,
            options.colorMode,
            asciiOffsetX,
            asciiOffsetY,
            fontSize,
            '      ',
            charAspect
          );
          return `    <g class="af af-${index}">\n${rows}\n    </g>`;
        })
        .join('\n')
    : renderSvgTextRows(
        first,
        options.colorMode,
        asciiOffsetX,
        asciiOffsetY,
        fontSize,
        '    ',
        charAspect
      );

  const windowBarXml = profile.showWindowBar
    ? `  <path d="M12 0 H${totalW - 12} A12 12 0 0 1 ${totalW} 12 V${headerH} H0 V12 A12 12 0 0 1 12 0 Z" fill="${theme.surface}" />
  <line x1="0" y1="${headerH}" x2="${totalW}" y2="${headerH}" stroke="${theme.border}" stroke-width="1" />
  <circle cx="20" cy="18" r="5" fill="#ff5f56" />
  <circle cx="36" cy="18" r="5" fill="#ffbd2e" />
  <circle cx="52" cy="18" r="5" fill="#27c93f" />
  <text x="${Math.round(totalW / 2)}" y="22" text-anchor="middle" font-family="'JetBrains Mono', Consolas, monospace" font-size="11.5" fill="${theme.muted}">${escapeXml(cleanUser)}@github — ~/README.md${isAnimated ? ` · ${frames.length}f` : ''}</text>`
    : '';

  let cursorY = headerH + padY + 18;
  const rightElements: string[] = [];

  rightElements.push(
    `  <text x="${infoX}" y="${cursorY}" font-family="'JetBrains Mono', Consolas, monospace" font-size="17" font-weight="700" fill="${theme.accent}">@${escapeXml(cleanUser)}</text>`
  );
  cursorY += 20;

  if (profile.role.trim()) {
    rightElements.push(
      `  <text x="${infoX}" y="${cursorY}" font-family="'Inter', -apple-system, sans-serif" font-size="12.5" font-weight="500" fill="${theme.muted}">${escapeXml(profile.role.trim())}</text>`
    );
    cursorY += 16;
  }

  rightElements.push(
    `  <line x1="${infoX}" y1="${cursorY}" x2="${totalW - padX}" y2="${cursorY}" stroke="${theme.border}" stroke-width="1" />`
  );
  cursorY += 20;

  for (const line of bioLines) {
    rightElements.push(
      `  <text x="${infoX}" y="${cursorY}" font-family="'Inter', -apple-system, sans-serif" font-size="12" fill="${theme.fg}">${escapeXml(line)}</text>`
    );
    cursorY += 18;
  }

  if (bioLines.length > 0) {
    cursorY += 10;
  }

  for (const stat of stats) {
    rightElements.push(
      `  <text x="${infoX}" y="${cursorY}" font-family="'JetBrains Mono', Consolas, monospace" font-size="11.5"><tspan fill="${theme.keyColor}" font-weight="700">${escapeXml(stat.key)}:</tspan> <tspan fill="${theme.fg}">${escapeXml(stat.value)}</tspan></text>`
    );
    cursorY += 22;
  }

  const swatchesY = Math.max(cursorY + 10, totalH - padY - 14);
  const swatchesXml = theme.swatches
    .map(
      (hex, idx) =>
        `  <rect x="${infoX + idx * 24}" y="${swatchesY}" width="18" height="9" rx="2.5" fill="${hex}" />`
    )
    .join('\n');

  const styleBlock = animCss ? `\n  <style>\n    ${animCss}\n  </style>` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">${styleBlock}
  <rect x="0.5" y="0.5" width="${totalW - 1}" height="${totalH - 1}" rx="12" fill="${theme.bg}" stroke="${theme.border}" stroke-width="1" />
${windowBarXml}
  <g font-family="'JetBrains Mono', 'Fira Code', Consolas, 'Liberation Mono', monospace" font-size="${fontSize}px" fill="${theme.fg}" style="font-variant-ligatures: none; font-feature-settings: 'liga' 0, 'calt' 0; letter-spacing: 0; white-space: pre;">
${asciiXml}
  </g>
  <line x1="${dividerX}" y1="${headerH + padY}" x2="${dividerX}" y2="${totalH - padY}" stroke="${theme.border}" stroke-width="1" />
${rightElements.join('\n')}
${swatchesXml}
</svg>`;
}

/**
 * Genera fragmentos Markdown listos para pegar en `[usuario]/[usuario]/README.md`.
 */
export function toGitHubReadmeMarkdown(
  result: AsciiResult,
  profile: GitHubProfileConfig,
  variant: 'svg-embed' | 'inline-table',
  svgFilename = 'ascii-profile.svg'
): string {
  const cleanUser = profile.username.trim().replace(/^@+/, '') || 'usuario';

  if (variant === 'svg-embed') {
    return `<!-- Sube ${svgFilename} a la raíz de tu repo ${cleanUser}/${cleanUser} -->
<p align="center">
  <img src="./${svgFilename}" alt="Perfil ASCII de @${cleanUser}" width="100%" />
</p>`;
  }

  const stats = parseProfileStats(profile.statsText);
  const statsMd = stats
    .map((s) => `- **${s.key}:** ${s.value}`)
    .join('\n');

  const escapedAscii = result.plainText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return `<table width="100%">
  <tr>
    <td valign="top" width="52%">
<pre>
${escapedAscii}
</pre>
    </td>
    <td valign="top" width="48%">

### @${cleanUser}
${profile.role.trim() ? `> ${profile.role.trim()}\n` : ''}
${profile.bio.trim()}

${statsMd}

    </td>
  </tr>
</table>`;
}
