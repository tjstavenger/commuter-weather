import { h } from 'preact';
import htm from 'htm';
import { HourlyView } from './HourlyView.js';

const html = htm.bind(h);

export function PeriodCard({ period, options, isExpanded, onToggle, isSelected, onSelect }) {
  const status = period.status || 'ride';
  const reasons = period.reasons || [];
  const statusUpper = status.toUpperCase();

  const formattedDate = period.startTime
    ? new Date(period.startTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
    : '';

  return html`
    <div class="period-card ${isSelected ? 'selected' : ''}">
      <div 
        class="period-card-header" 
        onClick=${() => {
          onToggle();
          if (onSelect) onSelect();
        }}
      >
        <div class="period-header-left">
          ${period.icon ? html`
            <img src=${period.icon} alt="" class="period-weather-icon" />
          ` : html`
            <img src="./images/sun.svg" alt="" class="period-weather-icon" />
          `}
          <div class="period-title-wrap">
            <span class="period-name">${period.name}</span>
            <span class="period-subline">${formattedDate} • ${period.shortForecast || `${period.temperature}°F`}</span>
          </div>
        </div>

        <div class="period-header-right">
          <span class="status-badge ${status}">
            ${statusUpper}
          </span>

          ${reasons.length > 0 ? html`
            <div class="period-chips-wrap" style="display: flex; gap: 0.25rem;">
              ${reasons.slice(0, 2).map(r => html`
                <span class="chip chip-${status}">${r}</span>
              `)}
            </div>
          ` : null}

          <svg 
            class="period-chevron ${isExpanded ? 'open' : ''}" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="2"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>

      ${isExpanded ? html`
        <div class="period-card-body">
          ${period.detailedForecast ? html`
            <p class="period-narrative">${period.detailedForecast}</p>
          ` : null}

          <div style="margin-top: 1rem;">
            <div class="hourly-section-title">Hourly Forecast Breakdown</div>
            <${HourlyView} hours=${period.hours || []} options=${options} />
          </div>
        </div>
      ` : null}
    </div>
  `;
}
