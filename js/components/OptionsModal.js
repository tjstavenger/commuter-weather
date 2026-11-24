import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import htm from 'htm';
import { lookupZip, searchCities, getCurrentLocation } from '../locationService.js';
import { DEFAULT_SETTINGS } from '../settingsService.js';

const html = htm.bind(h);

export function OptionsModal({ isOpen, options, onClose, onSave }) {
  const [formData, setFormData] = useState(JSON.parse(JSON.stringify(options)));
  const [zipInput, setZipInput] = useState(options.location?.zip || '');
  const [cityQuery, setCityQuery] = useState('');
  const [cityOptions, setCityOptions] = useState([]);
  const [locationStatus, setLocationStatus] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isSearchingCities, setIsSearchingCities] = useState(false);

  useEffect(() => {
    const query = cityQuery.trim();
    if (!isOpen || query.length < 2) {
      setCityOptions([]);
      setIsSearchingCities(false);
      return;
    }

    let cancelled = false;
    setIsSearchingCities(true);
    const timeoutId = setTimeout(async () => {
      try {
        setLocationStatus('Searching US cities...');
        const locations = await searchCities(query);
        if (cancelled) return;
        setCityOptions(locations);
        setLocationStatus(locations.length ? '' : 'No matching US cities found.');
      } catch (err) {
        if (cancelled) return;
        setCityOptions([]);
        setLocationStatus(`City search error: ${err.message}`);
      } finally {
        if (!cancelled) setIsSearchingCities(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [cityQuery, isOpen]);

  if (!isOpen) return null;

  const handleZipChange = (e) => {
    setZipInput(e.target.value);
    setCityQuery('');
    setCityOptions([]);
    setLocationStatus('');
  };

  const handleCityQueryChange = (e) => {
    setCityQuery(e.target.value);
    setZipInput('');
    setCityOptions([]);
    setLocationStatus('');
  };

  const handleResolveZip = async () => {
    try {
      setLocationStatus('Looking up ZIP code...');
      const loc = await lookupZip(zipInput);
      setFormData(prev => ({ ...prev, location: loc }));
      setCityQuery('');
      setCityOptions([]);
      setLocationStatus(`Found: ${loc.city}, ${loc.state}`);
    } catch (err) {
      setLocationStatus(`Error: ${err.message}`);
    }
  };

  const handleSelectCity = (loc) => {
    setFormData(prev => ({ ...prev, location: loc }));
    setZipInput('');
    setCityQuery('');
    setCityOptions([]);
    setLocationStatus(`Found: ${loc.city}, ${loc.state}`);
  };

  const handleDetectGps = async () => {
    try {
      setIsLocating(true);
      setLocationStatus('Detecting GPS location...');
      const loc = await getCurrentLocation();
      setFormData(prev => ({ ...prev, location: loc }));
      setZipInput('');
      setCityQuery('');
      setCityOptions([]);
      setLocationStatus(`GPS: Lat ${loc.lat.toFixed(3)}, Lon ${loc.lon.toFixed(3)}`);
    } catch (err) {
      setLocationStatus(`GPS Error: ${err.message}`);
    } finally {
      setIsLocating(false);
    }
  };

  const updateThreshold = (field, key, val) => {
    const num = parseFloat(val);
    setFormData(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        [key]: isNaN(num) ? val : num
      }
    }));
  };

  const toggleField = (field) => {
    setFormData(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        enabled: !prev[field].enabled
      }
    }));
  };

  const handleSave = async () => {
    if (cityQuery.trim()) {
      setLocationStatus('Choose a city from the search results before saving.');
      return;
    }

    // If user edited ZIP but didn't click Find, resolve it before saving
    if (zipInput && zipInput !== formData.location?.zip) {
      if (!/^\d{5}$/.test(zipInput)) {
        setLocationStatus('Enter a valid 5-digit ZIP code or choose a city from the search results.');
        return;
      }

      try {
        const loc = await lookupZip(zipInput);
        const finalData = { ...formData, location: loc };
        onSave(finalData);
        onClose();
        return;
      } catch (err) {
        setLocationStatus(`Error: ${err.message}`);
        return;
      }
    }
    onSave(formData);
    onClose();
  };

  const handleReset = () => {
    if (confirm('Reset all commute windows and weather thresholds to defaults?')) {
      setFormData(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)));
      setZipInput(DEFAULT_SETTINGS.location.zip);
      setCityQuery('');
      setCityOptions([]);
      setLocationStatus('Reset to defaults');
    }
  };

  return html`
    <div class="modal-backdrop" onClick=${(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div class="modal-card">
        <div class="modal-header">
          <span class="modal-title">Settings & Thresholds</span>
          <button class="btn-icon" onClick=${onClose} style="border: none;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <!-- 1. Location Settings -->
          <div>
            <div class="form-section-title">Location</div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">US ZIP Code</label>
                <div style="display: flex; gap: 0.5rem;">
                  <input 
                    type="text" 
                    class="input-text" 
                    value=${zipInput} 
                    onInput=${handleZipChange}
                    placeholder="e.g. 99352"
                    maxLength="5"
                  />
                  <button type="button" class="btn btn-secondary" onClick=${handleResolveZip}>Find</button>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label" for="city-search-input">US City Search</label>
                <input
                  id="city-search-input"
                  type="text"
                  class="input-text"
                  value=${cityQuery}
                  onInput=${handleCityQueryChange}
                  placeholder="e.g. Richland, WA"
                  autoComplete="off"
                  aria-describedby="city-search-attribution"
                />
                <span id="city-search-attribution" class="location-attribution">
                  Search powered by Open-Meteo and GeoNames.
                </span>
                ${isSearchingCities ? html`<span class="location-search-status">Searching...</span>` : null}
                ${cityOptions.length ? html`
                  <ul class="city-search-results">
                    ${cityOptions.map(loc => html`
                      <li key=${loc.id}>
                        <button
                          type="button"
                          class="city-search-option"
                          onClick=${() => handleSelectCity(loc)}
                        >
                          ${loc.city}${loc.state ? `, ${loc.state}` : ''}
                        </button>
                      </li>
                    `)}
                  </ul>
                ` : null}
              </div>
            </div>
            <div class="form-group" style="margin-top: 0.75rem;">
              <label class="form-label">GPS Location</label>
              <div>
                <button type="button" class="btn btn-secondary" onClick=${handleDetectGps} disabled=${isLocating}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  <span>${isLocating ? 'Detecting...' : 'Detect GPS'}</span>
                </button>
              </div>
            </div>
            ${locationStatus ? html`
              <p role="status" aria-live="polite" style="font-size: 0.8rem; color: var(--primary); margin-top: 0.4rem;">${locationStatus}</p>
            ` : (formData.location?.city ? html`
              <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.4rem;">
                Current: ${formData.location.city}, ${formData.location.state} (${formData.location.lat.toFixed(3)}, ${formData.location.lon.toFixed(3)})
              </p>
            ` : null)}
          </div>

          <!-- 2. Work-Week Commute Windows -->
          <div>
            <div class="form-section-title">Work-Week Commute Windows (Mon–Fri)</div>
            
            <!-- Morning Commute -->
            <div class="form-group" style="margin-bottom: 0.75rem;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <label class="form-label">Morning Commute Window</label>
                <label style="font-size: 0.8rem; display: flex; align-items: center; gap: 0.35rem; cursor: pointer;">
                  <input 
                    type="checkbox" 
                    checked=${formData.morningCommute.enabled} 
                    onChange=${() => toggleField('morningCommute')} 
                  />
                  <span>Enabled</span>
                </label>
              </div>
              <div class="form-row" style="margin-top: 0.25rem;">
                <div>
                  <span style="font-size: 0.75rem; color: var(--text-muted);">Start Time</span>
                  <input 
                    type="time" 
                    class="input-time" 
                    value=${formData.morningCommute.start} 
                    onInput=${(e) => updateThreshold('morningCommute', 'start', e.target.value)}
                  />
                </div>
                <div>
                  <span style="font-size: 0.75rem; color: var(--text-muted);">End Time</span>
                  <input 
                    type="time" 
                    class="input-time" 
                    value=${formData.morningCommute.end} 
                    onInput=${(e) => updateThreshold('morningCommute', 'end', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <!-- Afternoon Commute -->
            <div class="form-group">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <label class="form-label">Afternoon Commute Window</label>
                <label style="font-size: 0.8rem; display: flex; align-items: center; gap: 0.35rem; cursor: pointer;">
                  <input 
                    type="checkbox" 
                    checked=${formData.afternoonCommute.enabled} 
                    onChange=${() => toggleField('afternoonCommute')} 
                  />
                  <span>Enabled</span>
                </label>
              </div>
              <div class="form-row" style="margin-top: 0.25rem;">
                <div>
                  <span style="font-size: 0.75rem; color: var(--text-muted);">Start Time</span>
                  <input 
                    type="time" 
                    class="input-time" 
                    value=${formData.afternoonCommute.start} 
                    onInput=${(e) => updateThreshold('afternoonCommute', 'start', e.target.value)}
                  />
                </div>
                <div>
                  <span style="font-size: 0.75rem; color: var(--text-muted);">End Time</span>
                  <input 
                    type="time" 
                    class="input-time" 
                    value=${formData.afternoonCommute.end} 
                    onInput=${(e) => updateThreshold('afternoonCommute', 'end', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- 3. Weather Thresholds (Caution vs Drive) -->
          <div>
            <div class="form-section-title">Commute Decision Thresholds</div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.5rem; text-align: center; font-size: 0.75rem; font-weight: 700; color: var(--text-muted);">
              <div>CAUTION THRESHOLD</div>
              <div>DRIVE THRESHOLD</div>
            </div>

            <!-- Min Temp -->
            <div class="form-group" style="margin-bottom: 0.65rem;">
              <div style="display: flex; justify-content: space-between;">
                <label class="form-label">Min Temperature (°F)</label>
                <input type="checkbox" checked=${formData.minTemp.enabled} onChange=${() => toggleField('minTemp')} />
              </div>
              <div class="form-row">
                <input type="number" class="input-number" value=${formData.minTemp.warn} onInput=${(e) => updateThreshold('minTemp', 'warn', e.target.value)} />
                <input type="number" class="input-number" value=${formData.minTemp.drive} onInput=${(e) => updateThreshold('minTemp', 'drive', e.target.value)} />
              </div>
            </div>

            <!-- Max Temp -->
            <div class="form-group" style="margin-bottom: 0.65rem;">
              <div style="display: flex; justify-content: space-between;">
                <label class="form-label">Max Temperature (°F)</label>
                <input type="checkbox" checked=${formData.maxTemp.enabled} onChange=${() => toggleField('maxTemp')} />
              </div>
              <div class="form-row">
                <input type="number" class="input-number" value=${formData.maxTemp.warn} onInput=${(e) => updateThreshold('maxTemp', 'warn', e.target.value)} />
                <input type="number" class="input-number" value=${formData.maxTemp.drive} onInput=${(e) => updateThreshold('maxTemp', 'drive', e.target.value)} />
              </div>
            </div>

            <!-- Precipitation Chance -->
            <div class="form-group" style="margin-bottom: 0.65rem;">
              <div style="display: flex; justify-content: space-between;">
                <label class="form-label">Max Rain / Precip Chance (%)</label>
                <input type="checkbox" checked=${formData.maxPop.enabled} onChange=${() => toggleField('maxPop')} />
              </div>
              <div class="form-row">
                <input type="number" class="input-number" value=${formData.maxPop.warn} onInput=${(e) => updateThreshold('maxPop', 'warn', e.target.value)} />
                <input type="number" class="input-number" value=${formData.maxPop.drive} onInput=${(e) => updateThreshold('maxPop', 'drive', e.target.value)} />
              </div>
            </div>

            <!-- Wind Speed -->
            <div class="form-group" style="margin-bottom: 0.65rem;">
              <div style="display: flex; justify-content: space-between;">
                <label class="form-label">Max Wind Speed (mph)</label>
                <input type="checkbox" checked=${formData.maxWind.enabled} onChange=${() => toggleField('maxWind')} />
              </div>
              <div class="form-row">
                <input type="number" class="input-number" value=${formData.maxWind.warn} onInput=${(e) => updateThreshold('maxWind', 'warn', e.target.value)} />
                <input type="number" class="input-number" value=${formData.maxWind.drive} onInput=${(e) => updateThreshold('maxWind', 'drive', e.target.value)} />
              </div>
            </div>

            <!-- Gust Speed -->
            <div class="form-group" style="margin-bottom: 0.65rem;">
              <div style="display: flex; justify-content: space-between;">
                <label class="form-label">Max Gust Speed (mph)</label>
                <input type="checkbox" checked=${formData.maxGust.enabled} onChange=${() => toggleField('maxGust')} />
              </div>
              <div class="form-row">
                <input type="number" class="input-number" value=${formData.maxGust.warn} onInput=${(e) => updateThreshold('maxGust', 'warn', e.target.value)} />
                <input type="number" class="input-number" value=${formData.maxGust.drive} onInput=${(e) => updateThreshold('maxGust', 'drive', e.target.value)} />
              </div>
            </div>

            <!-- Before Sunrise -->
            <div class="form-group" style="margin-bottom: 0.65rem;">
              <div style="display: flex; justify-content: space-between;">
                <label class="form-label">Pre-Sunrise Darkness (minutes)</label>
                <input type="checkbox" checked=${formData.beforeSunrise.enabled} onChange=${() => toggleField('beforeSunrise')} />
              </div>
              <div class="form-row">
                <input type="number" class="input-number" value=${formData.beforeSunrise.warn} onInput=${(e) => updateThreshold('beforeSunrise', 'warn', e.target.value)} />
                <input type="number" class="input-number" value=${formData.beforeSunrise.drive} onInput=${(e) => updateThreshold('beforeSunrise', 'drive', e.target.value)} />
              </div>
            </div>

            <!-- After Sunset -->
            <div class="form-group">
              <div style="display: flex; justify-content: space-between;">
                <label class="form-label">Post-Sunset Darkness (minutes)</label>
                <input type="checkbox" checked=${formData.afterSunset.enabled} onChange=${() => toggleField('afterSunset')} />
              </div>
              <div class="form-row">
                <input type="number" class="input-number" value=${formData.afterSunset.warn} onInput=${(e) => updateThreshold('afterSunset', 'warn', e.target.value)} />
                <input type="number" class="input-number" value=${formData.afterSunset.drive} onInput=${(e) => updateThreshold('afterSunset', 'drive', e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" style="margin-right: auto;" onClick=${handleReset}>Reset Defaults</button>
          <button type="button" class="btn btn-secondary" onClick=${onClose}>Cancel</button>
          <button type="button" class="btn btn-primary" onClick=${handleSave}>Save Settings</button>
        </div>
      </div>
    </div>
  `;
}
