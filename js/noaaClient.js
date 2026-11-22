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

function observationValue(observation) {
  const value = observation?.value;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toTemperatureF(value, unitCode) {
  if (value === null) return null;
  return unitCode?.includes('degF') ? Math.round(value) : Math.round(value * 9 / 5 + 32);
}

function toWindMph(value, unitCode) {
  if (value === null) return null;
  if (unitCode?.includes('km_h-1')) return Math.round(value * 0.621371);
  if (unitCode?.includes('mi_h-1')) return Math.round(value);
  return Math.round(value * 2.23694);
}

function toInches(value, unitCode) {
  if (value === null) return null;
  if (unitCode?.includes(':mm')) return Number((value / 25.4).toFixed(2));
  if (unitCode?.includes(':in')) return Number(value.toFixed(2));
  return Number((value * 39.3701).toFixed(2));
}

function toMiles(value, unitCode) {
  if (value === null) return null;
  if (unitCode?.includes(':mi')) return Number(value.toFixed(1));
  if (unitCode?.includes(':km')) return Number((value * 0.621371).toFixed(1));
  return Number((value / 1609.34).toFixed(1));
}

function degreesToDirection(degrees) {
  if (degrees === null) return '';
  return ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'][
    Math.round(degrees / 22.5) % 16
  ];
}

/**
 * Normalizes the latest observation from a NOAA weather station.
 * @param {object} raw Raw observation response from /observations/latest
 * @param {object} station NOAA station feature
 * @returns {object|null} Current conditions
 */
export function parseCurrentObservation(raw, station = {}) {
  const properties = raw?.properties;
  if (!properties) return null;

  const temperature = properties.temperature;
  const windSpeed = properties.windSpeed;
  const windGust = properties.windGust;
  const precipitation = properties.precipitationLastHour;
  const visibility = properties.visibility;
  const humidity = observationValue(properties.relativeHumidity);

  return {
    stationName: station.properties?.name || '',
    timestamp: properties.timestamp ? new Date(properties.timestamp) : null,
    description: properties.textDescription || '',
    temperature: toTemperatureF(observationValue(temperature), temperature?.unitCode),
    windSpeed: toWindMph(observationValue(windSpeed), windSpeed?.unitCode),
    windGust: toWindMph(observationValue(windGust), windGust?.unitCode),
    windDirection: degreesToDirection(observationValue(properties.windDirection)),
    relativeHumidity: humidity === null ? null : Math.round(humidity),
    dewpoint: toTemperatureF(observationValue(properties.dewpoint), properties.dewpoint?.unitCode),
    precipitationLastHour: toInches(observationValue(precipitation), precipitation?.unitCode),
    visibility: toMiles(observationValue(visibility), visibility?.unitCode)
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
      observationStationsUrl: props.observationStations,
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
   * Fetches the latest observation from the nearest NOAA station.
   * @param {string} observationStationsUrl URL from point metadata
   * @returns {Promise<object|null>} Current observation, or null when unavailable
   */
  async getCurrentObservation(observationStationsUrl) {
    if (!observationStationsUrl) return null;

    try {
      const stations = await this._request(observationStationsUrl);
      const station = stations.features?.[0];
      if (!station?.id) return null;

      const stationUrl = station.id.endsWith('/') ? station.id : `${station.id}/`;
      const latest = await this._request(new URL('observations/latest', stationUrl).toString());
      return parseCurrentObservation(latest, station);
    } catch (err) {
      console.warn('Could not fetch current weather observations from NOAA:', err.message);
      return null;
    }
  }

  /**
   * Unified master method: resolves coordinates and fetches forecasts, observations, and alerts.
   * @param {number} lat
   * @param {number} lon
   * @returns {Promise<object>} Complete forecast data package
   */
  async fetchForecast(lat, lon) {
    const point = await this.getPointMetadata(lat, lon);

    // Fetch hourly, daily, current observations, and alerts concurrently
    const [hourly, daily, currentConditions, alerts] = await Promise.all([
      this.getHourlyForecast(point.forecastHourlyUrl),
      this.getDailyForecast(point.forecastUrl),
      this.getCurrentObservation(point.observationStationsUrl),
      this.getActiveAlerts(lat, lon)
    ]);

    return {
      point,
      hourly,
      daily,
      currentConditions,
      alerts,
      updatedAt: new Date()
    };
  }
}

export const noaaClient = new NoaaClient();
