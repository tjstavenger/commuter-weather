import { h } from 'preact';
import htm from 'htm';
import { HourlyView } from './HourlyView.js';

const html = htm.bind(h);

export function PeriodCard({ period, options, isExpanded, onToggle, isSelected, onSelect }) {
  const status = period.status || 'ride';
  const reasons = period.reasons || [];
  const summary = period.summary || {};

  const formattedDate = period.startTime
    ? new Date(period.startTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
    : '';

  // Temperature range for the period summary table
  const tempRange = Number.isFinite(summary.minTemp) && Number.isFinite(summary.maxTemp)
    ? (summary.minTemp !== summary.maxTemp
        ? `${summary.minTemp}–${summary.maxTemp}°F`
        : `${summary.minTemp}°F`)
    : (Number.isFinite(period.temperature) ? `${period.temperature}°F` : '');

  // Wind summary
  const windSummary = summary.maxWind > 0 || summary.maxGust > 0
    ? [
        summary.maxWind > 0 ? `${summary.maxWind} mph` : '',
        summary.maxGust > 0 ? `gusts ${summary.maxGust} mph` : ''
      ].filter(Boolean).join(', ')
    : '';
  const maxPop = Number.isFinite(summary.maxPop) ? `${summary.maxPop}%` : '—';
  const maxHumidity = Number.isFinite(summary.maxHumidity) ? `${summary.maxHumidity}%` : '—';

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
          <div class="period-icon-wrap">
            ${period.icon ? html`
              <img src=${period.icon} alt="" class="period-weather-icon status-ring-${status}" />
            ` : html`
              <img src="./images/sun.svg" alt="" class="period-weather-icon status-ring-${status}" />
            `}
          </div>
          <div class="period-title-wrap">
            <span class="period-name">${period.name}</span>
            <span class="period-subline">${formattedDate}</span>
            <table class="period-summary-table" aria-label="${period.name} weather summary">
              <tbody>
                <tr>
                  <th scope="row" aria-label="Temperature" title="Temperature">
                    <img src="./images/temp.svg" alt="" aria-hidden="true" class="period-summary-icon" />
                  </th>
                  <td>${tempRange || '—'}</td>
                  <th scope="row" aria-label="Wind and gust" title="Wind and gust">
                    <img src="./images/wind.svg" alt="" aria-hidden="true" class="period-summary-icon" />
                    <img src="./images/gust.svg" alt="" aria-hidden="true" class="period-summary-icon" />
                  </th>
                  <td>${windSummary || '—'}</td>
                </tr>
                <tr>
                  <th scope="row" aria-label="Maximum precipitation chance" title="Maximum precipitation chance">
                    <img src="./images/precip.svg" alt="" aria-hidden="true" class="period-summary-icon" />
                  </th>
                  <td>${maxPop}</td>
                  <th scope="row" aria-label="Maximum humidity" title="Maximum humidity">
                    <img src="./images/humidity.svg" alt="" aria-hidden="true" class="period-summary-icon" />
                  </th>
                  <td>${maxHumidity}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="period-header-right">
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
          ${reasons.length > 0 ? html`
            <div class="period-reasons-wrap">
              <span class="period-reasons-label">Commute factors:</span>
              ${reasons.map(r => html`
                <span class="chip chip-${status}">${r}</span>
              `)}
            </div>
          ` : html`
            <div class="period-reasons-wrap">
              <span class="chip">Favorable Conditions</span>
            </div>
          `}

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
