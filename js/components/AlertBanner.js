import { h } from 'preact';
import htm from 'htm';

const html = htm.bind(h);

export function AlertBanner({ alerts }) {
  if (!alerts || alerts.length === 0) return null;

  return html`
    <div class="alert-list" style="display: flex; flex-direction: column; gap: 0.5rem;">
      ${alerts.map(a => html`
        <div class="alert-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <div style="flex: 1;">
            <strong>${a.event}</strong>: ${a.headline || a.description.slice(0, 160) + '...'}
          </div>
        </div>
      `)}
    </div>
  `;
}
