/**
 * Location and Geocoding Service
 * Resolves US ZIP codes to coordinates and provides browser Geolocation.
 */

const ZIP_API_BASE = 'https://api.zippopotam.us/us';

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
