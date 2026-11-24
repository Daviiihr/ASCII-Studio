/**
 * Tipos de dominio puros para el motor de conversión a ASCII art.
 * Este módulo no tiene dependencias del DOM, navegador ni frameworks de UI.
 */

export interface RawImageBuffer {
  width: number;
  height: number;
  /** Píxeles RGBA en orden lineal (4 bytes por píxel). */
  data: Uint8ClampedArray;
}

export type RampId =
  | 'standard'
  | 'detailed'
  | 'blocks'
  | 'minimal'
  | 'braille'
  | 'custom';

export type ColorMode = 'mono' | 'color';

export type MonoTheme =
  | 'light-on-dark'
  | 'matrix'
  | 'amber'
  | 'dark-on-light';

export interface RampDefinition {
  id: RampId;
  label: string;
  description: string;
  /** Caracteres ordenados de menor densidad visual (espacio) a mayor densidad. */
  chars: string;
}

export interface ConversionOptions {
  /** Ancho de salida en caracteres (columnas). */
  cols: number;
  /** Identificador de rampa o modo Braille. */
  rampId: RampId;
  /** Rampa personalizada cuando rampId === 'custom'. */
  customRamp: string;
  /** Invierte el mapeo de luminancia (útil para fondos claros o negativo artístico). */
  invert: boolean;
  /** Ajuste de brillo en el rango [-100, 100]. */
  brightness: number;
  /** Ajuste de contraste en el rango [-100, 100]. */
  contrast: number;
  /**
   * Factor de aspecto de un carácter monoespaciado (ancho / alto).
   * Típicamente ~0.5 - 0.6 porque un glifo es casi el doble de alto que ancho.
   */
  charAspect: number;
  /** Modo monocromo o color RGB por celda. */
  colorMode: ColorMode;
  /** Color de fondo RGB para componer píxeles con transparencia alfa. */
  alphaBg: [number, number, number];
}

export interface AsciiResult {
  cols: number;
  rows: number;
  lines: string[];
  plainText: string;
  /** Buffer compacto [R, G, B, ...] de tamaño cols * rows * 3. */
  colors: Uint8Array;
  colorMode: ColorMode;
  durationMs: number;
}

export interface ExportStyleOptions {
  bgColor: string;
  fgColor: string;
  colorMode: ColorMode;
  fontSize?: number;
  charAspect?: number;
}

export interface AnimatedAsciiFrame {
  result: AsciiResult;
  /** Duración del fotograma en milisegundos. */
  delayMs: number;
}

export type StudioMode = 'studio' | 'github';

export type GitHubThemeId =
  | 'github-dark'
  | 'github-light'
  | 'tokyo-night'
  | 'catppuccin'
  | 'dracula';

export interface GitHubProfileConfig {
  username: string;
  role: string;
  bio: string;
  /** Líneas con formato "Clave: Valor" mostradas junto al arte ASCII. */
  statsText: string;
  themeId: GitHubThemeId;
  showWindowBar: boolean;
}

