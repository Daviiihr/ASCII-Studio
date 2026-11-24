# ASCII Studio — Conversor de Imágenes a Arte ASCII

Aplicación web moderna de procesamiento 100 % local en el navegador para convertir cualquier imagen (`PNG`, `JPG`, `WebP`, `GIF`, `SVG`) en arte ASCII, bloques Unicode o matrices Braille `2×4` de alta densidad en tiempo real.

## Características principales

- **Motor puro independiente del DOM (`src/core/`)**: luminancia perceptual **ITU-R BT.709**, tablas LUT $O(1)$ de brillo/contraste/inversión, submuestreo **Box-Average** con composición alfa y codificador **Braille 2×4** con *dithering* ordenado Bayer.
- **Fluidez a 60 FPS**: cálculo delegado a un **Web Worker** dedicado con caché del buffer RGBA y *coalescing* de peticiones para no congelar la interfaz al mover controles deslizantes.
- **Vista previa dual**: renderizador acelerado en `<canvas>` HiDPI (con trazado vectorial para Braille `2×4`) y modo de texto seleccionable `<pre>` con ligaduras desactivadas y `line-height: 1`.
- **Controles de estudio**: ancho de `20` a `300` columnas, 5 rampas integradas + rampa personalizada, ajuste fino del factor de aspecto medido automáticamente, temas monocromo (*Estudio Oscuro*, *Fósforo Verde*, *Monitor Ámbar*, *Tinta / Papel*) y modo **Color RGB TrueColor**.
- **Entrada y exportación inmediata**: arrastrar y soltar archivos, pegar desde el portapapeles (`Ctrl+V`), muestras procedurales integradas y exportación a **TXT**, **ANSI TrueColor**, **HTML**, **SVG** y **PNG HD**.

## Estructura de módulos

```text
src/
├── core/                  # Dominio puro (sin dependencias de React ni DOM)
│   ├── types.ts           # Contratos de buffers, opciones y resultado
│   ├── ramps.ts           # Registro extensible de rampas de caracteres
│   ├── luminance.ts       # Pesos BT.709, mezcla alfa y LUT O(1)
│   ├── sampler.ts         # Escalado con aspecto y Box-Sampling
│   ├── braille.ts         # Matriz Unicode Braille 2×4 + Bayer dithering
│   ├── converter.ts       # Orquestador convertImageToAscii()
│   ├── formatters.ts      # Exportadores puros TXT, ANSI, HTML y SVG
│   └── __tests__/         # Pruebas unitarias con Vitest
├── worker/
│   └── ascii.worker.ts    # Worker en segundo plano con transferencia zero-copy
├── io/                    # Adaptadores de navegador (E/S, Canvas, Portapapeles)
│   ├── imageLoader.ts     # File/Blob -> RawImageBuffer
│   ├── fontMetrics.ts     # Medición dinámica de glifo monoespaciado
│   ├── canvasRenderer.ts  # Pintado en Canvas HiDPI y exportación PNG
│   ├── samples.ts         # 3 imágenes de muestra procedurales
│   ├── exporters.ts       # Descargas y portapapeles
│   └── workerClient.ts    # Cliente Worker con coalescing y fallback síncrono
└── ui/                    # Capa de presentación React 19
    ├── App.tsx
    ├── components/
    └── styles/studio.css
```

## Instalación y ejecución

Requisitos: **Node.js 20+** y **npm**.

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev

# 3. Ejecutar pruebas unitarias del núcleo
npm test

# 4. Compilar verificación de tipos y paquete de producción
npm run build
```

## Extensibilidad

- **Añadir una nueva rampa**: registra una nueva entrada en `RAMP_REGISTRY` y `RAMP_OPTIONS` dentro de `src/core/ramps.ts` ordenada de menor densidad visual (`' '`) a mayor densidad.
- **Añadir un nuevo filtro tonal**: extiende `buildToneLut` o añade una función pura en `src/core/luminance.ts` y aplícala en el paso de mapeo de `src/core/converter.ts`.
