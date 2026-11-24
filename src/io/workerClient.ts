import { convertImageToAscii } from '../core/converter';
import type {
  AnimatedAsciiFrame,
  ConversionOptions,
} from '../core/types';
import type {
  SerializedFrameInput,
  WorkerRequest,
  WorkerResponse,
} from '../worker/ascii.worker';
import type { DecodedFrame } from './gifDecoder';

export interface ConvertedFramesBatch {
  frames: AnimatedAsciiFrame[];
  totalDurationMs: number;
}

interface QueuedBatch {
  requestId: number;
  options: Partial<ConversionOptions>;
  maxFrames: number;
  speed: number;
  resolve: (batch: ConvertedFramesBatch | null) => void;
  reject: (reason?: unknown) => void;
}

function convertFramesSync(
  sourceFrames: DecodedFrame[],
  options: Partial<ConversionOptions>,
  maxFrames: number,
  speed: number
): ConvertedFramesBatch {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const safeSpeed = Math.max(0.25, Math.min(4, speed));
  const limit = Math.max(2, Math.round(maxFrames));

  let selected: DecodedFrame[];
  if (sourceFrames.length <= 1) {
    selected = sourceFrames;
  } else if (sourceFrames.length <= limit) {
    selected = sourceFrames.map((f) => ({
      buffer: f.buffer,
      delayMs: Math.max(20, Math.round(f.delayMs / safeSpeed)),
    }));
  } else {
    const step = sourceFrames.length / limit;
    selected = [];
    let accDelay = 0;
    let nextIdx = 0;
    for (let i = 0; i < sourceFrames.length; i++) {
      accDelay += sourceFrames[i].delayMs;
      if (i >= Math.floor(nextIdx) || i === sourceFrames.length - 1) {
        selected.push({
          buffer: sourceFrames[i].buffer,
          delayMs: Math.max(20, Math.round(accDelay / safeSpeed)),
        });
        accDelay = 0;
        nextIdx += step;
        if (selected.length >= limit) break;
      }
    }
  }

  const frames: AnimatedAsciiFrame[] = selected.map((frame) => ({
    delayMs: frame.delayMs,
    result: convertImageToAscii(frame.buffer, options),
  }));

  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return {
    frames,
    totalDurationMs: Math.max(0, t1 - t0),
  };
}

/**
 * Cliente del Web Worker con soporte multi-frame (GIF) y coalescing de peticiones.
 */
export class AsciiWorkerClient {
  private worker: Worker | null = null;
  private localFrames: DecodedFrame[] = [];
  private inFlight: QueuedBatch | null = null;
  private pending: QueuedBatch | null = null;
  private nextRequestId = 1;
  private disposed = false;

  constructor() {
    if (typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(
          new URL('../worker/ascii.worker.ts', import.meta.url),
          { type: 'module' }
        );
        this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
          this.handleMessage(event.data);
        };
        this.worker.onerror = () => {
          this.worker?.terminate();
          this.worker = null;
          this.flushWithFallback();
        };
      } catch {
        this.worker = null;
      }
    }
  }

  setFrames(frames: DecodedFrame[]): void {
    if (this.disposed) return;
    this.localFrames = frames;

    if (this.worker) {
      const transferables: Transferable[] = [];
      const serialized: SerializedFrameInput[] = frames.map((frame) => {
        const copy = new Uint8ClampedArray(frame.buffer.data);
        transferables.push(copy.buffer);
        return {
          width: frame.buffer.width,
          height: frame.buffer.height,
          data: copy.buffer,
          delayMs: frame.delayMs,
        };
      });

      const payload: WorkerRequest = {
        type: 'SET_FRAMES',
        frames: serialized,
      };
      this.worker.postMessage(payload, transferables);
    }
  }

  convertFrames(
    options: Partial<ConversionOptions>,
    maxFrames = 16,
    speed = 1
  ): Promise<ConvertedFramesBatch | null> {
    if (this.disposed) {
      return Promise.resolve(null);
    }

    if (this.localFrames.length === 0) {
      return Promise.reject(new Error('No hay imagen cargada.'));
    }

    if (!this.worker) {
      try {
        return Promise.resolve(
          convertFramesSync(this.localFrames, options, maxFrames, speed)
        );
      } catch (err) {
        return Promise.reject(err);
      }
    }

    return new Promise((resolve, reject) => {
      const requestId = this.nextRequestId++;
      const job: QueuedBatch = {
        requestId,
        options,
        maxFrames,
        speed,
        resolve,
        reject,
      };

      if (this.inFlight) {
        if (this.pending) {
          this.pending.resolve(null);
        }
        this.pending = job;
        return;
      }

      this.dispatch(job);
    });
  }

  private dispatch(job: QueuedBatch): void {
    if (!this.worker || this.disposed) {
      if (this.localFrames.length > 0 && !this.disposed) {
        try {
          job.resolve(
            convertFramesSync(
              this.localFrames,
              job.options,
              job.maxFrames,
              job.speed
            )
          );
        } catch (err) {
          job.reject(err);
        }
      } else {
        job.resolve(null);
      }
      return;
    }

    this.inFlight = job;
    const payload: WorkerRequest = {
      type: 'CONVERT_FRAMES',
      requestId: job.requestId,
      options: job.options,
      maxFrames: job.maxFrames,
      speed: job.speed,
    };
    this.worker.postMessage(payload);
  }

  private handleMessage(message: WorkerResponse): void {
    if (message.type === 'FRAMES_READY') {
      return;
    }

    const active = this.inFlight;
    if (!active) return;

    if (
      message.type === 'FRAMES_RESULT' &&
      message.requestId !== active.requestId
    ) {
      return;
    }
    if (
      message.type === 'ERROR' &&
      message.requestId !== undefined &&
      message.requestId !== active.requestId
    ) {
      return;
    }

    this.inFlight = null;

    if (message.type === 'FRAMES_RESULT') {
      active.resolve({
        frames: message.frames.map((frame) => ({
          delayMs: frame.delayMs,
          result: {
            cols: frame.result.cols,
            rows: frame.result.rows,
            lines: frame.result.lines,
            plainText: frame.result.plainText,
            colors: new Uint8Array(frame.result.colorsBuffer),
            colorMode: frame.result.colorMode,
            durationMs: frame.result.durationMs,
          },
        })),
        totalDurationMs: message.totalDurationMs,
      });
    } else if (message.type === 'ERROR') {
      active.reject(new Error(message.message));
    }

    if (this.pending && !this.disposed) {
      const next = this.pending;
      this.pending = null;
      this.dispatch(next);
    }
  }

  private flushWithFallback(): void {
    const active = this.inFlight;
    const next = this.pending;
    this.inFlight = null;
    this.pending = null;

    const runSync = (job: QueuedBatch | null) => {
      if (!job) return;
      if (this.localFrames.length === 0 || this.disposed) {
        job.resolve(null);
        return;
      }
      try {
        job.resolve(
          convertFramesSync(
            this.localFrames,
            job.options,
            job.maxFrames,
            job.speed
          )
        );
      } catch (err) {
        job.reject(err);
      }
    };

    runSync(active);
    runSync(next);
  }

  dispose(): void {
    this.disposed = true;
    this.inFlight?.resolve(null);
    this.pending?.resolve(null);
    this.inFlight = null;
    this.pending = null;
    this.localFrames = [];
    this.worker?.terminate();
    this.worker = null;
  }
}
