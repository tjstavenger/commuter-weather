/**
 * Unified NOAA NWS REST Web Service Client (api.weather.gov)
 * Encapsulates all NOAA API endpoints, GeoJSON response parsing,
 * and data normalization for Commuter Weather.
 */

const NOAA_BASE_URL = 'https://api.weather.gov';
const USER_AGENT_HEADER = 'CommuterWeather/2.0 (contact@example.com)';

/**
 * Extracts a numeric wind or gust speed in mph from NOAA strings like "10 mph" or "10 to 15 mph".
 * Returns the higher value in ranges for conservative commuter safety assessment.
 * @param {string|number|null|undefined} speedStr
 * @returns {number} Speed in mph
 */
export function parseWindSpeed(speedStr) {
  if (typeof speedStr === 'number') return isNaN(speedStr) ? 0 : speedStr;
  if (!speedStr || typeof speedStr !== 'string') return 0;

  // Match all numbers in string (e.g. "10 to 15 mph" -> [10, 15])
  const matches = speedStr.match(/\d+(\.\d+)?/g);
  if (!matches || matches.length === 0) return 0;

  const numbers = matches.map(Number);
  return Math.max(...numbers);
}

/**
 * Normalizes an individual hourly period GeoJSON object from NOAA
 * @param {object} raw Raw period from properties.periods
 * @returns {object} Normalized hourly forecast object
 */
export function parseHourlyPeriod(raw) {
  if (!raw) return null;

  const popValue = raw.probabilityOfPrecipitation?.value;
  const humidityValue = raw.relativeHumidity?.value;
  const dewpointValue = raw.dewpoint?.value;

  return {
    number: raw.number,
    startTime: new Date(raw.startTime),
    endTime: new Date(raw.endTime),
    isDaytime: Boolean(raw.isDaytime),
    temperature: typeof raw.temperature === 'number' ? raw.temperature : 0,
    temperatureUnit: raw.temperatureUnit || 'F',
    pop: typeof popValue === 'number' && !isNaN(popValue) ? Math.round(popValue) : 0,
    relativeHumidity: typeof humidityValue === 'number' && !isNaN(humidityValue) ? Math.round(humidityValue) : null,
    dewpoint: typeof dewpointValue === 'number' && !isNaN(dewpointValue) ? Math.round(dewpointValue) : null,
    windSpeed: parseWindSpeed(raw.windSpeed),
    windSpeedRaw: raw.windSpeed || '',
    windDirection: raw.windDirection || '',
    gustSpeed: parseWindSpeed(raw.windGust),
    gustSpeedRaw: raw.windGust || null,
    shortForecast: raw.shortForecast || '',
    icon: raw.icon || ''
  };
}

/**
 * Normalizes an individual 12-hour period GeoJSON object from NOAA
 * @param {object} raw Raw period from properties.periods
 * @returns {object} Normalized daily forecast object
 */
export function parseDailyPeriod(raw) {
  if (!raw) return null;

  const popValue = raw.probabilityOfPrecipitation?.value;

  return {
    number: raw.number,
    name: raw.name || '',
    startTime: new Date(raw.startTime),
    endTime: new Date(raw.endTime),
    isDaytime: Boolean(raw.isDaytime),
    temperature: typeof raw.temperature === 'number' ? raw.temperature : 0,
    temperatureUnit: raw.temperatureUnit || 'F',
    temperatureTrend: raw.temperatureTrend || null,
    pop: typeof popValue === 'number' && !isNaN(popValue) ? Math.round(popValue) : 0,
    windSpeed: parseWindSpeed(raw.windSpeed),
    windSpeedRaw: raw.windSpeed || '',
    windDirection: raw.windDirection || '',
    shortForecast: raw.shortForecast || '',
    detailedForecast: raw.detailedForecast || '',
    icon: raw.icon || ''
  };
}

/**
 * Normalizes an active weather alert from NOAA
 * @param {object} feature GeoJSON feature from /alerts/active
 * @returns {object} Normalized alert object
 */
export function parseAlert(feature) {
  if (!feature?.properties) return null;
  const p = feature.properties;

  return {
    id: feature.id || p.id,
    event: p.event || 'Weather Advisory',
    headline: p.headline || p.event || '',
    severity: p.severity || 'Unknown',
    urgency: p.urgency || '',
    certainty: p.certainty || '',
    description: p.description || '',
    instruction: p.instruction || '',
    effective: p.effective ? new Date(p.effective) : null,
    expires: p.expires ? new Date(p.expires) : null
  };
}

export class NoaaClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || NOAA_BASE_URL;
    this.fetchFn = options.fetchFn || (typeof window !== 'undefined' ? window.fetch.bind(window) : globalThis.fetch);
  }

  async _request(url) {
    const headers = {
      'Accept': 'application/geo+json'
    };

    const response = await this.fetchFn(url, { headers });
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`NOAA API HTTP ${response.status} for ${url}: ${errorText || response.statusText}`);
    }
    return response.json();
  }

  /**
   * Resolves latitude and longitude into NOAA point metadata (WFO, grid X/Y, forecast URLs).
   * @param {number} lat
   * @param {number} lon
   * @returns {Promise<object>} Point metadata
   */
  async getPointMetadata(lat, lon) {
    // Format coordinates to 4 decimal places per NOAA guidance
    const latStr = Number(lat).toFixed(4);
    const lonStr = Number(lon).toFixed(4);
    const url = `${this.baseUrl}/points/${latStr},${lonStr}`;

    const data = await this._request(url);
    const props = data.properties;

    if (!props) {
      throw new Error(`Invalid point response from NOAA for (${latStr}, ${lonStr})`);
    }

    return {
      cwa: props.cwa,
      gridId: props.gridId,
      gridX: props.gridX,
      gridY: props.gridY,
      forecastUrl: props.forecast,
      forecastHourlyUrl: props.forecastHourly,
      timeZone: props.timeZone || 'UTC',
      city: props.relativeLocation?.properties?.city || 'Unknown',
      state: props.relativeLocation?.properties?.state || ''
    };
  }

  /**
   * Fetches the hourly forecast (up to 156 consecutive hours)
   * @param {string} hourlyUrl
   * @returns {Promise<Array<object>>} Normalized hourly periods
   */
  async getHourlyForecast(hourlyUrl) {
    const data = await this._request(hourlyUrl);
    const periods = data.properties?.periods || [];
    return periods.map(parseHourlyPeriod).filter(Boolean);
  }

  /**
   * Fetches the 12-hour period forecast (e.g. Today, Tonight, Monday...)
   * @param {string} forecastUrl
   * @returns {Promise<Array<object>>} Normalized daily periods
   */
  async getDailyForecast(forecastUrl) {
    const data = await this._request(forecastUrl);
    const periods = data.properties?.periods || [];
    return periods.map(parseDailyPeriod).filter(Boolean);
  }

  /**
   * Fetches active weather alerts for a coordinate point
   * @param {number} lat
   * @param {number} lon
   * @returns {Promise<Array<object>>} Normalized alerts list
   */
  async getActiveAlerts(lat, lon) {
    const latStr = Number(lat).toFixed(4);
    const lonStr = Number(lon).toFixed(4);
    const url = `${this.baseUrl}/alerts/active?point=${latStr},${lonStr}`;

    try {
      const data = await this._request(url);
      const features = data.features || [];
      return features.map(parseAlert).filter(Boolean);
    } catch (err) {
      console.warn('Could not fetch active weather alerts from NOAA:', err.message);
      return []; // Non-blocking: forecast can still be displayed if alerts fail
    }
  }

  /**
   * Unified master method: resolves coordinates and fetches hourly, daily, and alerts in parallel.
   * @param {number} lat
   * @param {number} lon
   * @returns {Promise<object>} Complete forecast data package
   */
  async fetchForecast(lat, lon) {
    const point = await this.getPointMetadata(lat, lon);

    // Fetch hourly, daily, and alerts concurrently
    const [hourly, daily, alerts] = await Promise.all([
      this.getHourlyForecast(point.forecastHourlyUrl),
      this.getDailyForecast(point.forecastUrl),
      this.getActiveAlerts(lat, lon)
    ]);

    return {
      point,
      hourly,
      daily,
      alerts,
      updatedAt: new Date()
    };
  }
}

export const noaaClient = new NoaaClient();
