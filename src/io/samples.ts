import type { DecodedFrame } from './gifDecoder';
import type { LoadedImage } from './imageLoader';

export type SampleId = 'sphere' | 'synthwave' | 'calibration' | 'orbit-gif';

export interface SampleSpec {
  id: SampleId;
  label: string;
  isAnimated?: boolean;
}

export const SAMPLE_SPECS: readonly SampleSpec[] = [
  { id: 'sphere', label: 'Esfera 3D' },
  { id: 'synthwave', label: 'Neón Synthwave' },
  { id: 'calibration', label: 'Carta de Prueba' },
  { id: 'orbit-gif', label: 'Órbita GIF', isAnimated: true },
];

function createCanvasSample(
  name: string,
  width: number,
  height: number,
  paint: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
): LoadedImage {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('No se pudo generar la imagen de muestra.');
  }

  paint(ctx, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const buffer = {
    width,
    height,
    data: imageData.data,
  };

  return {
    name,
    buffer,
    frames: [{ buffer, delayMs: 0 }],
    isAnimated: false,
    previewUrl: canvas.toDataURL('image/png'),
    naturalWidth: width,
    naturalHeight: height,
    isObjectUrl: false,
  };
}

function generateAnimatedOrbitSample(): LoadedImage {
  const width = 420;
  const height = 320;
  const frameCount = 16;
  const delayMs = 85;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('No se pudo generar la muestra animada.');
  }

  const frames: DecodedFrame[] = [];
  let previewUrl = '';

  for (let f = 0; f < frameCount; f++) {
    const phase = (f / frameCount) * Math.PI * 2;

    // Fondo espacial oscuro
    const bg = ctx.createRadialGradient(
      width * 0.5,
      height * 0.5,
      10,
      width * 0.5,
      height * 0.5,
      width * 0.65
    );
    bg.addColorStop(0, '#171329');
    bg.addColorStop(1, '#07070c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;

    // Anillo trasero
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.28 + Math.sin(phase) * 0.08);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(0, 0, 146, 42, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Planeta con luz rotatoria
    const lightX = cx + Math.cos(phase) * 44;
    const lightY = cy - 28 + Math.sin(phase) * 18;
    const sphereGrad = ctx.createRadialGradient(lightX, lightY, 12, cx, cy, 88);
    sphereGrad.addColorStop(0, '#fef08a');
    sphereGrad.addColorStop(0.32, '#f59e0b');
    sphereGrad.addColorStop(0.68, '#be185d');
    sphereGrad.addColorStop(1, '#1e1b4b');

    ctx.fillStyle = sphereGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 88, 0, Math.PI * 2);
    ctx.fill();

    // Anillo frontal
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.28 + Math.sin(phase) * 0.08);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.ellipse(0, 0, 146, 42, 0, 0, Math.PI);
    ctx.stroke();

    // Satélite orbitando
    const satX = Math.cos(phase) * 146;
    const satY = Math.sin(phase) * 42;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(satX, satY, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const imageData = ctx.getImageData(0, 0, width, height);
    frames.push({
      buffer: {
        width,
        height,
        data: new Uint8ClampedArray(imageData.data),
      },
      delayMs,
    });

    if (f === 0) {
      previewUrl = canvas.toDataURL('image/png');
    }
  }

  return {
    name: 'orbita-3d.gif',
    buffer: frames[0].buffer,
    frames,
    isAnimated: true,
    previewUrl,
    naturalWidth: width,
    naturalHeight: height,
    isObjectUrl: false,
  };
}

export function generateSampleImage(id: SampleId): LoadedImage {
  if (id === 'orbit-gif') {
    return generateAnimatedOrbitSample();
  }

  if (id === 'sphere') {
    return createCanvasSample('esfera-3d.png', 560, 420, (ctx, w, h) => {
      // Fondo oscuro arquitectónico con retícula tenue
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#07090e');
      bg.addColorStop(1, '#151b26');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 28) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 28) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Sombra proyectada
      const shadow = ctx.createRadialGradient(
        w * 0.52,
        h * 0.84,
        10,
        w * 0.52,
        h * 0.84,
        150
      );
      shadow.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
      shadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = shadow;
      ctx.beginPath();
      ctx.ellipse(w * 0.52, h * 0.84, 150, 32, 0, 0, Math.PI * 2);
      ctx.fill();

      // Esfera con sombreado Phong radial
      const cx = w * 0.5;
      const cy = h * 0.46;
      const radius = 142;
      const sphereGrad = ctx.createRadialGradient(
        cx - 48,
        cy - 52,
        14,
        cx,
        cy,
        radius
      );
      sphereGrad.addColorStop(0, '#ffffff');
      sphereGrad.addColorStop(0.22, '#dbeafe');
      sphereGrad.addColorStop(0.55, '#64748b');
      sphereGrad.addColorStop(0.84, '#1e293b');
      sphereGrad.addColorStop(1, '#090d16');

      ctx.fillStyle = sphereGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // Anillo orbital de contraste
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.6)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 8, 196, 44, -0.22, 0.15, Math.PI * 1.85);
      ctx.stroke();
    });
  }

  if (id === 'synthwave') {
    return createCanvasSample('neon-synthwave.png', 640, 400, (ctx, w, h) => {
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.62);
      sky.addColorStop(0, '#090418');
      sky.addColorStop(0.55, '#3b0764');
      sky.addColorStop(1, '#db2777');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h * 0.62);

      // Sol retro rayado
      const sunX = w / 2;
      const sunY = h * 0.46;
      const sunR = 112;
      const sunGrad = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
      sunGrad.addColorStop(0, '#fef08a');
      sunGrad.addColorStop(0.5, '#fb923c');
      sunGrad.addColorStop(1, '#ec4899');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
      ctx.fill();

      // Bandas horizontales oscuras sobre el sol
      ctx.fillStyle = '#3b0764';
      for (let i = 0; i < 6; i++) {
        const y = sunY + 14 + i * 16;
        const stripeH = 3 + i * 1.4;
        ctx.fillRect(sunX - sunR, y, sunR * 2, stripeH);
      }

      // Montañas en silueta
      ctx.fillStyle = '#0f0724';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.62);
      ctx.lineTo(w * 0.16, h * 0.45);
      ctx.lineTo(w * 0.34, h * 0.58);
      ctx.lineTo(w * 0.52, h * 0.51);
      ctx.lineTo(w * 0.72, h * 0.59);
      ctx.lineTo(w * 0.88, h * 0.43);
      ctx.lineTo(w, h * 0.62);
      ctx.closePath();
      ctx.fill();

      // Suelo perspectiva cian neón
      ctx.fillStyle = '#070314';
      ctx.fillRect(0, h * 0.62, w, h * 0.38);

      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      const horizonY = h * 0.62;
      for (let i = -8; i <= 8; i++) {
        ctx.beginPath();
        ctx.moveTo(w / 2 + i * 18, horizonY);
        ctx.lineTo(w / 2 + i * 95, h);
        ctx.stroke();
      }
      for (let row = 0; row < 7; row++) {
        const t = Math.pow(row / 6, 1.8);
        const y = horizonY + t * (h - horizonY);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    });
  }

  // Carta de calibración geométrica y escala tonal
  return createCanvasSample('carta-calibracion.png', 600, 400, (ctx, w, h) => {
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, w, h);

    // Marco exterior blanco
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 4;
    ctx.strokeRect(12, 12, w - 24, h - 24);

    // Retícula geométrica
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    for (let x = 60; x < w - 24; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 16);
      ctx.lineTo(x, h - 16);
      ctx.stroke();
    }
    for (let y = 56; y < h - 24; y += 48) {
      ctx.beginPath();
      ctx.moveTo(16, y);
      ctx.lineTo(w - 16, y);
      ctx.stroke();
    }

    // Círculo central perfecto para verificar proporción de aspecto
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.44, 118, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 140, h * 0.44);
    ctx.lineTo(w / 2 + 140, h * 0.44);
    ctx.moveTo(w / 2, h * 0.44 - 140);
    ctx.lineTo(w / 2, h * 0.44 + 140);
    ctx.stroke();

    // Escala de grises de 16 pasos
    const barW = (w - 80) / 16;
    for (let i = 0; i < 16; i++) {
      const v = Math.round((i / 15) * 255);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(40 + i * barW, h - 78, barW - 2, 24);
    }

    // Barras cromáticas RGBCMY
    const palette = [
      '#ef4444',
      '#22c55e',
      '#3b82f6',
      '#06b6d4',
      '#d946ef',
      '#eab308',
    ];
    const swatchW = (w - 80) / palette.length;
    palette.forEach((hex, idx) => {
      ctx.fillStyle = hex;
      ctx.fillRect(40 + idx * swatchW, h - 46, swatchW - 3, 20);
    });
  });
}
