import React from 'react';
import { UploadIcon } from './Icons';

interface DropZoneOverlayProps {
  visible: boolean;
}

export const DropZoneOverlay: React.FC<DropZoneOverlayProps> = ({ visible }) => {
  if (!visible) return null;

  return (
    <div className="dropzone-overlay" role="status" aria-live="polite">
      <div className="dropzone-card">
        <div className="dropzone-icon">
          <UploadIcon size={20} />
        </div>
        <h2>Suelta tu imagen aquí</h2>
        <p>PNG, JPG, WebP, GIF o SVG. Procesamiento 100 % local en tu navegador.</p>
      </div>
    </div>
  );
};
