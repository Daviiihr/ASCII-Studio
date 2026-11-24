import type { RampDefinition, RampId } from './types';

/**
 * Registro extensible de rampas de caracteres.
 * Convención: índice 0 = menor densidad de tinta (' '), último índice = mayor densidad.
 */
export const RAMP_REGISTRY: Record<
  Exclude<RampId, 'braille' | 'custom'>,
  RampDefinition
> = {
  standard: {
    id: 'standard',
    label: 'Estándar (10 niveles)',
    description: 'Balance clásico y legible para cualquier imagen.',
    chars: ' .:-=+*#%@',
  },
  detailed: {
    id: 'detailed',
    label: 'Detallada (70 niveles)',
    description: 'Gradación fina de Paul Bourke para retratos y texturas.',
    chars:
      " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
  },
  blocks: {
    id: 'blocks',
    label: 'Bloques Unicode',
    description: 'Sombras sólidas con caracteres de bloque medio y completo.',
    chars: ' ░▒▓█',
  },
  minimal: {
    id: 'minimal',
    label: 'Minimalista (5 niveles)',
    description: 'Alto contraste y estética geométrica limpia.',
    chars: ' .+#@',
  },
};

export const RAMP_OPTIONS: readonly RampDefinition[] = [
  RAMP_REGISTRY.standard,
  RAMP_REGISTRY.detailed,
  RAMP_REGISTRY.blocks,
  {
    id: 'braille',
    label: 'Braille 2×4 HD',
    description: 'Submuestreo 8 puntos por carácter con dithering ordenado.',
    chars: '⠀⣿',
  },
  RAMP_REGISTRY.minimal,
  {
    id: 'custom',
    label: 'Personalizada',
    description: 'Define tu propia secuencia de caracteres de oscuro a claro.',
    chars: RAMP_REGISTRY.standard.chars,
  },
];

/**
 * Resuelve el arreglo de caracteres Unicode (soporta pares subrogados).
 * Elimina caracteres de control (saltos de línea, tabuladores, NUL) y, si la
 * rampa personalizada tiene menos de 2 símbolos, usa la estándar como respaldo.
 */
export function resolveRampChars(rampId: RampId, customRamp: string): string[] {
  if (rampId === 'custom') {
    const sanitized = customRamp.replace(/[\u0000-\u001f\u007f]/g, '');
    const customGlyphs = Array.from(sanitized);
    if (customGlyphs.length >= 2) {
      return customGlyphs;
    }
    return Array.from(RAMP_REGISTRY.standard.chars);
  }

  if (rampId === 'braille') {
    return ['⠀', '⣿'];
  }

  return Array.from(RAMP_REGISTRY[rampId].chars);
}
