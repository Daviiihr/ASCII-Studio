import React, { useEffect, useRef } from 'react';
import {
  GITHUB_THEMES,
  parseProfileStats,
} from '../../core/githubCard';
import type { AsciiResult, GitHubProfileConfig } from '../../core/types';
import { renderAsciiToCanvas } from '../../io/canvasRenderer';
import { STUDIO_MONO_FONT } from '../../io/fontMetrics';

interface GitHubPreviewCardProps {
  result: AsciiResult;
  frameCount: number;
  profile: GitHubProfileConfig;
  fontSizePx: number;
}

export const GitHubPreviewCard: React.FC<GitHubPreviewCardProps> = ({
  result,
  frameCount,
  profile,
  fontSizePx,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = GITHUB_THEMES[profile.themeId];
  const stats = parseProfileStats(profile.statsText).slice(0, 10);
  const cleanUser = profile.username.trim().replace(/^@+/, '') || 'usuario';

  useEffect(() => {
    if (!canvasRef.current) return;
    renderAsciiToCanvas(canvasRef.current, result, {
      bgColor: theme.bg,
      fgColor: theme.fg,
      fontSizePx,
      fontFamily: STUDIO_MONO_FONT,
      paddingPx: 10,
    });
  }, [result, theme.bg, theme.fg, fontSizePx]);

  return (
    <div
      className="gh-card"
      style={{
        backgroundColor: theme.bg,
        borderColor: theme.border,
        color: theme.fg,
      }}
    >
      {profile.showWindowBar && (
        <div
          className="gh-card-bar"
          style={{
            backgroundColor: theme.surface,
            borderBottomColor: theme.border,
            color: theme.muted,
          }}
        >
          <div className="gh-dots" aria-hidden="true">
            <span style={{ backgroundColor: '#ff5f56' }} />
            <span style={{ backgroundColor: '#ffbd2e' }} />
            <span style={{ backgroundColor: '#27c93f' }} />
          </div>
          <span className="gh-bar-title">
            {cleanUser}@github — ~/README.md
            {frameCount > 1 ? ` · ${frameCount}f` : ''}
          </span>
        </div>
      )}

      <div className="gh-card-body">
        <div className="gh-ascii-pane">
          <canvas
            ref={canvasRef}
            className="gh-ascii-canvas"
            aria-label={`Arte ASCII de perfil @${cleanUser}`}
          />
        </div>

        <div
          className="gh-divider"
          style={{ backgroundColor: theme.border }}
          aria-hidden="true"
        />

        <div className="gh-info-pane">
          <div className="gh-user-block">
            <div className="gh-username" style={{ color: theme.accent }}>
              @{cleanUser}
            </div>
            {profile.role.trim() && (
              <div className="gh-role" style={{ color: theme.muted }}>
                {profile.role.trim()}
              </div>
            )}
          </div>

          <div
            className="gh-rule"
            style={{ backgroundColor: theme.border }}
            aria-hidden="true"
          />

          {profile.bio.trim() && (
            <p className="gh-bio" style={{ color: theme.fg }}>
              {profile.bio.trim()}
            </p>
          )}

          <ul className="gh-stats-list">
            {stats.map((item, idx) => (
              <li key={`${item.key}-${idx}`}>
                <span className="gh-stat-key" style={{ color: theme.keyColor }}>
                  {item.key}:
                </span>{' '}
                <span>{item.value}</span>
              </li>
            ))}
          </ul>

          <div className="gh-swatches" aria-hidden="true">
            {theme.swatches.map((hex) => (
              <span key={hex} style={{ backgroundColor: hex }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
