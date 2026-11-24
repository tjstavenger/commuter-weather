import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseWindSpeed,
  parseHourlyPeriod,
  parseCurrentObservation,
  parseDailyPeriod,
  parseAlert,
  NoaaClient
} from '../js/noaaClient.js';

test('parseWindSpeed extracts numeric speeds and range maximums', () => {
  assert.equal(parseWindSpeed('10 mph'), 10);
  assert.equal(parseWindSpeed('5 to 15 mph'), 15);
  assert.equal(parseWindSpeed('20 to 25 mph'), 25);
  assert.equal(parseWindSpeed('Calm'), 0);
  assert.equal(parseWindSpeed(null), 0);
  assert.equal(parseWindSpeed(undefined), 0);
  assert.equal(parseWindSpeed(18), 18);
});

test('parseHourlyPeriod normalizes full NOAA hourly GeoJSON correctly', () => {
  const sampleRaw = {
    number: 1,
    startTime: '2026-11-21T06:00:00-08:00',
    endTime: '2026-11-21T07:00:00-08:00',
    isDaytime: true,
    temperature: 42,
    temperatureUnit: 'F',
    probabilityOfPrecipitation: {
      unitCode: 'wmoUnit:percent',
      value: 15
    },
    dewpoint: {
      unitCode: 'wmoUnit:degC',
      value: 2.22
    },
    relativeHumidity: {
      unitCode: 'wmoUnit:percent',
      value: 78
    },
    windSpeed: '8 to 12 mph',
    windDirection: 'WNW',
    windGust: '22 mph',
    shortForecast: 'Partly Cloudy',
    icon: 'https://api.weather.gov/icons/land/day/bkn?size=small'
  };

  const parsed = parseHourlyPeriod(sampleRaw);

  assert.equal(parsed.number, 1);
  assert.equal(parsed.temperature, 42);
  assert.equal(parsed.temperatureUnit, 'F');
  assert.equal(parsed.pop, 15);
  assert.equal(parsed.relativeHumidity, 78);
  assert.equal(parsed.windSpeed, 12); // Extracted max of range 8 to 12
  assert.equal(parsed.windSpeedRaw, '8 to 12 mph');
  assert.equal(parsed.windDirection, 'WNW');
  assert.equal(parsed.gustSpeed, 22);
  assert.equal(parsed.shortForecast, 'Partly Cloudy');
  assert.equal(parsed.isDaytime, true);
  assert.ok(parsed.startTime instanceof Date);
  assert.ok(parsed.endTime instanceof Date);
});

test('parseHourlyPeriod handles null or missing NOAA optional fields gracefully', () => {
  const minimalRaw = {
    number: 2,
    startTime: '2026-11-21T07:00:00-08:00',
    endTime: '2026-11-21T08:00:00-08:00',
    temperature: 39,
    probabilityOfPrecipitation: { value: null },
    relativeHumidity: null,
    windSpeed: '5 mph',
    windGust: null
  };

  const parsed = parseHourlyPeriod(minimalRaw);

  assert.equal(parsed.temperature, 39);
  assert.equal(parsed.pop, 0); // null pop defaults to 0%
  assert.equal(parsed.relativeHumidity, null);
  assert.equal(parsed.windSpeed, 5);
  assert.equal(parsed.gustSpeed, 0); // null gust defaults to 0
  assert.equal(parsed.gustSpeedRaw, null);
});

test('parseCurrentObservation converts NOAA station measurements to display units', () => {
  const parsed = parseCurrentObservation({
    properties: {
      timestamp: '2026-11-21T14:00:00+00:00',
      textDescription: 'Light Rain',
      temperature: { value: 10, unitCode: 'wmoUnit:degC' },
      windSpeed: { value: 10, unitCode: 'wmoUnit:m_s-1' },
      windGust: { value: 15, unitCode: 'wmoUnit:m_s-1' },
      windDirection: { value: 315, unitCode: 'wmoUnit:degree_(angle)' },
      relativeHumidity: { value: 86.803362953546, unitCode: 'wmoUnit:percent' },
      dewpoint: { value: 5, unitCode: 'wmoUnit:degC' },
      precipitationLastHour: { value: 2.54, unitCode: 'wmoUnit:mm' },
      visibility: { value: 1609.34, unitCode: 'wmoUnit:m' }
    }
  }, { properties: { name: 'Airport Station' } });

  assert.equal(parsed.stationName, 'Airport Station');
  assert.equal(parsed.description, 'Light Rain');
  assert.equal(parsed.temperature, 50);
  assert.equal(parsed.windSpeed, 22);
  assert.equal(parsed.windGust, 34);
  assert.equal(parsed.windDirection, 'NW');
  assert.equal(parsed.relativeHumidity, 87);
  assert.equal(parsed.dewpoint, 41);
  assert.equal(parsed.precipitationLastHour, 0.1);
  assert.equal(parsed.visibility, 1);
  assert.ok(parsed.timestamp instanceof Date);
});

test('parseDailyPeriod normalizes 12-hour period forecast correctly', () => {
  const sampleDaily = {
    number: 1,
    name: 'Today',
    startTime: '2026-11-21T06:00:00-08:00',
    endTime: '2026-11-21T18:00:00-08:00',
    isDaytime: true,
    temperature: 54,
    temperatureUnit: 'F',
    probabilityOfPrecipitation: { value: 20 },
    windSpeed: '10 mph',
    windDirection: 'NW',
    shortForecast: 'Sunny',
    detailedForecast: 'Sunny, with a high near 54. Northwest wind around 10 mph.'
  };

  const parsed = parseDailyPeriod(sampleDaily);

  assert.equal(parsed.name, 'Today');
  assert.equal(parsed.temperature, 54);
  assert.equal(parsed.pop, 20);
  assert.equal(parsed.windSpeed, 10);
  assert.equal(parsed.windDirection, 'NW');
  assert.equal(parsed.detailedForecast, 'Sunny, with a high near 54. Northwest wind around 10 mph.');
});

test('parseAlert normalizes active NWS advisory feature', () => {
  const sampleAlert = {
    id: 'https://api.weather.gov/alerts/urn:oid:2.49.0.1.840.0.sample',
    properties: {
      event: 'Wind Advisory',
      headline: 'Wind Advisory in effect from 1 PM to 8 PM PST',
      severity: 'Moderate',
      description: 'Southwest winds 25 to 35 mph with gusts up to 50 mph expected.',
      instruction: 'Use caution when traveling on bridges and exposed highways.',
      effective: '2026-11-21T13:00:00-08:00',
      expires: '2026-11-21T20:00:00-08:00'
    }
  };

  const parsed = parseAlert(sampleAlert);

  assert.equal(parsed.event, 'Wind Advisory');
  assert.equal(parsed.severity, 'Moderate');
  assert.ok(parsed.headline.includes('Wind Advisory'));
  assert.ok(parsed.effective instanceof Date);
  assert.ok(parsed.expires instanceof Date);
});

test('NoaaClient resolves point coordinates and coordinates endpoint URLs', async () => {
  const mockFetch = async (url) => {
    if (url.includes('/points/46.3000,-119.3100')) {
      return {
        ok: true,
        json: async () => ({
          properties: {
            cwa: 'PDT',
            gridId: 'PDT',
            gridX: 110,
            gridY: 75,
            forecast: 'https://api.weather.gov/gridpoints/PDT/110,75/forecast',
            forecastHourly: 'https://api.weather.gov/gridpoints/PDT/110,75/forecast/hourly',
            timeZone: 'America/Los_Angeles',
            relativeLocation: {
              properties: {
                city: 'Richland',
                state: 'WA'
              }
            }
          }
        })
      };
    }
    throw new Error(`Unexpected URL in mock: ${url}`);
  };

  const client = new NoaaClient({ fetchFn: mockFetch });
  const point = await client.getPointMetadata(46.3, -119.31);

  assert.equal(point.gridId, 'PDT');
  assert.equal(point.city, 'Richland');
  assert.equal(point.state, 'WA');
  assert.equal(point.forecastHourlyUrl, 'https://api.weather.gov/gridpoints/PDT/110,75/forecast/hourly');
});

test('NoaaClient.fetchForecast orchestrates point, hourly, daily, and alerts in parallel', async () => {
  const mockFetch = async (url) => {
    if (url.includes('/points/')) {
      return {
        ok: true,
        json: async () => ({
          properties: {
            gridId: 'PDT',
            gridX: 110,
            gridY: 75,
            forecast: 'https://api.weather.gov/gridpoints/PDT/110,75/forecast',
            forecastHourly: 'https://api.weather.gov/gridpoints/PDT/110,75/forecast/hourly',
            observationStations: 'https://api.weather.gov/gridpoints/PDT/110,75/stations',
            relativeLocation: { properties: { city: 'Richland', state: 'WA' } }
          }
        })
      };
    }
    if (url.endsWith('/gridpoints/PDT/110,75')) {
      return {
        ok: true,
        json: async () => ({
          properties: {
            windGust: {
              uom: 'wmoUnit:km_h-1',
              values: [
                { validTime: '2026-11-21T04:00:00Z/PT3H', value: 44.8 }
              ]
            }
          }
        })
      };
    }
    if (url.includes('/forecast/hourly')) {
      return {
        ok: true,
        json: async () => ({
          properties: {
            periods: [
              { number: 1, startTime: '2026-11-21T05:00:00Z', endTime: '2026-11-21T06:00:00Z', temperature: 45, windSpeed: '5 mph' }
            ]
          }
        })
      };
    }
    if (url.includes('/forecast')) {
      return {
        ok: true,
        json: async () => ({
          properties: {
            periods: [
              { number: 1, name: 'Today', startTime: '2026-11-21T06:00:00Z', endTime: '2026-11-21T18:00:00Z', temperature: 55 }
            ]
          }
        })
      };
    }
    if (url.includes('/alerts/active')) {
      return {
        ok: true,
        json: async () => ({
          features: []
        })
      };
    }
    if (url.endsWith('/stations')) {
      return {
        ok: true,
        json: async () => ({
          features: [
            { id: 'https://api.weather.gov/stations/KRLD', properties: { name: 'Richland Airport' } }
          ]
        })
      };
    }
    if (url.endsWith('/stations/KRLD/observations/latest')) {
      return {
        ok: true,
        json: async () => ({
          properties: {
            timestamp: '2026-11-21T14:00:00+00:00',
            temperature: { value: 10, unitCode: 'wmoUnit:degC' },
            windSpeed: { value: 5, unitCode: 'wmoUnit:m_s-1' }
          }
        })
      };
    }
    throw new Error(`Unexpected mock URL: ${url}`);
  };

  const client = new NoaaClient({ fetchFn: mockFetch });
  const result = await client.fetchForecast(46.3, -119.31);

  assert.equal(result.point.city, 'Richland');
  assert.equal(result.hourly.length, 1);
  assert.equal(result.hourly[0].temperature, 45);
  assert.equal(result.hourly[0].gustSpeed, 28);
  assert.equal(result.daily.length, 1);
  assert.equal(result.daily[0].name, 'Today');
  assert.equal(result.currentConditions.stationName, 'Richland Airport');
  assert.equal(result.currentConditions.temperature, 50);
  assert.equal(result.currentConditions.windSpeed, 11);
  assert.deepEqual(result.alerts, []);
  assert.ok(result.updatedAt instanceof Date);
});
