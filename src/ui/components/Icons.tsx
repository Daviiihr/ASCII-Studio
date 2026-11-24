import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

const baseProps = (size: number, className?: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className,
  'aria-hidden': true as const,
});

export const BrandGlyphIcon: React.FC<IconProps> = ({ size = 18, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 18 18"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <rect x="2.25" y="2.25" width="3.5" height="3.5" rx="0.9" fill="currentColor" />
    <rect x="7.25" y="2.25" width="3.5" height="3.5" rx="0.9" fill="currentColor" opacity="0.55" />
    <rect x="12.25" y="2.25" width="3.5" height="3.5" rx="0.9" fill="currentColor" opacity="0.22" />
    <rect x="2.25" y="7.25" width="3.5" height="3.5" rx="0.9" fill="currentColor" opacity="0.55" />
    <rect x="7.25" y="7.25" width="3.5" height="3.5" rx="0.9" fill="var(--accent)" />
    <rect x="12.25" y="7.25" width="3.5" height="3.5" rx="0.9" fill="currentColor" opacity="0.55" />
    <rect x="2.25" y="12.25" width="3.5" height="3.5" rx="0.9" fill="currentColor" opacity="0.22" />
    <rect x="7.25" y="12.25" width="3.5" height="3.5" rx="0.9" fill="currentColor" opacity="0.55" />
    <rect x="12.25" y="12.25" width="3.5" height="3.5" rx="0.9" fill="currentColor" />
  </svg>
);

export const UploadIcon: React.FC<IconProps> = ({ size = 14, className }) => (
  <svg {...baseProps(size, className)}>
    <path d="M8 10.5V2.75" />
    <path d="M5 5.5 8 2.5l3 3" />
    <path d="M2.5 11.25v1.5a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-1.5" />
  </svg>
);

export const DownloadIcon: React.FC<IconProps> = ({ size = 14, className }) => (
  <svg {...baseProps(size, className)}>
    <path d="M8 2.5v7.75" />
    <path d="M5 7.5 8 10.5l3-3" />
    <path d="M2.5 11.25v1.5a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-1.5" />
  </svg>
);

export const CopyIcon: React.FC<IconProps> = ({ size = 14, className }) => (
  <svg {...baseProps(size, className)}>
    <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
    <path d="M10.5 5.5V3.75A1.25 1.25 0 0 0 9.25 2.5h-5.5A1.25 1.25 0 0 0 2.5 3.75v5.5A1.25 1.25 0 0 0 3.75 10.5H5.5" />
  </svg>
);

export const CheckIcon: React.FC<IconProps> = ({ size = 14, className }) => (
  <svg {...baseProps(size, className)}>
    <path d="M3.25 8.5 6.5 11.75 12.75 4.75" />
  </svg>
);

export const ZoomInIcon: React.FC<IconProps> = ({ size = 14, className }) => (
  <svg {...baseProps(size, className)}>
    <path d="M8 3.5v9M3.5 8h9" />
  </svg>
);

export const ZoomOutIcon: React.FC<IconProps> = ({ size = 14, className }) => (
  <svg {...baseProps(size, className)}>
    <path d="M3.5 8h9" />
  </svg>
);

export const FitScreenIcon: React.FC<IconProps> = ({ size = 14, className }) => (
  <svg {...baseProps(size, className)}>
    <path d="M2.5 5.5V3.5a1 1 0 0 1 1-1h2" />
    <path d="M13.5 5.5V3.5a1 1 0 0 0-1-1h-2" />
    <path d="M2.5 10.5v2a1 1 0 0 0 1 1h2" />
    <path d="M13.5 10.5v2a1 1 0 0 1-1 1h-2" />
  </svg>
);

export const CanvasViewIcon: React.FC<IconProps> = ({ size = 14, className }) => (
  <svg {...baseProps(size, className)}>
    <rect x="2.25" y="2.75" width="11.5" height="10.5" rx="1.75" />
    <circle cx="5.75" cy="6.25" r="1" fill="currentColor" stroke="none" />
    <path d="M3.25 11.5 6.5 8.5l2.25 2 2.25-2.5 2 2.25" />
  </svg>
);

export const CodeTextIcon: React.FC<IconProps> = ({ size = 14, className }) => (
  <svg {...baseProps(size, className)}>
    <path d="M5.25 4.5 2.25 8l3 3.5" />
    <path d="M10.75 4.5 13.75 8l-3 3.5" />
    <path d="M9 3.5 7 12.5" />
  </svg>
);

export const ImageRefIcon: React.FC<IconProps> = ({ size = 14, className }) => (
  <svg {...baseProps(size, className)}>
    <rect x="2.25" y="2.75" width="11.5" height="10.5" rx="1.75" />
    <path d="M8 2.75v10.5" />
  </svg>
);

export const CloseIcon: React.FC<IconProps> = ({ size = 14, className }) => (
  <svg {...baseProps(size, className)}>
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
);

export const ResetIcon: React.FC<IconProps> = ({ size = 13, className }) => (
  <svg {...baseProps(size, className)}>
    <path d="M3.25 6.5A5 5 0 1 1 4.25 10.75" />
    <path d="M3 3.25v3.25h3.25" />
  </svg>
);

export const PlayIcon: React.FC<IconProps> = ({ size = 13, className }) => (
  <svg {...baseProps(size, className)}>
    <path d="M4.5 3.25 12.25 8 4.5 12.75V3.25Z" fill="currentColor" />
  </svg>
);

export const PauseIcon: React.FC<IconProps> = ({ size = 13, className }) => (
  <svg {...baseProps(size, className)}>
    <rect x="4" y="3.25" width="2.75" height="9.5" rx="0.6" fill="currentColor" stroke="none" />
    <rect x="9.25" y="3.25" width="2.75" height="9.5" rx="0.6" fill="currentColor" stroke="none" />
  </svg>
);

export const GitHubCardIcon: React.FC<IconProps> = ({ size = 14, className }) => (
  <svg {...baseProps(size, className)}>
    <rect x="2" y="2.75" width="12" height="10.5" rx="1.75" />
    <path d="M6.75 2.75v10.5" />
    <path d="M9 6h3M9 8.5h2.5M9 11h2" />
  </svg>
);

export const FilmFrameIcon: React.FC<IconProps> = ({ size = 13, className }) => (
  <svg {...baseProps(size, className)}>
    <rect x="2.25" y="3" width="11.5" height="10" rx="1.5" />
    <path d="M5.25 3v10M10.75 3v10M2.25 6.25h3M2.25 9.75h3M10.75 6.25h3M10.75 9.75h3" />
  </svg>
);

