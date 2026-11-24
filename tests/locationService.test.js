import test from 'node:test';
import assert from 'node:assert/strict';
import { searchCities } from '../js/locationService.js';

test('searchCities returns US locations with coordinates and filters other countries', async () => {
  let requestUrl;
  const fetchFn = async (url) => {
    requestUrl = new URL(url);
    return {
      ok: true,
      json: async () => ({
        results: [
          {
            id: 5798171,
            name: 'Ilwaco',
            country_code: 'US',
            admin1: 'Washington',
            latitude: 46.31,
            longitude: -124.04
          },
          {
            id: 123,
            name: 'Ilwaco',
            country_code: 'CA',
            admin1: 'Ontario',
            latitude: 46,
            longitude: -80
          }
        ]
      })
    };
  };

  const locations = await searchCities('Ilwaco, WA', fetchFn);

  assert.equal(requestUrl.searchParams.get('name'), 'Ilwaco, WA');
  assert.equal(requestUrl.searchParams.get('countryCode'), 'US');
  assert.deepEqual(locations, [{
    id: 5798171,
    zip: '',
    lat: 46.31,
    lon: -124.04,
    city: 'Ilwaco',
    state: 'Washington'
  }]);
});

test('searchCities skips short queries and reports HTTP errors', async () => {
  let requested = false;
  const noRequest = await searchCities('I', async () => {
    requested = true;
  });
  assert.deepEqual(noRequest, []);
  assert.equal(requested, false);

  await assert.rejects(
    searchCities('Ilwaco', async () => ({ ok: false, status: 503 })),
    /HTTP 503/
  );
});
