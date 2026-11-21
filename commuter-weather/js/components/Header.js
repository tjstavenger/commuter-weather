import { h } from 'preact';
import htm from 'htm';

const html = htm.bind(h);

export function Header({ location, updatedAt, onRefresh, onOpenSettings, isLoading }) {
  const locationText = location?.city && location?.state
    ? `${location.city}, ${location.state}`
    : (location?.zip ? `ZIP ${location.zip}` : 'Set Location');

  const formattedTime = updatedAt
    ? new Date(updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : '';

  return html`
    <header class="header">
      <div class="header-inner">
        <div class="header-brand">
          <!-- Inline Bike SVG Icon -->
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="5.5" cy="17.5" r="3.5"/>
            <circle cx="18.5" cy="17.5" r="3.5"/>
            <path d="M15 17.5L14 11H9l-2 6.5"/>
            <path d="M14 11l4-5h3"/>
            <circle cx="12" cy="7" r="1"/>
          </svg>
          <span>Commuter Weather</span>
        </div>

        <button 
          class="header-location-pill" 
          onClick=${onOpenSettings} 
          title="Click to change location or commute settings"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <span>${locationText}</span>
        </button>

        <div class="header-actions">
          <button 
            class="btn-icon ${isLoading ? 'spinning' : ''}" 
            onClick=${onRefresh} 
            title=${formattedTime ? `Updated at ${formattedTime}. Click to refresh.` : 'Refresh forecast'}
            disabled=${isLoading}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
          </button>

          <button 
            class="btn-icon" 
            onClick=${onOpenSettings} 
            title="Commute & threshold settings"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
  `;
}
