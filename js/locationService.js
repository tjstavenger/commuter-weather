/**
 * Location and Geocoding Service
 * Resolves US ZIP codes, city names, and browser Geolocation.
 */

const ZIP_API_BASE = 'https://api.zippopotam.us/us';
const CITY_SEARCH_API = 'https://geocoding-api.open-meteo.com/v1/search';

/**
 * Resolves a 5-digit US ZIP code to latitude, longitude, city, and state.
 * @param {string|number} zipCode 5-digit US ZIP code
 * @param {Function} fetchFn Optional fetch dependency injection for testing
 * @returns {Promise<{ zip: string, lat: number, lon: number, city: string, state: string }>}
 */
export async function lookupZip(zipCode, fetchFn = (typeof window !== 'undefined' ? window.fetch.bind(window) : globalThis.fetch)) {
  const cleanZip = String(zipCode).trim();
  if (!/^\d{5}$/.test(cleanZip)) {
    throw new Error('Please enter a valid 5-digit US ZIP code.');
  }

  const url = `${ZIP_API_BASE}/${cleanZip}`;
  const response = await fetchFn(url);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`ZIP code ${cleanZip} was not found.`);
    }
    throw new Error(`Location lookup failed (HTTP ${response.status}).`);
  }

  const data = await response.json();
  const place = data.places?.[0];

  if (!place) {
    throw new Error(`No geographic data found for ZIP code ${cleanZip}.`);
  }

  return {
    zip: cleanZip,
    lat: parseFloat(place.latitude),
    lon: parseFloat(place.longitude),
    city: place['place name'] || '',
    state: place['state abbreviation'] || ''
  };
}

/**
 * Searches US cities using Open-Meteo's GeoNames-backed geocoding API.
 * @param {string} query City name, optionally followed by a state
 * @param {Function} fetchFn Optional fetch dependency injection for testing
 * @returns {Promise<Array<{ id: number, zip: string, lat: number, lon: number, city: string, state: string }>>}
 */
export async function searchCities(query, fetchFn = (typeof window !== 'undefined' ? window.fetch.bind(window) : globalThis.fetch)) {
  const cleanQuery = String(query).trim();
  if (cleanQuery.length < 2) return [];

  const url = new URL(CITY_SEARCH_API);
  url.searchParams.set('name', cleanQuery);
  url.searchParams.set('count', '8');
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');
  url.searchParams.set('countryCode', 'US');

  const response = await fetchFn(url.toString());
  if (!response.ok) {
    throw new Error(`City search failed (HTTP ${response.status}).`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.reason || 'City search failed.');
  }
  if (data.results === undefined) return [];
  if (!Array.isArray(data.results)) {
    throw new Error('City search returned an invalid response.');
  }

  return data.results
    .filter(place => place.country_code === 'US')
    .map(place => {
      const lat = Number(place.latitude);
      const lon = Number(place.longitude);
      if (!Number.isFinite(place.id) || !place.name || !Number.isFinite(lat) || !Number.isFinite(lon)) {
        throw new Error('City search returned an invalid location.');
      }

      return {
        id: place.id,
        zip: '',
        lat,
        lon,
        city: place.name,
        state: place.admin1 || ''
      };
    });
}

/**
 * Retrieves coordinates from the device browser GPS using navigator.geolocation.
 * @returns {Promise<{ lat: number, lon: number, city: string, state: string }>}
 */
export function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          city: 'My Location',
          state: '',
          zip: ''
        });
      },
      (error) => {
        let msg = 'Unable to retrieve location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission denied by user.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Location information is currently unavailable.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out.';
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  });
}
