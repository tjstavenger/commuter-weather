import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STATUS,
  calculateWindChill,
  calculateHeatIndex,
  calculateApparentTemperature,
  evaluateHour,
  evaluatePeriod,
  isTimeInWindow
} from '../js/decisionEngine.js';
import { DEFAULT_SETTINGS } from '../js/settingsService.js';

test('calculateWindChill correctly computes wind chill under 50F with wind', () => {
  // At 35F and 15mph, wind chill is ~25F
  const wc = calculateWindChill(35, 15);
  assert.equal(wc, 25);

  // At 55F, formula does not apply (returns real temp)
  assert.equal(calculateWindChill(55, 15), 55);

  // At 30F and 2mph, wind is too low (returns real temp)
  assert.equal(calculateWindChill(30, 2), 30);
});

test('calculateHeatIndex computes heat index above 75F with humidity', () => {
  // At 85F and 70% humidity, heat index is ~93F
  const hi = calculateHeatIndex(85, 70);
  assert.equal(hi, 93);

  // At 70F, formula does not apply
  assert.equal(calculateHeatIndex(70, 70), 70);
});

test('isTimeInWindow correctly checks time range 05:30 to 06:30', () => {
  const d5am = new Date('2026-11-21T05:00:00');
  const d530 = new Date('2026-11-21T05:30:00');
  const d600 = new Date('2026-11-21T06:00:00');
  const d630 = new Date('2026-11-21T06:30:00');
  const d700 = new Date('2026-11-21T07:00:00');

  assert.equal(isTimeInWindow(d5am, '05:30', '06:30'), false);
  assert.equal(isTimeInWindow(d530, '05:30', '06:30'), true);
  assert.equal(isTimeInWindow(d600, '05:30', '06:30'), true);
  assert.equal(isTimeInWindow(d630, '05:30', '06:30'), true);
  assert.equal(isTimeInWindow(d700, '05:30', '06:30'), false);
});

test('evaluateHour verifies temperature thresholds (warn 40F, drive 38F)', () => {
  const mockSun = {
    sunrise: new Date('2026-11-21T07:00:00'),
    sunset: new Date('2026-11-21T16:30:00')
  };

  // 1. Mild 50F, low wind, 0% POP -> RIDE
  const hourRide = {
    startTime: new Date('2026-11-21T10:00:00'),
    temperature: 50,
    windSpeed: 5,
    gustSpeed: 0,
    pop: 0
  };
  const evalRide = evaluateHour(hourRide, DEFAULT_SETTINGS, mockSun);
  assert.equal(evalRide.status, STATUS.RIDE);
  assert.equal(evalRide.reasons.length, 0);

  // 2. 39F (between 38F drive and 40F warn) -> CAUTION with reason "Cold 39°"
  const hourCaution = {
    ...hourRide,
    temperature: 39
  };
  const evalCaution = evaluateHour(hourCaution, DEFAULT_SETTINGS, mockSun);
  assert.equal(evalCaution.status, STATUS.CAUTION);
  assert.ok(evalCaution.reasons.includes('Cold 39°'));

  // 3. 37F (below 38F drive) -> DRIVE with reason "Cold 37°"
  const hourDrive = {
    ...hourRide,
    temperature: 37
  };
  const evalDrive = evaluateHour(hourDrive, DEFAULT_SETTINGS, mockSun);
  assert.equal(evalDrive.status, STATUS.DRIVE);
  assert.ok(evalDrive.reasons.includes('Cold 37°'));
});

test('evaluateHour verifies wind, gusts, and rain thresholds', () => {
  const mockSun = { sunrise: new Date('2026-11-21T06:00:00'), sunset: new Date('2026-11-21T18:00:00') };

  // Wind 22mph (warn is 20, drive is 25) -> CAUTION
  const hourWindWarn = {
    startTime: new Date('2026-11-21T12:00:00'),
    temperature: 55,
    windSpeed: 22,
    gustSpeed: 0,
    pop: 10
  };
  assert.equal(evaluateHour(hourWindWarn, DEFAULT_SETTINGS, mockSun).status, STATUS.CAUTION);

  // Gusts 28mph (drive is 25) -> DRIVE
  const hourGustDrive = {
    startTime: new Date('2026-11-21T12:00:00'),
    temperature: 55,
    windSpeed: 10,
    gustSpeed: 28,
    pop: 10
  };
  const evalGust = evaluateHour(hourGustDrive, DEFAULT_SETTINGS, mockSun);
  assert.equal(evalGust.status, STATUS.DRIVE);
  assert.ok(evalGust.reasons.includes('Gusts 28mph'));

  // Rain 60% (drive is 50) -> DRIVE
  const hourRainDrive = {
    startTime: new Date('2026-11-21T12:00:00'),
    temperature: 55,
    windSpeed: 10,
    gustSpeed: 15,
    pop: 60
  };
  const evalRain = evaluateHour(hourRainDrive, DEFAULT_SETTINGS, mockSun);
  assert.equal(evalRain.status, STATUS.DRIVE);
  assert.ok(evalRain.reasons.includes('Rain 60%'));
});

test('evaluatePeriod flags DRIVE when morning commute window (05:30-06:30) is hazardous', () => {
  const mockSun = { sunrise: new Date('2026-11-23T06:30:00'), sunset: new Date('2026-11-23T16:30:00') };

  // Monday daytime period (2026-11-23 is Monday)
  const period = {
    name: 'Monday',
    isDaytime: true,
    startTime: new Date('2026-11-23T05:00:00'),
    endTime: new Date('2026-11-23T18:00:00')
  };

  const hours = [
    // 05:00 - Favorable
    { startTime: new Date('2026-11-23T05:00:00'), temperature: 45, windSpeed: 5, gustSpeed: 0, pop: 0 },
    // 06:00 - Morning Commute Window (05:30-06:30): Severe cold 35F (drive threshold 38F)
    { startTime: new Date('2026-11-23T06:00:00'), temperature: 35, windSpeed: 5, gustSpeed: 0, pop: 0 },
    // 12:00 - Midday favorable 55F
    { startTime: new Date('2026-11-23T12:00:00'), temperature: 55, windSpeed: 5, gustSpeed: 0, pop: 0 },
    // 15:30 - Afternoon Commute Window (15:00-16:00): Favorable 50F
    { startTime: new Date('2026-11-23T15:30:00'), temperature: 50, windSpeed: 5, gustSpeed: 0, pop: 0 }
  ];

  const result = evaluatePeriod(period, hours, DEFAULT_SETTINGS, mockSun);

  assert.equal(result.status, STATUS.DRIVE);
  assert.ok(result.reasons.includes('Cold 35°'));
});

test('evaluatePeriod flags CAUTION when midday weather is bad but commute hours are clear', () => {
  const mockSun = { sunrise: new Date('2026-11-23T06:00:00'), sunset: new Date('2026-11-23T17:00:00') };

  const period = {
    name: 'Monday',
    isDaytime: true,
    startTime: new Date('2026-11-23T05:00:00'),
    endTime: new Date('2026-11-23T18:00:00')
  };

  const hours = [
    // 06:00 - Morning Commute (05:30-06:30): Clear 45F, calm
    { startTime: new Date('2026-11-23T06:00:00'), temperature: 45, windSpeed: 5, gustSpeed: 0, pop: 0 },
    // 12:00 - Midday storm: Rain 70% (DRIVE condition for that hour)
    { startTime: new Date('2026-11-23T12:00:00'), temperature: 50, windSpeed: 10, gustSpeed: 0, pop: 70 },
    // 15:30 - Afternoon Commute (15:00-16:00): Clear 52F, calm
    { startTime: new Date('2026-11-23T15:30:00'), temperature: 52, windSpeed: 5, gustSpeed: 0, pop: 0 }
  ];

  const result = evaluatePeriod(period, hours, DEFAULT_SETTINGS, mockSun);

  // Commute was clear, but midday was bad -> Period is CAUTION to warn rider
  assert.equal(result.status, STATUS.CAUTION);
  assert.ok(result.reasons.includes('Rain 70%'));
});

test('evaluatePeriod summarizes repeated triggers using the most severe value', () => {
  const period = {
    name: 'Tonight',
    isDaytime: false,
    startTime: new Date('2026-11-23T18:00:00'),
    endTime: new Date('2026-11-23T20:00:00')
  };
  const hours = [
    { startTime: new Date('2026-11-23T18:00:00'), temperature: 50, windSpeed: 5, gustSpeed: 0, pop: 99 },
    { startTime: new Date('2026-11-23T19:00:00'), temperature: 50, windSpeed: 5, gustSpeed: 0, pop: 92 }
  ];

  const result = evaluatePeriod(period, hours, DEFAULT_SETTINGS, {});

  assert.equal(result.status, STATUS.DRIVE);
  assert.deepEqual(result.reasons, ['Rain 99%']);
});
