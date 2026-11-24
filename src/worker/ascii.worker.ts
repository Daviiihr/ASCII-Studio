import { convertImageToAscii } from '../core/converter';
import type { ConversionOptions, RawImageBuffer } from '../core/types';

export interface SerializedFrameInput {
  width: number;
  height: number;
  data: ArrayBuffer;
  delayMs: number;
}

export interface SerializedAsciiFrame {
  delayMs: number;
  result: {
    cols: number;
    rows: number;
    lines: string[];
    plainText: string;
    colorsBuffer: ArrayBuffer;
    colorMode: 'mono' | 'color';
    durationMs: number;
  };
}

export type WorkerRequest =
  | {
      type: 'SET_FRAMES';
      frames: SerializedFrameInput[];
    }
  | {
      type: 'CONVERT_FRAMES';
      requestId: number;
      options: Partial<ConversionOptions>;
      maxFrames: number;
      speed: number;
    };

export type WorkerResponse =
  | {
      type: 'FRAMES_READY';
    }
  | {
      type: 'FRAMES_RESULT';
      requestId: number;
      frames: SerializedAsciiFrame[];
      totalDurationMs: number;
    }
  | {
      type: 'ERROR';
      requestId?: number;
      message: string;
    };

interface CachedFrame {
  buffer: RawImageBuffer;
  delayMs: number;
}

interface WorkerGlobalBridge {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage: (message: WorkerResponse, transfer?: Transferable[]) => void;
}

const workerScope = globalThis as unknown as WorkerGlobalBridge;
let cachedFrames: CachedFrame[] = [];

function pickSubsampledFrames(
  frames: CachedFrame[],
  maxFrames: number,
  speed: number
): CachedFrame[] {
  const safeSpeed = Math.max(0.25, Math.min(4, speed));
  if (frames.length <= 1) {
    return frames;
  }

  const limit = Math.max(2, Math.round(maxFrames));
  if (frames.length <= limit) {
    return frames.map((f) => ({
      buffer: f.buffer,
      delayMs: Math.max(20, Math.round(f.delayMs / safeSpeed)),
    }));
  }

  const step = frames.length / limit;
  const selected: CachedFrame[] = [];
  let accDelay = 0;
  let nextIdx = 0;

  for (let i = 0; i < frames.length; i++) {
    accDelay += frames[i].delayMs;
    if (i >= Math.floor(nextIdx) || i === frames.length - 1) {
      selected.push({
        buffer: frames[i].buffer,
        delayMs: Math.max(20, Math.round(accDelay / safeSpeed)),
      });
      accDelay = 0;
      nextIdx += step;
      if (selected.length >= limit) break;
    }
  }

  return selected;
}

workerScope.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;

  if (message.type === 'SET_FRAMES') {
    cachedFrames = message.frames.map((frame) => ({
      buffer: {
        width: frame.width,
        height: frame.height,
        data: new Uint8ClampedArray(frame.data),
      },
      delayMs: frame.delayMs,
    }));
    workerScope.postMessage({ type: 'FRAMES_READY' });
    return;
  }

  if (message.type === 'CONVERT_FRAMES') {
    if (cachedFrames.length === 0) {
      workerScope.postMessage({
        type: 'ERROR',
        requestId: message.requestId,
        message: 'No hay ninguna imagen cargada en el Worker.',
      });
      return;
    }

    try {
      const t0 = performance.now();
      const targetFrames = pickSubsampledFrames(
        cachedFrames,
        message.maxFrames,
        message.speed
      );
      const outputs: SerializedAsciiFrame[] = [];
      const transferables: Transferable[] = [];

      for (const frame of targetFrames) {
        const result = convertImageToAscii(frame.buffer, message.options);
        const colorsBuffer = result.colors.buffer as ArrayBuffer;
        transferables.push(colorsBuffer);
        outputs.push({
          delayMs: frame.delayMs,
          result: {
            cols: result.cols,
            rows: result.rows,
            lines: result.lines,
            plainText: result.plainText,
            colorsBuffer,
            colorMode: result.colorMode,
            durationMs: result.durationMs,
          },
        });
      }

      const totalDurationMs = Math.max(0, performance.now() - t0);

      workerScope.postMessage(
        {
          type: 'FRAMES_RESULT',
          requestId: message.requestId,
          frames: outputs,
          totalDurationMs,
        },
        transferables
      );
    } catch (error) {
      workerScope.postMessage({
        type: 'ERROR',
        requestId: message.requestId,
        message:
          error instanceof Error
            ? error.message
            : 'Error desconocido al convertir la imagen.',
      });
    }
  }
};
