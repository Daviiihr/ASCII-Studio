import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_GITHUB_PROFILE,
  GITHUB_THEMES,
} from '../core/githubCard';
import type {
  AnimatedAsciiFrame,
  GitHubProfileConfig,
  StudioMode,
} from '../core/types';
import { MONO_THEMES } from '../io/canvasRenderer';
import { measureMonospaceMetrics } from '../io/fontMetrics';
import {
  type LoadedImage,
  loadImageFromBlob,
  revokeLoadedImage,
} from '../io/imageLoader';
import { generateSampleImage, type SampleId } from '../io/samples';
import { AsciiWorkerClient } from '../io/workerClient';
import {
  ControlsPanel,
  type StudioSettings,
} from './components/ControlsPanel';
import { DropZoneOverlay } from './components/DropZoneOverlay';
import { ExportToolbar } from './components/ExportToolbar';
import { HeaderBar } from './components/HeaderBar';
import { PreviewViewport } from './components/PreviewViewport';

export const App: React.FC = () => {
  const initialAspect = useMemo(() => measureMonospaceMetrics().charAspect, []);

  const [studioMode, setStudioMode] = useState<StudioMode>('studio');
  const [measuredAspect, setMeasuredAspect] = useState(initialAspect);
  const [settings, setSettings] = useState<StudioSettings>({
    cols: 110,
    rampId: 'standard',
    customRamp: ' .:-=+*#%@',
    invert: false,
    brightness: 0,
    contrast: 0,
    charAspect: initialAspect,
    colorMode: 'mono',
    monoTheme: 'light-on-dark',
    gifMaxFrames: 16,
    gifSpeed: 1,
  });
  const [githubProfile, setGithubProfile] = useState<GitHubProfileConfig>(
    DEFAULT_GITHUB_PROFILE
  );

  const [activeSample, setActiveSample] = useState<SampleId | null>('sphere');
  const [loadedImage, setLoadedImage] = useState<LoadedImage | null>(null);
  const [convertedFrames, setConvertedFrames] = useState<AnimatedAsciiFrame[]>(
    []
  );
  const [activeFrameIdx, setActiveFrameIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const workerClientRef = useRef<AsciiWorkerClient | null>(null);
  const dragDepthRef = useRef(0);
  const activeImageRef = useRef<LoadedImage | null>(null);
  const isMountedRef = useRef(true);
  const uploadSeqRef = useRef(0);
  const aspectOverriddenRef = useRef(false);
  const modeColsRef = useRef<{ studio: number; github: number }>({
    studio: 110,
    github: 56,
  });

  const replaceLoadedImage = useCallback((next: LoadedImage) => {
    revokeLoadedImage(activeImageRef.current);
    activeImageRef.current = next;
    setLoadedImage(next);
    setActiveFrameIdx(0);
    setIsPlaying(true);
    workerClientRef.current?.setFrames(next.frames);
  }, []);

  // Inicializa el Worker y carga la muestra inicial
  useEffect(() => {
    isMountedRef.current = true;
    const client = new AsciiWorkerClient();
    workerClientRef.current = client;

    try {
      const sample = generateSampleImage('sphere');
      replaceLoadedImage(sample);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Error al inicializar la muestra.'
      );
    }

    return () => {
      isMountedRef.current = false;
      uploadSeqRef.current += 1;
      client.dispose();
      revokeLoadedImage(activeImageRef.current);
      activeImageRef.current = null;
    };
  }, [replaceLoadedImage]);

  // Recalibra métricas tipográficas cuando la fuente web JetBrains Mono termina de cargar
  useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts?.ready) return;
    let active = true;
    void document.fonts.ready.then(() => {
      if (!active || !isMountedRef.current) return;
      const updated = measureMonospaceMetrics().charAspect;
      setMeasuredAspect(updated);
      if (!aspectOverriddenRef.current) {
        setSettings((prev) =>
          prev.charAspect === updated ? prev : { ...prev, charAspect: updated }
        );
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Paleta visual efectiva según modo Estudio vs Perfil GitHub
  const activeColors = useMemo(() => {
    if (studioMode === 'github') {
      const ghTheme = GITHUB_THEMES[githubProfile.themeId];
      return {
        bgColor: ghTheme.bg,
        fgColor: ghTheme.fg,
        alphaBg: ghTheme.alphaBg,
        effectiveInvert:
          ghTheme.isLight && settings.colorMode === 'mono'
            ? !settings.invert
            : settings.invert,
      };
    }

    if (settings.colorMode === 'color') {
      return {
        bgColor: '#0c0c0f',
        fgColor: '#f4f4f5',
        alphaBg: [12, 12, 15] as [number, number, number],
        effectiveInvert: settings.invert,
      };
    }

    const theme = MONO_THEMES[settings.monoTheme];
    return {
      bgColor: theme.bg,
      fgColor: theme.fg,
      alphaBg: theme.alphaBg,
      effectiveInvert:
        settings.monoTheme === 'dark-on-light'
          ? !settings.invert
          : settings.invert,
    };
  }, [
    studioMode,
    githubProfile.themeId,
    settings.colorMode,
    settings.monoTheme,
    settings.invert,
  ]);

  // Ejecuta conversión asíncrona (1 o N fotogramas) en Web Worker
  useEffect(() => {
    if (!loadedImage || !workerClientRef.current) return;

    let cancelled = false;
    setIsProcessing(true);

    workerClientRef.current
      .convertFrames(
        {
          cols: settings.cols,
          rampId: settings.rampId,
          customRamp: settings.customRamp,
          invert: activeColors.effectiveInvert,
          brightness: settings.brightness,
          contrast: settings.contrast,
          charAspect: settings.charAspect,
          colorMode: settings.colorMode,
          alphaBg: activeColors.alphaBg,
        },
        settings.gifMaxFrames,
        settings.gifSpeed
      )
      .then((batch) => {
        if (cancelled) return;
        if (batch && batch.frames.length > 0) {
          setConvertedFrames(batch.frames);
          setActiveFrameIdx((idx) => idx % batch.frames.length);
        }
        setIsProcessing(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setIsProcessing(false);
        setErrorMessage(
          err instanceof Error ? err.message : 'Error en la conversión ASCII.'
        );
      });

    return () => {
      cancelled = true;
    };
  }, [loadedImage, settings, activeColors]);

  // Bucle de reproducción para GIFs animados
  useEffect(() => {
    if (convertedFrames.length <= 1 || !isPlaying) return;
    const currentFrame =
      convertedFrames[activeFrameIdx % convertedFrames.length];
    const delay = Math.max(25, currentFrame?.delayMs ?? 90);

    const timer = window.setTimeout(() => {
      setActiveFrameIdx((idx) => (idx + 1) % convertedFrames.length);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [convertedFrames, activeFrameIdx, isPlaying]);

  const handleChangeMode = useCallback(
    (nextMode: StudioMode) => {
      if (nextMode === studioMode) return;
      modeColsRef.current[studioMode] = settings.cols;
      setStudioMode(nextMode);
      setSettings((prev) => ({
        ...prev,
        cols: modeColsRef.current[nextMode],
      }));
    },
    [studioMode, settings.cols]
  );

  const handleSelectSample = useCallback(
    (id: SampleId) => {
      uploadSeqRef.current += 1;
      setErrorMessage(null);
      setActiveSample(id);
      const sample = generateSampleImage(id);
      replaceLoadedImage(sample);
    },
    [replaceLoadedImage]
  );

  const handleUploadFile = useCallback(
    async (file: File) => {
      if (
        !file.type.startsWith('image/') &&
        !file.name.toLowerCase().endsWith('.gif')
      ) {
        setErrorMessage(
          `El archivo "${file.name}" no es una imagen o GIF compatible.`
        );
        return;
      }

      const seq = ++uploadSeqRef.current;
      setErrorMessage(null);
      try {
        const decoded = await loadImageFromBlob(file, file.name);
        if (!isMountedRef.current || seq !== uploadSeqRef.current) {
          revokeLoadedImage(decoded);
          return;
        }
        setActiveSample(null);
        replaceLoadedImage(decoded);
      } catch (err) {
        if (!isMountedRef.current || seq !== uploadSeqRef.current) return;
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'No se pudo cargar la imagen seleccionada.'
        );
      }
    },
    [replaceLoadedImage]
  );

  // Soporte global de Ctrl+V para pegar imágenes desde el portapapeles
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) {
            event.preventDefault();
            const ext = blob.type === 'image/gif' ? 'gif' : 'png';
            void handleUploadFile(
              new File([blob], `imagen-pegada.${ext}`, { type: blob.type })
            );
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleUploadFile]);

  const handleSettingChange = <K extends keyof StudioSettings>(
    key: K,
    value: StudioSettings[K]
  ) => {
    if (key === 'charAspect') {
      aspectOverriddenRef.current = true;
    }
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleGitHubChange = <K extends keyof GitHubProfileConfig>(
    key: K,
    value: GitHubProfileConfig[K]
  ) => {
    setGithubProfile((prev) => ({ ...prev, [key]: value }));
  };

  const isFileDrag = (e: React.DragEvent) =>
    Array.from(e.dataTransfer?.types ?? []).includes('Files');

  const handleDragEnter = (e: React.DragEvent) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    dragDepthRef.current += 1;
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    dragDepthRef.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleUploadFile(file);
    }
  };

  const safeFrameIdx =
    convertedFrames.length > 0 ? activeFrameIdx % convertedFrames.length : 0;
  const activeResult = convertedFrames[safeFrameIdx]?.result ?? null;
  const cleanUserSlug =
    githubProfile.username
      .trim()
      .replace(/^@+/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '') || 'usuario';
  const githubSvgFilename =
    convertedFrames.length > 1
      ? `${cleanUserSlug}-ascii-animado.svg`
      : `${cleanUserSlug}-ascii.svg`;

  return (
    <div
      className="studio-shell"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <HeaderBar
        studioMode={studioMode}
        activeSample={activeSample}
        imageName={loadedImage?.name ?? 'sin imagen'}
        naturalSize={
          loadedImage
            ? {
                width: loadedImage.naturalWidth,
                height: loadedImage.naturalHeight,
              }
            : null
        }
        result={activeResult}
        frameCount={convertedFrames.length}
        charAspect={settings.charAspect}
        isProcessing={isProcessing}
        onChangeMode={handleChangeMode}
        onSelectSample={handleSelectSample}
        onUploadFile={(file) => void handleUploadFile(file)}
      />

      {errorMessage && (
        <div className="error-banner" role="alert">
          <span>{errorMessage}</span>
          <button
            type="button"
            className="btn-link"
            onClick={() => setErrorMessage(null)}
          >
            Cerrar
          </button>
        </div>
      )}

      <main className="studio-workspace">
        <ControlsPanel
          studioMode={studioMode}
          settings={settings}
          githubProfile={githubProfile}
          measuredAspect={measuredAspect}
          isAnimated={Boolean(loadedImage?.isAnimated)}
          frameCount={convertedFrames.length}
          activeFrameIdx={safeFrameIdx}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying((prev) => !prev)}
          onChange={handleSettingChange}
          onChangeGitHub={handleGitHubChange}
          onResetTones={() =>
            setSettings((prev) => ({
              ...prev,
              brightness: 0,
              contrast: 0,
              invert: false,
            }))
          }
          onResetAspect={() => {
            aspectOverriddenRef.current = false;
            setSettings((prev) => ({ ...prev, charAspect: measuredAspect }));
          }}
        />

        <PreviewViewport
          studioMode={studioMode}
          result={activeResult}
          frameCount={convertedFrames.length}
          activeFrameIdx={safeFrameIdx}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying((prev) => !prev)}
          bgColor={activeColors.bgColor}
          fgColor={activeColors.fgColor}
          charAspect={settings.charAspect}
          previewImageUrl={loadedImage?.previewUrl ?? null}
          imageName={loadedImage?.name ?? 'imagen'}
          githubProfile={githubProfile}
          githubSvgFilename={githubSvgFilename}
        />
      </main>

      <ExportToolbar
        studioMode={studioMode}
        result={activeResult}
        frames={convertedFrames}
        imageName={loadedImage?.name ?? 'ascii-art'}
        bgColor={activeColors.bgColor}
        fgColor={activeColors.fgColor}
        charAspect={settings.charAspect}
        githubProfile={githubProfile}
        githubSvgFilename={githubSvgFilename}
        onError={setErrorMessage}
      />

      <DropZoneOverlay visible={isDragging} />
    </div>
  );
};
