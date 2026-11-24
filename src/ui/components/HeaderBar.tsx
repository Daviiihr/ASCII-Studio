import React, { useRef } from 'react';
import type { AsciiResult, StudioMode } from '../../core/types';
import { SAMPLE_SPECS, type SampleId } from '../../io/samples';
import {
  BrandGlyphIcon,
  CanvasViewIcon,
  FilmFrameIcon,
  GitHubCardIcon,
  UploadIcon,
} from './Icons';

interface HeaderBarProps {
  studioMode: StudioMode;
  activeSample: SampleId | null;
  imageName: string;
  naturalSize: { width: number; height: number } | null;
  result: AsciiResult | null;
  frameCount: number;
  charAspect: number;
  isProcessing: boolean;
  onChangeMode: (mode: StudioMode) => void;
  onSelectSample: (id: SampleId) => void;
  onUploadFile: (file: File) => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  studioMode,
  activeSample,
  imageName,
  naturalSize,
  result,
  frameCount,
  charAspect,
  isProcessing,
  onChangeMode,
  onSelectSample,
  onUploadFile,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFile(file);
      e.target.value = '';
    }
  };

  return (
    <header className="studio-header">
      <div className="brand-group">
        <div className="brand-mark">
          <BrandGlyphIcon size={16} />
        </div>
        <h1 className="brand-title">ASCII Studio</h1>

        <div className="segmented-control mode-switcher" role="group" aria-label="Modo de trabajo">
          <button
            type="button"
            className={studioMode === 'studio' ? 'is-active' : ''}
            aria-pressed={studioMode === 'studio'}
            onClick={() => onChangeMode('studio')}
          >
            <CanvasViewIcon size={13} />
            <span>Estudio</span>
          </button>
          <button
            type="button"
            className={studioMode === 'github' ? 'is-active' : ''}
            aria-pressed={studioMode === 'github'}
            onClick={() => onChangeMode('github')}
          >
            <GitHubCardIcon size={13} />
            <span>Perfil GitHub</span>
          </button>
        </div>
      </div>

      <div className="header-center">
        <div className="sample-switcher" role="group" aria-label="Imágenes de muestra">
          {SAMPLE_SPECS.map((sample) => (
            <button
              key={sample.id}
              type="button"
              className={`btn-chip ${activeSample === sample.id ? 'is-active' : ''}`}
              aria-pressed={activeSample === sample.id}
              onClick={() => onSelectSample(sample.id)}
            >
              {sample.isAnimated && <FilmFrameIcon size={12} />}
              <span>{sample.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="header-right">
        <div className="telemetry-strip" aria-live="polite">
          <span
            className="telemetry-file"
            title={
              naturalSize
                ? `${imageName} (${naturalSize.width}×${naturalSize.height})`
                : imageName
            }
          >
            {imageName}
          </span>
          {result && (
            <>
              <span className="telemetry-sep" aria-hidden="true">
                /
              </span>
              <span title="Resolución en caracteres">
                {result.cols}×{result.rows}
              </span>
              {frameCount > 1 && (
                <>
                  <span className="telemetry-sep" aria-hidden="true">
                    /
                  </span>
                  <span className="telemetry-gif" title="Fotogramas animados">
                    {frameCount}f
                  </span>
                </>
              )}
              <span className="telemetry-sep" aria-hidden="true">
                /
              </span>
              <span
                className={isProcessing ? 'telemetry-processing' : undefined}
                title={`Aspecto de glifo ${charAspect.toFixed(2)}`}
              >
                {isProcessing ? 'Procesando…' : `${result.durationMs.toFixed(1)} ms`}
              </span>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.gif"
          className="sr-only"
          aria-label="Seleccionar archivo de imagen o GIF"
          onChange={handleFileChange}
        />
        <button
          type="button"
          className="btn-primary"
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadIcon size={14} />
          <span>Subir imagen / GIF</span>
        </button>
      </div>
    </header>
  );
};
