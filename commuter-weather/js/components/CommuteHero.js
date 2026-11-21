import { h } from 'preact';
import htm from 'htm';
import { STATUS } from '../decisionEngine.js';

const html = htm.bind(h);

export function CommuteHero({ nextCommute }) {
  if (!nextCommute) return null;

  const { title, timeWindow, status, reasons, metrics } = nextCommute;

  const imageMap = {
    [STATUS.RIDE]: './images/ride.png',
    [STATUS.CAUTION]: './images/caution.png',
    [STATUS.DRIVE]: './images/drive.png'
  };

  const statusText = status.toUpperCase();

  return html`
    <div class="hero-card">
      <div class="hero-title-row">
        <span class="hero-title">Upcoming Commute: ${title}</span>
        <span class="hero-time">${timeWindow}</span>
      </div>

      <div class="hero-status-row">
        <div class="hero-badge-wrap">
          <img 
            src=${imageMap[status] || './images/ride.png'} 
            alt=${statusText} 
            class="hero-status-img"
          />
          <div>
            <div class="hero-status-text hero-status-${status}">
              ${statusText}
            </div>
            ${reasons && reasons.length > 0 ? html`
              <div class="hero-chips-wrap">
                ${reasons.map(r => html`
                  <span class="chip chip-${status}">${r}</span>
                `)}
              </div>
            ` : html`
              <span class="chip">Favorable Conditions</span>
            `}
          </div>
        </div>
      </div>

      ${metrics ? html`
        <div class="hero-summary-metrics">
          <div class="metric-item" title="Expected Temperature">
            <img src="./images/temp.svg" alt="Temp" />
            <span><strong>${metrics.temp}°</strong> F</span>
          </div>
          <div class="metric-item" title="Apparent Temperature">
            <img src="./images/windChill.svg" alt="Apparent" />
            <span>Feels <strong>${metrics.apparentTemp}°</strong></span>
          </div>
          <div class="metric-item" title="Chance of Precipitation">
            <img src="./images/precip.svg" alt="Precipitation" />
            <span><strong>${metrics.pop}%</strong> rain</span>
          </div>
          <div class="metric-item" title="Wind and Gusts">
            <img src="./images/wind.svg" alt="Wind" />
            <span><strong>${metrics.wind}</strong> mph ${metrics.gust > 0 ? html`(g ${metrics.gust})` : ''}</span>
          </div>
        </div>
      ` : null}
    </div>
  `;
}
