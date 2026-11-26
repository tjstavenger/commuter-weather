import { h } from 'preact';
import htm from 'htm';
import { isTimeInWindow } from '../decisionEngine.js';

const html = htm.bind(h);

export function HourlyView({ hours, options }) {
  if (!hours || hours.length === 0) {
    return html`<p style="color: var(--text-muted); font-size: 0.9rem;">No hourly forecast available for this period.</p>`;
  }

  const morning = options.morningCommute || { enabled: true, start: '05:30', end: '06:30' };
  const afternoon = options.afternoonCommute || { enabled: true, start: '15:00', end: '16:00' };

  return html`
    <div class="hourly-table-wrap">
      <table class="hourly-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Temp</th>
            <th>Feels</th>
            <th>Rain</th>
            <th>Humidity</th>
            <th>Wind</th>
            <th>Gust</th>
            <th>Reasons</th>
          </tr>
        </thead>
        <tbody>
          ${hours.map(h => {
            const isMorning = morning.enabled && isTimeInWindow(h.startTime, morning.start, morning.end);
            const isAfternoon = afternoon.enabled && isTimeInWindow(h.startTime, afternoon.start, afternoon.end);
            const isCommute = isMorning || isAfternoon;

            const timeStr = h.startTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            const status = h.evaluation?.status || 'ride';
            const reasons = h.evaluation?.reasons || [];
            const humidity = h.relativeHumidity !== null && h.relativeHumidity !== undefined
              ? `${h.relativeHumidity}%`
              : '—';

            return html`
              <tr class=${isCommute ? 'highlight-commute' : ''}>
                <td>
                  <span class="hourly-dot ${status}"></span>
                  <strong>${timeStr}</strong>
                  ${isMorning ? html`<span class="hourly-commute-tag">AM</span>` : ''}
                  ${isAfternoon ? html`<span class="hourly-commute-tag">PM</span>` : ''}
                </td>
                <td>${h.temperature}°</td>
                <td>${h.evaluation?.apparentTemp || h.temperature}°</td>
                <td>${h.pop}%</td>
                <td>${humidity}</td>
                <td>${h.windDirection} ${h.windSpeed}</td>
                <td>${h.gustSpeed > 0 ? html`<span class="gust-val">${h.gustSpeed}</span>` : '—'}</td>
                <td>
                  ${reasons.length > 0
                    ? reasons.map(r => html`<span class="chip chip-${status} chip-xs">${r}</span>`)
                    : html`<span class="hourly-ok">✓</span>`
                  }
                </td>
              </tr>
            `;
          })}
        </tbody>
      </table>
    </div>
  `;
}
