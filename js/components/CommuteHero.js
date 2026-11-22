import { h } from 'preact';
import htm from 'htm';

const html = htm.bind(h);

export function CommuteHero({ currentConditions, timeZone }) {
  if (!currentConditions) return null;

  const { status, reasons, metrics } = currentConditions;

  const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone
  });
  const observationLabel = currentConditions.observedAt
    ? `Observed ${timeFormatter.format(currentConditions.observedAt)}${currentConditions.stationName ? ` at ${currentConditions.stationName}` : ''}`
    : `Forecast for ${timeFormatter.format(currentConditions.startTime)}`;

  return html`
    <div class="hero-card">
      <div class="hero-title-row">
        <span class="hero-title">Current Conditions</span>
        <span class="hero-time">${observationLabel}</span>
      </div>

      <div class="hero-condition-row">
        <img
          src=${currentConditions.icon || './images/cloud.svg'}
          alt=${currentConditions.description || 'Current weather conditions'}
          class="period-weather-icon status-ring-${status}"
        />
        <div class="hero-condition-summary">
          ${currentConditions.description ? html`<span>${currentConditions.description}</span>` : null}
          <div class="hero-chips-wrap">
            ${reasons && reasons.length > 0
              ? reasons.map(r => html`<span class="chip chip-${status}">${r}</span>`)
              : html`<span class="chip">Favorable Conditions</span>`
            }
          </div>
        </div>
      </div>

      ${metrics ? html`
        <div class="hero-summary-metrics">
          <div class="metric-item" title="Current Temperature">
            <img src="./images/temp.svg" alt="Temp" />
            <span><strong>${metrics.temperature}°</strong> F</span>
          </div>
          <div class="metric-item" title="Apparent Temperature">
            <img src="./images/windChill.svg" alt="Apparent" />
            <span>Feels <strong>${metrics.apparentTemp}°</strong></span>
          </div>
          <div class="metric-item" title="Chance of Precipitation">
            <img src="./images/precip.svg" alt="Precipitation" />
            <span>
              ${metrics.precipitationLastHour !== null
                ? html`<strong>${metrics.precipitationLastHour} in</strong> past hour · `
                : ''}
              <strong>${metrics.pop}%</strong> precip chance
            </span>
          </div>
          <div class="metric-item" title="Sustained Wind / Gust">
            <img src="./images/wind.svg" alt="Wind" />
            <span>
              <strong>${metrics.wind}</strong> mph ${currentConditions.windDirection}
              ${metrics.gust > 0 ? html` · gusts <strong>${metrics.gust}</strong> mph` : ''}
            </span>
          </div>
          ${metrics.relativeHumidity !== null ? html`
            <div class="metric-item" title="Relative Humidity">
              <img src="./images/humidity.svg" alt="Humidity" />
              <span><strong>${metrics.relativeHumidity}%</strong> humidity</span>
            </div>
          ` : null}
          ${metrics.visibility !== null ? html`
            <div class="metric-item" title="Visibility">
              <img src="./images/visibility.svg" alt="Visibility" />
              <span><strong>${metrics.visibility}</strong> mi visibility</span>
            </div>
          ` : null}
        </div>
      ` : null}
    </div>
  `;
}
