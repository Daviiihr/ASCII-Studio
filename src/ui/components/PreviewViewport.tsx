import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toGitHubReadmeMarkdown } from '../../core/githubCard';
import { clamp } from '../../core/luminance';
import type {
  AsciiResult,
  GitHubProfileConfig,
  StudioMode,
} from '../../core/types';
import { renderAsciiToCanvas } from '../../io/canvasRenderer';
import { STUDIO_MONO_FONT } from '../../io/fontMetrics';
import { GitHubPreviewCard } from './GitHubPreviewCard';
import {
  CanvasViewIcon,
  CloseIcon,
  CodeTextIcon,
  FitScreenIcon,
  GitHubCardIcon,
  ImageRefIcon,
  PauseIcon,
  PlayIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from './Icons';

export type ViewRenderMode = 'canvas' | 'text';
export type GitHubViewMode = 'card' | 'markdown';

interface PreviewViewportProps {
  studioMode: StudioMode;
  result: AsciiResult | null;
  frameCount: number;
  activeFrameIdx: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  bgColor: string;
  fgColor: string;
  charAspect: number;
  previewImageUrl: string | null;
  imageName: string;
  githubProfile: GitHubProfileConfig;
  githubSvgFilename: string;
}

interface TextRun {
  color: string | null;
  text: string;
}

export const PreviewViewport: React.FC<PreviewViewportProps> = ({
  studioMode,
  result,
  frameCount,
  activeFrameIdx,
  isPlaying,
  onTogglePlay,
  bgColor,
  fgColor,
  charAspect,
  previewImageUrl,
  imageName,
  githubProfile,
  githubSvgFilename,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [renderMode, setRenderMode] = useState<ViewRenderMode>('canvas');
  const [githubViewMode, setGithubViewMode] = useState<GitHubViewMode>('card');
  const [zoomMode, setZoomMode] = useState<'fit' | 'manual'>('fit');
  const [manualZoom, setManualZoom] = useState(1);
  const [showOriginal, setShowOriginal] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [fontReadyTick, setFontReadyTick] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts?.ready) return;
    let active = true;
    void document.fonts.ready.then(() => {
      if (active) {
        setFontReadyTick((v) => v + 1);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const effectiveFontSize = useMemo(() => {
    if (!result) return 12;
    if (zoomMode === 'manual') {
      return clamp(Math.round(12 * manualZoom * 10) / 10, 4, 28);
    }

    const pad = 72;
    const availW = Math.max(120, containerSize.width - pad);
    const availH = Math.max(120, containerSize.height - pad);
    const hasBraille = result.lines.some((line) => /[\u2800-\u28ff]/.test(line));
    const fitAspect =
      renderMode === 'text' && hasBraille
        ? Math.max(charAspect, 0.85)
        : charAspect;

    const byWidth = availW / (result.cols * Math.max(0.35, fitAspect));
    const byHeight = availH / result.rows;
    return clamp(Math.floor(Math.min(byWidth, byHeight) * 10) / 10, 4, 22);
  }, [result, zoomMode, manualZoom, containerSize, charAspect, renderMode]);

  useEffect(() => {
    if (
      studioMode !== 'studio' ||
      renderMode !== 'canvas' ||
      !result ||
      !canvasRef.current
    ) {
      return;
    }
    renderAsciiToCanvas(canvasRef.current, result, {
      bgColor,
      fgColor,
      fontSizePx: effectiveFontSize,
      fontFamily: STUDIO_MONO_FONT,
      paddingPx: 18,
    });
  }, [
    studioMode,
    renderMode,
    result,
    bgColor,
    fgColor,
    effectiveFontSize,
    fontReadyTick,
  ]);

  const coloredLines = useMemo(() => {
    if (
      studioMode !== 'studio' ||
      renderMode !== 'text' ||
      !result ||
      result.colorMode !== 'color'
    ) {
      return null;
    }

    return result.lines.map((line, y) => {
      const glyphs = Array.from(line);
      const runs: TextRun[] = [];
      let currentColor: string | null = null;
      let currentText = '';

      for (let x = 0; x < glyphs.length; x++) {
        const ch = glyphs[x];
        if (ch === ' ' || ch === '\u2800') {
          currentText += ch;
          continue;
        }

        const idx = (y * result.cols + x) * 3;
        const colorKey = `rgb(${result.colors[idx]},${result.colors[idx + 1]},${result.colors[idx + 2]})`;
        if (colorKey !== currentColor) {
          if (currentText) {
            runs.push({ color: currentColor, text: currentText });
          }
          currentColor = colorKey;
          currentText = ch;
        } else {
          currentText += ch;
        }
      }
      if (currentText) {
        runs.push({ color: currentColor, text: currentText });
      }
      return runs;
    });
  }, [studioMode, renderMode, result]);

  const markdownPreview = useMemo(() => {
    if (studioMode !== 'github' || githubViewMode !== 'markdown' || !result) {
      return '';
    }
    const embed = toGitHubReadmeMarkdown(
      result,
      githubProfile,
      'svg-embed',
      githubSvgFilename
    );
    const table = toGitHubReadmeMarkdown(result, githubProfile, 'inline-table');
    return `## Opción 1 — Tarjeta SVG${frameCount > 1 ? ' animada (GIF)' : ''} (Recomendada)\n\n${embed}\n\n---\n\n## Opción 2 — Tabla Markdown + <pre> (sin archivos externos)\n\n${table}`;
  }, [
    studioMode,
    githubViewMode,
    result,
    githubProfile,
    githubSvgFilename,
    frameCount,
  ]);

  const zoomPercent = Math.round((effectiveFontSize / 12) * 100);
  const isLightSurface =
    bgColor.toLowerCase() === '#f8fafc' || bgColor.toLowerCase() === '#ffffff';

  const stepZoom = (delta: number) => {
    const base = zoomMode === 'fit' ? effectiveFontSize / 12 : manualZoom;
    setZoomMode('manual');
    setManualZoom(clamp(Number((base + delta).toFixed(2)), 0.35, 2.4));
  };

  const githubFontSize = result
    ? clamp(result.cols > 80 ? 8.5 : 10.5, 6, 11)
    : 10;

  return (
    <section className="preview-stage" aria-label="Lienzo de previsualización">
      <div className="viewport-toolbar">
        {studioMode === 'studio' ? (
          <div className="segmented-control" role="group" aria-label="Motor de vista previa">
            <button
              type="button"
              className={renderMode === 'canvas' ? 'is-active' : ''}
              aria-pressed={renderMode === 'canvas'}
              onClick={() => setRenderMode('canvas')}
            >
              <CanvasViewIcon size={13} />
              <span>Canvas 60fps</span>
            </button>
            <button
              type="button"
              className={renderMode === 'text' ? 'is-active' : ''}
              aria-pressed={renderMode === 'text'}
              onClick={() => setRenderMode('text')}
            >
              <CodeTextIcon size={13} />
              <span>Texto &lt;pre&gt;</span>
            </button>
          </div>
        ) : (
          <div className="segmented-control" role="group" aria-label="Vista de perfil GitHub">
            <button
              type="button"
              className={githubViewMode === 'card' ? 'is-active' : ''}
              aria-pressed={githubViewMode === 'card'}
              onClick={() => setGithubViewMode('card')}
            >
              <GitHubCardIcon size={13} />
              <span>Tarjeta README</span>
            </button>
            <button
              type="button"
              className={githubViewMode === 'markdown' ? 'is-active' : ''}
              aria-pressed={githubViewMode === 'markdown'}
              onClick={() => setGithubViewMode('markdown')}
            >
              <CodeTextIcon size={13} />
              <span>Markdown</span>
            </button>
          </div>
        )}

        <div className="viewport-center-tools">
          {frameCount > 1 && (
            <button
              type="button"
              className="btn-secondary"
              onClick={onTogglePlay}
            >
              {isPlaying ? <PauseIcon size={12} /> : <PlayIcon size={12} />}
              <span className="tabular-nums">
                {activeFrameIdx + 1}/{frameCount}
              </span>
            </button>
          )}

          {studioMode === 'studio' && (
            <div className="zoom-controls" role="group" aria-label="Controles de zoom">
              <button
                type="button"
                className="btn-icon"
                aria-label="Alejar"
                onClick={() => stepZoom(-0.15)}
              >
                <ZoomOutIcon size={13} />
              </button>
              <span className="zoom-readout">{zoomPercent}%</span>
              <button
                type="button"
                className="btn-icon"
                aria-label="Acercar"
                onClick={() => stepZoom(0.15)}
              >
                <ZoomInIcon size={13} />
              </button>
              <button
                type="button"
                className={`btn-mini ${zoomMode === 'fit' ? 'is-active' : ''}`}
                aria-pressed={zoomMode === 'fit'}
                onClick={() => setZoomMode('fit')}
              >
                <FitScreenIcon size={12} />
                <span>Ajustar</span>
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          className={`btn-secondary ${showOriginal ? 'is-active' : ''}`}
          aria-pressed={showOriginal}
          onClick={() => setShowOriginal((prev) => !prev)}
        >
          <ImageRefIcon size={13} />
          <span>{showOriginal ? 'Ocultar original' : 'Ver original'}</span>
        </button>
      </div>

      <div
        ref={containerRef}
        className={`viewport-canvas-area ${
          studioMode === 'studio' && isLightSurface ? 'is-light-surface' : ''
        }`}
        style={{
          backgroundColor: studioMode === 'studio' ? bgColor : undefined,
        }}
      >
        {!result ? (
          <div className="empty-state">Cargando imagen…</div>
        ) : studioMode === 'github' ? (
          githubViewMode === 'card' ? (
            <div className="gh-stage-wrapper">
              <GitHubPreviewCard
                result={result}
                frameCount={frameCount}
                profile={githubProfile}
                fontSizePx={githubFontSize}
              />
            </div>
          ) : (
            <pre className="markdown-preview-box">{markdownPreview}</pre>
          )
        ) : renderMode === 'canvas' ? (
          <canvas
            ref={canvasRef}
            className="ascii-canvas"
            aria-label={`Arte ASCII de ${imageName}`}
          />
        ) : result.colorMode === 'mono' || !coloredLines ? (
          <pre
            className="ascii-pre"
            style={{
              color: fgColor,
              backgroundColor: bgColor,
              fontSize: `${effectiveFontSize}px`,
            }}
          >
            {result.plainText}
          </pre>
        ) : (
          <pre
            className="ascii-pre"
            style={{
              color: fgColor,
              backgroundColor: bgColor,
              fontSize: `${effectiveFontSize}px`,
            }}
          >
            {coloredLines.map((runs, rowIdx) => (
              <React.Fragment key={rowIdx}>
                {runs.map((run, runIdx) => (
                  <span
                    key={runIdx}
                    style={run.color ? { color: run.color } : undefined}
                  >
                    {run.text}
                  </span>
                ))}
                {rowIdx < coloredLines.length - 1 ? '\n' : ''}
              </React.Fragment>
            ))}
          </pre>
        )}

        {showOriginal && previewImageUrl && (
          <div className="original-pip" role="dialog" aria-label="Imagen original">
            <div className="pip-header">
              <span>Referencia original</span>
              <button
                type="button"
                className="btn-icon"
                aria-label="Cerrar imagen original"
                onClick={() => setShowOriginal(false)}
              >
                <CloseIcon size={13} />
              </button>
            </div>
            <img src={previewImageUrl} alt={`Original: ${imageName}`} />
          </div>
        )}
      </div>
    </section>
  );
};
