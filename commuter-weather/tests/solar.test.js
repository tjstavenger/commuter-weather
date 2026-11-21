import test from 'node:test';
import assert from 'node:assert/strict';
import { getSunriseSunset } from '../js/solar.js';

test('getSunriseSunset calculates accurate sunrise and sunset for Richland WA', () => {
  // Test equinox (approx Sept 21) in Richland WA
  const date = new Date('2026-09-21T12:00:00Z');
  const lat = 46.3;
  const lon = -119.31;

  const { sunrise, sunset } = getSunriseSunset(date, lat, lon);

  assert.ok(sunrise instanceof Date);
  assert.ok(sunset instanceof Date);

  // Sunrise should be before sunset
  assert.ok(sunrise.getTime() < sunset.getTime(), 'Sunrise must precede Sunset');

  // In UTC for longitude -119.31 (-8h), solar noon is ~19:57 UTC
  // Sunrise should be around 13:45 - 14:00 UTC (05:45 - 06:00 PDT)
  const riseUtcHours = sunrise.getUTCHours() + sunrise.getUTCMinutes() / 60;
  assert.ok(riseUtcHours >= 13 && riseUtcHours <= 15, `Expected sunrise UTC between 13 and 15, got ${riseUtcHours}`);

  // Sunset should be around 01:50 - 02:10 UTC next day or 01:00 - 03:00 UTC
  const setUtcHours = sunset.getUTCHours() + sunset.getUTCMinutes() / 60;
  assert.ok(setUtcHours >= 1 && setUtcHours <= 3, `Expected sunset UTC between 1 and 3, got ${setUtcHours}`);
});

test('getSunriseSunset handles solstice differences correctly', () => {
  const lat = 46.3;
  const lon = -119.31;

  // Summer solstice (~June 21): Long day
  const summerDate = new Date('2026-06-21T12:00:00Z');
  const summer = getSunriseSunset(summerDate, lat, lon);
  const summerDayLengthHours = (summer.sunset.getTime() - summer.sunrise.getTime()) / (1000 * 60 * 60);

  // Winter solstice (~Dec 21): Short day
  const winterDate = new Date('2026-12-21T12:00:00Z');
  const winter = getSunriseSunset(winterDate, lat, lon);
  const winterDayLengthHours = (winter.sunset.getTime() - winter.sunrise.getTime()) / (1000 * 60 * 60);

  // Summer day length in Washington state is ~15.5 - 16 hours; winter is ~8.5 - 9 hours
  assert.ok(summerDayLengthHours > 15, `Summer daylight should be > 15h, was ${summerDayLengthHours}`);
  assert.ok(winterDayLengthHours < 10, `Winter daylight should be < 10h, was ${winterDayLengthHours}`);
  assert.ok(summerDayLengthHours > winterDayLengthHours, 'Summer day must be longer than winter day');
});
