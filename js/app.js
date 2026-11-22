import { h, render } from 'preact';
import { useState, useEffect, useCallback, useMemo } from 'preact/hooks';
import htm from 'htm';

import { noaaClient } from './noaaClient.js';
import { evaluatePeriod, evaluateHour } from './decisionEngine.js';
import { getSunriseSunset } from './solar.js';
import { loadSettings, saveSettings } from './settingsService.js';

import { Header } from './components/Header.js';
import { CommuteHero } from './components/CommuteHero.js';
import { AlertBanner } from './components/AlertBanner.js';
import { PeriodCard } from './components/PeriodCard.js';
import { HourlyView } from './components/HourlyView.js';
import { OptionsModal } from './components/OptionsModal.js';

const html = htm.bind(h);

export function App() {
  const [settings, setSettings] = useState(loadSettings);
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedIndex, setExpandedIndex] = useState(0); // first period expanded by default on mobile
  const [selectedIndex, setSelectedIndex] = useState(0); // for desktop 2-column view
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load forecast for current settings coordinates
  const loadForecast = useCallback(async (currentSettings) => {
    const loc = currentSettings.location;
    if (!loc || typeof loc.lat !== 'number' || typeof loc.lon !== 'number') {
      setError('Please set a valid location (ZIP code or GPS coordinates).');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await noaaClient.fetchForecast(loc.lat, loc.lon);
      setForecastData(data);
    } catch (err) {
      console.error('Failed to fetch forecast from NOAA:', err);
      setError(`Unable to load NOAA forecast: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadForecast(settings);
  }, [loadForecast, settings.location.lat, settings.location.lon]);

  // Evaluated periods computed with decision engine & solar astronomy
  const evaluatedPeriods = useMemo(() => {
    if (!forecastData?.daily || !forecastData?.hourly) return [];

    const { daily, hourly } = forecastData;
    const { lat, lon } = settings.location;

    return daily.map(period => {
      const sun = getSunriseSunset(period.startTime, lat, lon);
      return evaluatePeriod(period, hourly, settings, sun);
    });
  }, [forecastData, settings]);

  // Evaluate the latest observed conditions, using the active hourly forecast for precipitation chance.
  const currentConditions = useMemo(() => {
    if (!forecastData?.hourly?.length) return null;
    const now = new Date();
    const hourly = forecastData.hourly;
    const currentHour = hourly.find(hour => hour.startTime <= now && hour.endTime > now)
      || hourly.find(hour => hour.startTime > now)
      || hourly[hourly.length - 1];
    const observation = forecastData.currentConditions;
    const conditions = {
      ...currentHour,
      temperature: observation?.temperature ?? currentHour.temperature,
      windSpeed: observation?.windSpeed ?? currentHour.windSpeed,
      gustSpeed: observation?.windGust ?? currentHour.gustSpeed,
      windDirection: observation?.windDirection || currentHour.windDirection,
      relativeHumidity: observation?.relativeHumidity ?? currentHour.relativeHumidity,
      pop: currentHour.pop,
      startTime: observation?.timestamp || now,
      description: observation?.description || currentHour.shortForecast,
      precipitationLastHour: observation?.precipitationLastHour ?? null,
      visibility: observation?.visibility ?? null,
      stationName: observation?.stationName || ''
    };
    const sun = getSunriseSunset(conditions.startTime, settings.location.lat, settings.location.lon);
    const evaluation = evaluateHour(conditions, settings, sun);

    return {
      ...conditions,
      status: evaluation.status,
      reasons: evaluation.reasons,
      apparentTemp: evaluation.apparentTemp,
      observedAt: observation?.timestamp || null,
      metrics: {
        temperature: conditions.temperature,
        apparentTemp: evaluation.apparentTemp,
        wind: conditions.windSpeed,
        gust: conditions.gustSpeed,
        pop: conditions.pop,
        relativeHumidity: conditions.relativeHumidity,
        precipitationLastHour: conditions.precipitationLastHour,
        visibility: conditions.visibility
      }
    };
  }, [forecastData, settings]);

  const handleSaveSettings = (newSettings) => {
    saveSettings(newSettings);
    setSettings(newSettings);
  };

  const selectedPeriod = evaluatedPeriods[selectedIndex] || evaluatedPeriods[0];

  return html`
    <div>
      <${Header}
        location=${settings.location}
        updatedAt=${forecastData?.updatedAt}
        onRefresh=${() => loadForecast(settings)}
        onOpenSettings=${() => setIsSettingsOpen(true)}
        isLoading=${loading}
      />

      <main class="main-container">
        <!-- Active Warnings / Advisories Banner -->
        ${forecastData?.alerts && forecastData.alerts.length > 0 ? html`
          <${AlertBanner} alerts=${forecastData.alerts} />
        ` : null}

        <!-- Current Conditions -->
        ${currentConditions ? html`
          <${CommuteHero} currentConditions=${currentConditions} timeZone=${forecastData.point?.timeZone} />
        ` : null}

        <!-- Error State -->
        ${error ? html`
          <div class="error-banner">
            <p><strong>Error:</strong> ${error}</p>
            <button class="btn btn-secondary" style="margin-top: 0.5rem;" onClick=${() => loadForecast(settings)}>
              Try Again
            </button>
          </div>
        ` : null}

        <!-- Loading State Skeleton -->
        ${loading && !forecastData ? html`
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Fetching NOAA forecast for ${settings.location.city || 'your area'}...</p>
          </div>
        ` : null}

        <!-- Responsive Dashboard Grid -->
        ${evaluatedPeriods.length > 0 ? html`
          <div class="dashboard-grid">
            <!-- Left Column: 7-Day Period Forecast Cards -->
            <div class="period-list">
              <div class="form-section-title" style="margin-bottom: 0.25rem;">7-Day Forecast Periods</div>
              ${evaluatedPeriods.map((period, idx) => html`
                <${PeriodCard}
                  key=${period.number || idx}
                  period=${period}
                  options=${settings}
                  isExpanded=${expandedIndex === idx}
                  onToggle=${() => setExpandedIndex(expandedIndex === idx ? -1 : idx)}
                  isSelected=${selectedIndex === idx}
                  onSelect=${() => setSelectedIndex(idx)}
                />
              `)}
            </div>

            <!-- Right Column (Desktop Dashboard Scrubber) -->
            <div class="dashboard-sidebar desktop-only-panel">
              ${selectedPeriod ? html`
                <div class="hero-card">
                  <div class="hero-title-row">
                    <span class="hero-title">${selectedPeriod.name} Commute Analysis</span>
                    <span class="status-badge ${selectedPeriod.status}">${selectedPeriod.status.toUpperCase()}</span>
                  </div>
                  ${selectedPeriod.detailedForecast ? html`
                    <p class="period-narrative" style="margin-bottom: 0.75rem;">${selectedPeriod.detailedForecast}</p>
                  ` : null}
                  <div class="hourly-section-title">Hourly Timeline</div>
                  <${HourlyView} hours=${selectedPeriod.hours || []} options=${settings} />
                </div>
              ` : null}
            </div>
          </div>
        ` : null}
      </main>

      <!-- Settings Modal -->
      <${OptionsModal}
        isOpen=${isSettingsOpen}
        options=${settings}
        onClose=${() => setIsSettingsOpen(false)}
        onSave=${handleSaveSettings}
      />
    </div>
  `;
}

// Mount Preact application into DOM
const rootEl = document.getElementById('app');
if (rootEl) {
  render(html`<${App} />`, rootEl);
}
