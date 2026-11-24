import React, { useState } from 'react';
import {
  toAnimatedSvgDocument,
  toAnsiText,
  toHtmlDocument,
  toPlainText,
  toSvgDocument,
} from '../../core/formatters';
import {
  toGitHubProfileSvg,
  toGitHubReadmeMarkdown,
} from '../../core/githubCard';
import type {
  AnimatedAsciiFrame,
  AsciiResult,
  GitHubProfileConfig,
  StudioMode,
} from '../../core/types';
import { exportResultToPngBlob } from '../../io/canvasRenderer';
import {
  copyTextToClipboard,
  downloadBlob,
  downloadTextFile,
  stripFileExtension,
} from '../../io/exporters';
import { CheckIcon, CopyIcon, DownloadIcon } from './Icons';

interface ExportToolbarProps {
  studioMode: StudioMode;
  result: AsciiResult | null;
  frames: AnimatedAsciiFrame[];
  imageName: string;
  bgColor: string;
  fgColor: string;
  charAspect: number;
  githubProfile: GitHubProfileConfig;
  githubSvgFilename: string;
  onError: (message: string) => void;
}

export const ExportToolbar: React.FC<ExportToolbarProps> = ({
  studioMode,
  result,
  frames,
  imageName,
  bgColor,
  fgColor,
  charAspect,
  githubProfile,
  githubSvgFilename,
  onError,
}) => {
  const [statusLabel, setStatusLabel] = useState<string | null>(null);
  const [copiedTarget, setCopiedTarget] = useState<
    'txt' | 'ansi' | 'md-svg' | 'md-table' | null
  >(null);

  const flashStatus = (
    msg: string,
    copied?: 'txt' | 'ansi' | 'md-svg' | 'md-table'
  ) => {
    setStatusLabel(msg);
    if (copied) {
      setCopiedTarget(copied);
    }
    window.setTimeout(() => {
      setStatusLabel((current) => (current === msg ? null : current));
      if (copied) {
        setCopiedTarget((current) => (current === copied ? null : current));
      }
    }, 2200);
  };

  const baseName = stripFileExtension(imageName) || 'ascii-art';
  const isAnimated = frames.length > 1;

  const handleCopyPlain = async () => {
    if (!result) return;
    try {
      await copyTextToClipboard(toPlainText(result));
      flashStatus('Texto TXT copiado', 'txt');
    } catch {
      onError('El navegador bloqueó el acceso al portapapeles.');
    }
  };

  const handleCopyAnsi = async () => {
    if (!result) return;
    try {
      await copyTextToClipboard(toAnsiText(result));
      flashStatus('Código ANSI copiado', 'ansi');
    } catch {
      onError('El navegador bloqueó el acceso al portapapeles.');
    }
  };

  const handleDownloadTxt = () => {
    if (!result) return;
    downloadTextFile(`${baseName}.txt`, toPlainText(result));
    flashStatus('Descargado .TXT');
  };

  const handleDownloadHtml = () => {
    if (!result) return;
    const html = toHtmlDocument(result, {
      bgColor,
      fgColor,
      colorMode: result.colorMode,
      fontSize: 12,
    });
    downloadTextFile(`${baseName}.html`, html, 'text/html;charset=utf-8');
    flashStatus('Descargado .HTML');
  };

  const handleDownloadSvg = () => {
    if (!result || frames.length === 0) return;
    const svg = isAnimated
      ? toAnimatedSvgDocument(frames, {
          bgColor,
          fgColor,
          colorMode: result.colorMode,
          fontSize: 12,
          charAspect,
        })
      : toSvgDocument(result, {
          bgColor,
          fgColor,
          colorMode: result.colorMode,
          fontSize: 14,
          charAspect,
        });
    const kb = Math.max(1, Math.round(svg.length / 1024));
    downloadTextFile(
      isAnimated ? `${baseName}-animado.svg` : `${baseName}.svg`,
      svg,
      'image/svg+xml;charset=utf-8'
    );
    flashStatus(
      isAnimated
        ? `Descargado SVG animado (${kb} KB)`
        : `Descargado .SVG (${kb} KB)`
    );
  };

  const handleDownloadPng = async () => {
    if (!result) return;
    try {
      flashStatus('Generando PNG…');
      const blob = await exportResultToPngBlob(result, bgColor, fgColor);
      downloadBlob(`${baseName}-ascii.png`, blob);
      flashStatus('Descargado .PNG');
    } catch {
      onError('No se pudo exportar la imagen PNG.');
    }
  };

  const handleCopyMarkdownSvg = async () => {
    if (!result) return;
    try {
      const md = toGitHubReadmeMarkdown(
        result,
        githubProfile,
        'svg-embed',
        githubSvgFilename
      );
      await copyTextToClipboard(md);
      flashStatus('Markdown <img> copiado', 'md-svg');
    } catch {
      onError('El navegador bloqueó el acceso al portapapeles.');
    }
  };

  const handleCopyMarkdownTable = async () => {
    if (!result) return;
    try {
      const md = toGitHubReadmeMarkdown(result, githubProfile, 'inline-table');
      await copyTextToClipboard(md);
      flashStatus('Tabla Markdown copiada', 'md-table');
    } catch {
      onError('El navegador bloqueó el acceso al portapapeles.');
    }
  };

  const handleDownloadGitHubSvg = () => {
    if (!result || frames.length === 0) return;
    const svg = toGitHubProfileSvg(frames, githubProfile, {
      colorMode: result.colorMode,
      charAspect,
    });
    const kb = Math.max(1, Math.round(svg.length / 1024));
    downloadTextFile(githubSvgFilename, svg, 'image/svg+xml;charset=utf-8');
    flashStatus(
      isAnimated
        ? `Descargado SVG perfil animado (${kb} KB)`
        : `Descargado ${githubSvgFilename} (${kb} KB)`
    );
  };

  const disabled = !result;

  return (
    <footer className="export-toolbar" aria-label="Exportación rápida">
      <div className="export-hint">
        <span>
          Arrastra imágenes o GIFs, o pega con <kbd className="kbd-chip">Ctrl+V</kbd>
        </span>
        {statusLabel && (
          <span className="status-toast" role="status" aria-live="polite">
            <CheckIcon size={12} />
            <span>{statusLabel}</span>
          </span>
        )}
      </div>

      {studioMode === 'github' ? (
        <div className="export-buttons">
          <button
            type="button"
            className="btn-secondary"
            disabled={disabled}
            onClick={handleCopyMarkdownSvg}
          >
            {copiedTarget === 'md-svg' ? (
              <CheckIcon size={13} />
            ) : (
              <CopyIcon size={13} />
            )}
            <span>Copiar MD (SVG)</span>
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={disabled}
            onClick={handleCopyMarkdownTable}
          >
            {copiedTarget === 'md-table' ? (
              <CheckIcon size={13} />
            ) : (
              <CopyIcon size={13} />
            )}
            <span>Copiar MD (Tabla &lt;pre&gt;)</span>
          </button>
          <span className="toolbar-divider" aria-hidden="true" />
          <button
            type="button"
            className="btn-primary"
            disabled={disabled}
            onClick={handleDownloadGitHubSvg}
          >
            <DownloadIcon size={13} />
            <span>
              {isAnimated ? '.SVG Perfil Animado' : '.SVG Perfil GitHub'}
            </span>
          </button>
        </div>
      ) : (
        <div className="export-buttons">
          <button
            type="button"
            className="btn-secondary"
            disabled={disabled}
            onClick={handleCopyPlain}
          >
            {copiedTarget === 'txt' ? (
              <CheckIcon size={13} />
            ) : (
              <CopyIcon size={13} />
            )}
            <span>Copiar TXT</span>
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={disabled}
            onClick={handleCopyAnsi}
          >
            {copiedTarget === 'ansi' ? (
              <CheckIcon size={13} />
            ) : (
              <CopyIcon size={13} />
            )}
            <span>Copiar ANSI</span>
          </button>

          <span className="toolbar-divider" aria-hidden="true" />

          <button
            type="button"
            className="btn-secondary"
            disabled={disabled}
            onClick={handleDownloadTxt}
          >
            <DownloadIcon size={13} />
            <span>.TXT</span>
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={disabled}
            onClick={handleDownloadHtml}
          >
            <DownloadIcon size={13} />
            <span>.HTML</span>
          </button>
          <button
            type="button"
            className={isAnimated ? 'btn-primary' : 'btn-secondary'}
            disabled={disabled}
            onClick={handleDownloadSvg}
          >
            <DownloadIcon size={13} />
            <span>{isAnimated ? '.SVG Animado' : '.SVG'}</span>
          </button>
          <button
            type="button"
            className={isAnimated ? 'btn-secondary' : 'btn-primary'}
            disabled={disabled}
            onClick={handleDownloadPng}
          >
            <DownloadIcon size={13} />
            <span>.PNG HD</span>
          </button>
        </div>
      )}
    </footer>
  );
};
