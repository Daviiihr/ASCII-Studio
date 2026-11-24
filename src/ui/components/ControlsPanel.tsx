import React from 'react';
import { GITHUB_THEMES } from '../../core/githubCard';
import { RAMP_OPTIONS, resolveRampChars } from '../../core/ramps';
import type {
  ColorMode,
  GitHubProfileConfig,
  GitHubThemeId,
  MonoTheme,
  RampId,
  StudioMode,
} from '../../core/types';
import { MONO_THEMES } from '../../io/canvasRenderer';
import { PauseIcon, PlayIcon, ResetIcon } from './Icons';

export interface StudioSettings {
  cols: number;
  rampId: RampId;
  customRamp: string;
  invert: boolean;
  brightness: number;
  contrast: number;
  charAspect: number;
  colorMode: ColorMode;
  monoTheme: MonoTheme;
  gifMaxFrames: number;
  gifSpeed: number;
}

interface ControlsPanelProps {
  studioMode: StudioMode;
  settings: StudioSettings;
  githubProfile: GitHubProfileConfig;
  measuredAspect: number;
  isAnimated: boolean;
  frameCount: number;
  activeFrameIdx: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onChange: <K extends keyof StudioSettings>(
    key: K,
    value: StudioSettings[K]
  ) => void;
  onChangeGitHub: <K extends keyof GitHubProfileConfig>(
    key: K,
    value: GitHubProfileConfig[K]
  ) => void;
  onResetTones: () => void;
  onResetAspect: () => void;
}

const WIDTH_PRESETS = [60, 100, 150, 220] as const;
const GITHUB_WIDTH_PRESETS = [42, 56, 68, 84] as const;
const GIF_FRAME_LIMITS = [8, 12, 16, 24, 32] as const;
const GIF_SPEEDS = [0.5, 1, 1.5, 2] as const;

function rangeProgressStyle(
  value: number,
  min: number,
  max: number
): React.CSSProperties {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  return { '--range-progress': `${pct}%` } as React.CSSProperties;
}

export const ControlsPanel: React.FC<ControlsPanelProps> = ({
  studioMode,
  settings,
  githubProfile,
  measuredAspect,
  isAnimated,
  frameCount,
  activeFrameIdx,
  isPlaying,
  onTogglePlay,
  onChange,
  onChangeGitHub,
  onResetTones,
  onResetAspect,
}) => {
  const activeRampMeta = RAMP_OPTIONS.find((r) => r.id === settings.rampId);
  const rampPreview =
    settings.rampId === 'braille'
      ? '⠀ ⠁ ⠃ ⠇ ⠏ ⠟ ⠿ ⡿ ⣿'
      : resolveRampChars(settings.rampId, settings.customRamp)
          .slice(0, 24)
          .join('');

  const hasToneChanges =
    settings.brightness !== 0 || settings.contrast !== 0 || settings.invert;
  const presets =
    studioMode === 'github' ? GITHUB_WIDTH_PRESETS : WIDTH_PRESETS;

  return (
    <aside className="controls-panel" aria-label="Controles de conversión">
      {studioMode === 'github' && (
        <section className="control-section">
          <div className="section-header">
            <h2>Perfil GitHub (README.md)</h2>
          </div>

          <div className="slider-field">
            <label className="field-label" htmlFor="gh-theme-select">
              Tema de tarjeta
            </label>
            <select
              id="gh-theme-select"
              className="select-input"
              value={githubProfile.themeId}
              onChange={(e) =>
                onChangeGitHub('themeId', e.target.value as GitHubThemeId)
              }
            >
              {Object.values(GITHUB_THEMES).map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.label}
                </option>
              ))}
            </select>
          </div>

          <div className="slider-field">
            <label className="field-label" htmlFor="gh-username">
              Usuario
            </label>
            <input
              id="gh-username"
              type="text"
              className="text-input mono-input"
              spellCheck={false}
              value={githubProfile.username}
              placeholder="tu-usuario"
              onChange={(e) => onChangeGitHub('username', e.target.value)}
            />
          </div>

          <div className="slider-field">
            <label className="field-label" htmlFor="gh-role">
              Rol / Subtítulo
            </label>
            <input
              id="gh-role"
              type="text"
              className="text-input"
              value={githubProfile.role}
              placeholder="Ingeniero de Software"
              onChange={(e) => onChangeGitHub('role', e.target.value)}
            />
          </div>

          <div className="slider-field">
            <label className="field-label" htmlFor="gh-bio">
              Descripción breve
            </label>
            <textarea
              id="gh-bio"
              rows={3}
              className="textarea-input"
              value={githubProfile.bio}
              onChange={(e) => onChangeGitHub('bio', e.target.value)}
            />
          </div>

          <div className="slider-field">
            <label className="field-label" htmlFor="gh-stats">
              Estadísticas (Clave: Valor)
            </label>
            <textarea
              id="gh-stats"
              rows={6}
              spellCheck={false}
              className="textarea-input mono-input textarea-nowrap"
              value={githubProfile.statsText}
              onChange={(e) => onChangeGitHub('statsText', e.target.value)}
            />
          </div>

          <label className="toggle-row" htmlFor="gh-window-bar">
            <span className="toggle-label">Barra de ventana terminal</span>
            <span className="switch-control">
              <input
                id="gh-window-bar"
                type="checkbox"
                role="switch"
                checked={githubProfile.showWindowBar}
                onChange={(e) =>
                  onChangeGitHub('showWindowBar', e.target.checked)
                }
              />
              <span className="switch-track" aria-hidden="true">
                <span className="switch-thumb" />
              </span>
            </span>
          </label>
        </section>
      )}

      {isAnimated && (
        <section className="control-section">
          <div className="section-header">
            <h2>Animación GIF → SVG</h2>
            <span className="value-readout">
              {activeFrameIdx + 1}/{Math.max(1, frameCount)}
            </span>
          </div>

          <div className="gif-transport-row">
            <button
              type="button"
              className="btn-secondary"
              onClick={onTogglePlay}
            >
              {isPlaying ? <PauseIcon size={12} /> : <PlayIcon size={12} />}
              <span>{isPlaying ? 'Pausar' : 'Reproducir'}</span>
            </button>
            <span className="helper-text">CSS @keyframes puro (sin JS)</span>
          </div>

          <div className="slider-field">
            <div className="field-row">
              <span className="field-label">Máx. fotogramas</span>
              <span className="value-readout">{settings.gifMaxFrames}f</span>
            </div>
            <div className="preset-row preset-row-5" role="group" aria-label="Límite de fotogramas">
              {GIF_FRAME_LIMITS.map((limit) => (
                <button
                  key={limit}
                  type="button"
                  className={`btn-mini ${settings.gifMaxFrames === limit ? 'is-active' : ''}`}
                  aria-pressed={settings.gifMaxFrames === limit}
                  onClick={() => onChange('gifMaxFrames', limit)}
                >
                  {limit}
                </button>
              ))}
            </div>
          </div>

          <div className="slider-field">
            <div className="field-row">
              <span className="field-label">Velocidad</span>
              <span className="value-readout">{settings.gifSpeed}×</span>
            </div>
            <div className="preset-row" role="group" aria-label="Velocidad de animación">
              {GIF_SPEEDS.map((spd) => (
                <button
                  key={spd}
                  type="button"
                  className={`btn-mini ${settings.gifSpeed === spd ? 'is-active' : ''}`}
                  aria-pressed={settings.gifSpeed === spd}
                  onClick={() => onChange('gifSpeed', spd)}
                >
                  {spd}×
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="control-section">
        <div className="section-header">
          <h2>Resolución</h2>
          <span className="value-readout">{settings.cols} cols</span>
        </div>

        <label className="sr-only" htmlFor="cols-slider">
          Ancho en caracteres
        </label>
        <input
          id="cols-slider"
          type="range"
          className="studio-range"
          min={20}
          max={300}
          step={2}
          value={settings.cols}
          style={rangeProgressStyle(settings.cols, 20, 300)}
          onChange={(e) => onChange('cols', Number(e.target.value))}
        />

        <div className="preset-row" role="group" aria-label="Anchos predefinidos">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`btn-mini ${settings.cols === preset ? 'is-active' : ''}`}
              aria-pressed={settings.cols === preset}
              onClick={() => onChange('cols', preset)}
            >
              {preset}
            </button>
          ))}
        </div>
      </section>

      <section className="control-section">
        <div className="section-header">
          <h2>Rampa de caracteres</h2>
        </div>

        <label className="sr-only" htmlFor="ramp-select">
          Seleccionar rampa de caracteres
        </label>
        <select
          id="ramp-select"
          className="select-input"
          value={settings.rampId}
          onChange={(e) => onChange('rampId', e.target.value as RampId)}
        >
          {RAMP_OPTIONS.map((ramp) => (
            <option key={ramp.id} value={ramp.id}>
              {ramp.label}
            </option>
          ))}
        </select>

        <div className="ramp-preview-strip" title="Vista previa de glifos">
          {rampPreview}
        </div>

        {activeRampMeta && (
          <p className="helper-text">{activeRampMeta.description}</p>
        )}

        {settings.rampId === 'custom' && (
          <div className="custom-ramp-box">
            <label htmlFor="custom-ramp-input">
              Secuencia (oscuro a claro, mín. 2 glifos)
            </label>
            <input
              id="custom-ramp-input"
              type="text"
              className="text-input mono-input"
              value={settings.customRamp}
              placeholder=" .:-=+*#%@"
              onChange={(e) => onChange('customRamp', e.target.value)}
            />
          </div>
        )}
      </section>

      <section className="control-section">
        <div className="section-header">
          <h2>Tono y luminancia</h2>
          <button
            type="button"
            className="btn-link"
            disabled={!hasToneChanges}
            onClick={onResetTones}
          >
            <ResetIcon size={12} />
            <span>Restablecer</span>
          </button>
        </div>

        <div className="slider-field">
          <div className="field-row">
            <label htmlFor="brightness-slider">Brillo</label>
            <span className="value-readout">
              {settings.brightness > 0
                ? `+${settings.brightness}`
                : settings.brightness}
            </span>
          </div>
          <input
            id="brightness-slider"
            type="range"
            className="studio-range"
            min={-100}
            max={100}
            step={1}
            value={settings.brightness}
            style={rangeProgressStyle(settings.brightness, -100, 100)}
            onChange={(e) => onChange('brightness', Number(e.target.value))}
          />
        </div>

        <div className="slider-field">
          <div className="field-row">
            <label htmlFor="contrast-slider">Contraste</label>
            <span className="value-readout">
              {settings.contrast > 0
                ? `+${settings.contrast}`
                : settings.contrast}
            </span>
          </div>
          <input
            id="contrast-slider"
            type="range"
            className="studio-range"
            min={-100}
            max={100}
            step={1}
            value={settings.contrast}
            style={rangeProgressStyle(settings.contrast, -100, 100)}
            onChange={(e) => onChange('contrast', Number(e.target.value))}
          />
        </div>

        <label className="toggle-row" htmlFor="invert-toggle">
          <span className="toggle-label">Invertir luminancia</span>
          <span className="switch-control">
            <input
              id="invert-toggle"
              type="checkbox"
              role="switch"
              checked={settings.invert}
              onChange={(e) => onChange('invert', e.target.checked)}
            />
            <span className="switch-track" aria-hidden="true">
              <span className="switch-thumb" />
            </span>
          </span>
        </label>
      </section>

      <section className="control-section">
        <div className="section-header">
          <h2>Color y tema</h2>
        </div>

        <div className="segmented-control" role="group" aria-label="Modo de color">
          <button
            type="button"
            className={settings.colorMode === 'mono' ? 'is-active' : ''}
            aria-pressed={settings.colorMode === 'mono'}
            onClick={() => onChange('colorMode', 'mono')}
          >
            Monocromo
          </button>
          <button
            type="button"
            className={settings.colorMode === 'color' ? 'is-active' : ''}
            aria-pressed={settings.colorMode === 'color'}
            onClick={() => onChange('colorMode', 'color')}
          >
            Color RGB
          </button>
        </div>

        {studioMode === 'studio' && settings.colorMode === 'mono' ? (
          <div className="theme-grid" role="group" aria-label="Paleta monocromo">
            {Object.values(MONO_THEMES).map((theme) => (
              <button
                key={theme.id}
                type="button"
                className={`theme-swatch ${
                  settings.monoTheme === theme.id ? 'is-active' : ''
                }`}
                aria-pressed={settings.monoTheme === theme.id}
                onClick={() => onChange('monoTheme', theme.id)}
              >
                <span
                  className="swatch-dot"
                  style={{ backgroundColor: theme.bg, color: theme.fg }}
                >
                  A
                </span>
                <span>{theme.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="helper-text">
            {studioMode === 'github'
              ? 'Usa la paleta del tema de GitHub seleccionado arriba.'
              : 'Renderizado TrueColor por celda sobre lienzo oscuro de alto contraste.'}
          </p>
        )}
      </section>

      <section className="control-section">
        <div className="section-header">
          <h2>Calibración de glifo</h2>
          <button
            type="button"
            className="btn-link"
            onClick={onResetAspect}
          >
            Auto ({measuredAspect.toFixed(2)})
          </button>
        </div>

        <div className="slider-field">
          <div className="field-row">
            <label htmlFor="aspect-slider">Factor de aspecto</label>
            <span className="value-readout">{settings.charAspect.toFixed(2)}</span>
          </div>
          <input
            id="aspect-slider"
            type="range"
            className="studio-range"
            min={0.4}
            max={0.75}
            step={0.01}
            value={settings.charAspect}
            style={rangeProgressStyle(settings.charAspect, 0.4, 0.75)}
            onChange={(e) => onChange('charAspect', Number(e.target.value))}
          />
          <p className="helper-text">
            Compensa la proporción vertical de los caracteres monoespaciados.
          </p>
        </div>
      </section>
    </aside>
  );
};
