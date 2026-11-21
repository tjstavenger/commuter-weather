/**
 * Settings Persistence Service
 * Manages user commute preferences and weather thresholds in localStorage.
 */

const SETTINGS_KEY = 'commuter_weather_settings_v2';

export const DEFAULT_SETTINGS = {
  location: {
    zip: '99352',
    lat: 46.3,
    lon: -119.31,
    city: 'Richland',
    state: 'WA'
  },
  morningCommute: {
    enabled: true,
    start: '05:30',
    end: '06:30'
  },
  afternoonCommute: {
    enabled: true,
    start: '15:00',
    end: '16:00'
  },
  minTemp: {
    enabled: true,
    warn: 40,
    drive: 38
  },
  maxTemp: {
    enabled: true,
    warn: 95,
    drive: 100
  },
  maxPop: {
    enabled: true,
    warn: 20,
    drive: 50
  },
  maxWind: {
    enabled: true,
    warn: 20,
    drive: 25
  },
  maxGust: {
    enabled: true,
    warn: 20,
    drive: 25
  },
  beforeSunrise: {
    enabled: true,
    warn: 75,
    drive: 90
  },
  afterSunset: {
    enabled: true,
    warn: 75,
    drive: 90
  }
};

let inMemoryStorage = null;

function getStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // LocalStorage blocked (e.g. private browsing security restriction)
  }
  return null;
}

/**
 * Loads settings from localStorage, merging with defaults to guarantee all fields exist.
 * @returns {object} Full settings object
 */
export function loadSettings() {
  const storage = getStorage();
  let raw = null;

  if (storage) {
    try {
      raw = storage.getItem(SETTINGS_KEY);
    } catch (e) {
      console.warn('Could not read from localStorage:', e);
    }
  } else {
    raw = inMemoryStorage;
  }

  if (!raw) {
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }

  try {
    const parsed = JSON.parse(raw);
    // Deep merge with defaults to ensure any newly introduced settings fields are populated
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      location: { ...DEFAULT_SETTINGS.location, ...(parsed.location || {}) },
      morningCommute: { ...DEFAULT_SETTINGS.morningCommute, ...(parsed.morningCommute || {}) },
      afternoonCommute: { ...DEFAULT_SETTINGS.afternoonCommute, ...(parsed.afternoonCommute || {}) },
      minTemp: { ...DEFAULT_SETTINGS.minTemp, ...(parsed.minTemp || {}) },
      maxTemp: { ...DEFAULT_SETTINGS.maxTemp, ...(parsed.maxTemp || {}) },
      maxPop: { ...DEFAULT_SETTINGS.maxPop, ...(parsed.maxPop || {}) },
      maxWind: { ...DEFAULT_SETTINGS.maxWind, ...(parsed.maxWind || {}) },
      maxGust: { ...DEFAULT_SETTINGS.maxGust, ...(parsed.maxGust || {}) },
      beforeSunrise: { ...DEFAULT_SETTINGS.beforeSunrise, ...(parsed.beforeSunrise || {}) },
      afterSunset: { ...DEFAULT_SETTINGS.afterSunset, ...(parsed.afterSunset || {}) }
    };
  } catch (err) {
    console.error('Failed to parse settings JSON, resetting to defaults:', err);
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }
}

/**
 * Saves updated settings to localStorage.
 * @param {object} settings
 */
export function saveSettings(settings) {
  const json = JSON.stringify(settings);
  const storage = getStorage();

  if (storage) {
    try {
      storage.setItem(SETTINGS_KEY, json);
    } catch (e) {
      console.warn('Could not write to localStorage:', e);
    }
  }
  inMemoryStorage = json;
}

/**
 * Resets settings to application defaults.
 */
export function resetSettings() {
  saveSettings(DEFAULT_SETTINGS);
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
}
