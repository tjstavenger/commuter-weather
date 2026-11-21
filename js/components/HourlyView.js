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
            <th>Commute</th>
            <th>Conditions</th>
            <th>Temp</th>
            <th>Feels</th>
            <th>Rain</th>
            <th>Wind</th>
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

            return html`
              <tr class=${isCommute ? 'highlight-commute' : ''}>
                <td>
                  <span class="hourly-dot ${status}"></span>
                  <strong>${timeStr}</strong>
                  ${isMorning ? html`<span class="hourly-commute-tag">AM</span>` : ''}
                  ${isAfternoon ? html`<span class="hourly-commute-tag">PM</span>` : ''}
                </td>
                <td>
                  <span class="status-badge ${status}" style="font-size: 0.7rem; padding: 0.15rem 0.45rem;">
                    ${status.toUpperCase()}
                  </span>
                  ${reasons.length > 0 ? html`
                    <span class="chip chip-${status}" style="font-size: 0.65rem; margin-left: 0.35rem;">
                      ${reasons[0]}
                    </span>
                  ` : ''}
                </td>
                <td style="display: flex; align-items: center; gap: 0.35rem;">
                  ${h.icon ? html`<img src=${h.icon} alt="" style="width: 24px; height: 24px; border-radius: 4px;" />` : ''}
                  <span>${h.shortForecast}</span>
                </td>
                <td><strong>${h.temperature}°</strong></td>
                <td>${h.evaluation?.apparentTemp || h.temperature}°</td>
                <td>${h.pop}%</td>
                <td>${h.windDirection} ${h.windSpeed} mph ${h.gustSpeed > 0 ? html`(${h.gustSpeed}g)` : ''}</td>
              </tr>
            `;
          })}
        </tbody>
      </table>
    </div>
  `;
}
