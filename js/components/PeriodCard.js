import { h } from 'preact';
import htm from 'htm';
import { HourlyView } from './HourlyView.js';

const html = htm.bind(h);

const SunriseIcon = () => html`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="summary-metric-icon sun-icon" aria-hidden="true">
    <path d="M12 2v2"/>
    <path d="m4.93 4.93 1.41 1.41"/>
    <path d="M20 12h2"/>
    <path d="M2 12h2"/>
    <path d="m19.07 4.93-1.41 1.41"/>
    <path d="M12 7a5 5 0 0 1 5 5"/>
    <path d="M12 7a5 5 0 0 0-5 5"/>
    <path d="M3 20h18"/>
    <path d="m5 16 2.5-2.5"/>
    <path d="m19 16-2.5-2.5"/>
    <path d="M12 14v6"/>
  </svg>
`;

const SunsetIcon = () => html`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="summary-metric-icon sun-icon" aria-hidden="true">
    <path d="M12 10V2"/>
    <path d="m4.93 10.93 1.41-1.41"/>
    <path d="M2 18h2"/>
    <path d="M20 18h2"/>
    <path d="m19.07 10.93-1.41-1.41"/>
    <path d="M12 7a5 5 0 0 1 5 5"/>
    <path d="M12 7a5 5 0 0 0-5 5"/>
    <path d="M3 18h18"/>
    <path d="m5 14 2.5 2.5"/>
    <path d="m19 14-2.5 2.5"/>
    <path d="M12 18v2"/>
  </svg>
`;

export function PeriodCard({ period, options, isExpanded, onToggle, isSelected, onSelect }) {
  const status = period.status || 'ride';
  const reasons = period.reasons || [];
  const summary = period.summary || {};
  const sun = period.sun || null;

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
        summary.maxWind > 0
          ? `${summary.maxWind} mph${summary.maxWindDirection ? ` ${summary.maxWindDirection}` : ''}`
          : '',
        summary.maxGust > 0 ? `${summary.maxGust} mph` : ''
      ].filter(Boolean).join(' · ')
    : '';
  const maxPop = Number.isFinite(summary.maxPop) ? `${summary.maxPop}%` : '—';
  const maxHumidity = Number.isFinite(summary.maxHumidity) ? `${summary.maxHumidity}%` : '—';

  const formatTime = (date) =>
    date ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : null;

  // Show sunrise on daytime cards, sunset on nightly cards
  const sunriseTime = period.isDaytime && sun?.sunrise ? formatTime(sun.sunrise) : null;
  const sunsetTime = !period.isDaytime && sun?.sunset ? formatTime(sun.sunset) : null;

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
            <table class="period-summary-table" aria-label="${period.name} weather summary">
              <tbody>
                <tr class="period-summary-name-row">
                  <td colspan="4" class="period-summary-name-cell">
                    <span class="period-name">${period.name}</span>
                  </td>
                </tr>
                <tr class="period-summary-date-row">
                  <td colspan="3" class="period-summary-subline-cell">
                    <span class="period-subline">${formattedDate}</span>
                  </td>
                  ${(sunriseTime || sunsetTime) ? html`
                  <td class="period-summary-sun-cell">
                    ${sunriseTime ? html`<${SunriseIcon} />` : html`<${SunsetIcon} />`}
                    <span class="period-sun-time">${sunriseTime || sunsetTime}</span>
                  </td>
                  ` : html`<td></td>`}
                </tr>
                <tr>
                  <th scope="row" aria-label="Temperature" title="Temperature">
                    <img src="./images/temp.svg" alt="" aria-hidden="true" class="summary-metric-icon" />
                  </th>
                  <td>${tempRange || '—'}</td>
                  <th scope="row" aria-label="Wind and gust" title="Wind and gust">
                    <img src="./images/wind.svg" alt="" aria-hidden="true" class="summary-metric-icon" />
                    <img src="./images/gust.svg" alt="" aria-hidden="true" class="summary-metric-icon" />
                  </th>
                  <td>${windSummary || '—'}</td>
                </tr>
                <tr>
                  <th scope="row" aria-label="Maximum precipitation chance" title="Maximum precipitation chance">
                    <img src="./images/precip.svg" alt="" aria-hidden="true" class="summary-metric-icon" />
                  </th>
                  <td>${maxPop}</td>
                  <th scope="row" aria-label="Maximum humidity" title="Maximum humidity">
                    <img src="./images/humidity.svg" alt="" aria-hidden="true" class="summary-metric-icon" />
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
