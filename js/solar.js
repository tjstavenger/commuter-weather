/**
 * Astronomical Solar Calculator (NOAA Solar Calculations algorithm)
 * Calculates sunrise and sunset for a given Date, Latitude, and Longitude.
 * 
 * Based on NOAA's Solar Calculator: https://gml.noaa.gov/grad/solcalc/
 */

function degToRad(angleDeg) {
  return (Math.PI * angleDeg) / 180.0;
}

function radToDeg(angleRad) {
  return (180.0 * angleRad) / Math.PI;
}

function calcTimeJulianCent(jd) {
  return (jd - 2451545.0) / 36525.0;
}

function calcGeomMeanLongSun(t) {
  let l0 = 280.46646 + t * (36000.76983 + t * 0.0003032);
  while (l0 > 360.0) l0 -= 360.0;
  while (l0 < 0.0) l0 += 360.0;
  return l0; // in degrees
}

function calcGeomMeanAnomalySun(t) {
  return 357.52911 + t * (35999.05029 - 0.0001537 * t); // in degrees
}

function calcEccentricityEarthOrbit(t) {
  return 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
}

function calcSunEqOfCenter(t) {
  const m = calcGeomMeanAnomalySun(t);
  const mrad = degToRad(m);
  const sinm = Math.sin(mrad);
  const sin2m = Math.sin(mrad + mrad);
  const sin3m = Math.sin(mrad + mrad + mrad);
  return sinm * (1.914602 - t * (0.004817 + 0.000014 * t)) + sin2m * (0.019993 - 0.000101 * t) + sin3m * 0.000289;
}

function calcSunTrueLong(t) {
  return calcGeomMeanLongSun(t) + calcSunEqOfCenter(t);
}

function calcSunApparentLong(t) {
  const o = calcSunTrueLong(t);
  const omega = 125.04 - 1934.136 * t;
  return o - 0.00569 - 0.00478 * Math.sin(degToRad(omega));
}

function calcMeanObliquityOfEcliptic(t) {
  const seconds = 21.448 - t * (46.8150 + t * (0.00059 - t * 0.001813));
  return 23.0 + (26.0 + seconds / 60.0) / 60.0;
}

function calcObliquityCorrection(t) {
  const e0 = calcMeanObliquityOfEcliptic(t);
  const omega = 125.04 - 1934.136 * t;
  return e0 + 0.00256 * Math.cos(degToRad(omega));
}

function calcSunDeclination(t) {
  const e = calcObliquityCorrection(t);
  const lambda = calcSunApparentLong(t);
  const sint = Math.sin(degToRad(e)) * Math.sin(degToRad(lambda));
  return radToDeg(Math.asin(sint));
}

function calcEquationOfTime(t) {
  const epsilon = calcObliquityCorrection(t);
  const l0 = calcGeomMeanLongSun(t);
  const e = calcEccentricityEarthOrbit(t);
  const m = calcGeomMeanAnomalySun(t);

  let y = Math.tan(degToRad(epsilon) / 2.0);
  y *= y;

  const sin2l0 = Math.sin(2.0 * degToRad(l0));
  const sinm = Math.sin(degToRad(m));
  const cos2l0 = Math.cos(2.0 * degToRad(l0));
  const sin4l0 = Math.sin(4.0 * degToRad(l0));
  const sin2m = Math.sin(2.0 * degToRad(m));

  const eTime = y * sin2l0 - 2.0 * e * sinm + 4.0 * e * y * sinm * cos2l0 - 0.5 * y * y * sin4l0 - 1.25 * e * e * sin2m;
  return radToDeg(eTime) * 4.0; // in minutes of time
}

function calcHourAngleSunrise(lat, solarDec) {
  const latRad = degToRad(lat);
  const sdRad = degToRad(solarDec);
  // Zenith 90 deg 50 arcmin standard for atmospheric refraction at horizon
  const HAarg = Math.cos(degToRad(90.833)) / (Math.cos(latRad) * Math.cos(sdRad)) - Math.tan(latRad) * Math.tan(sdRad);
  if (HAarg > 1.0) return null; // Polar night (sun never rises)
  if (HAarg < -1.0) return null; // Midnight sun (sun never sets)
  return Math.acos(HAarg); // in radians
}

function getJulianDay(date) {
  let year = date.getFullYear();
  let month = date.getMonth() + 1;
  const day = date.getDate();

  if (month <= 2) {
    year -= 1;
    month += 12;
  }

  const a = Math.floor(year / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + b - 1524.5;
}

/**
 * Calculates UTC sunrise or sunset minutes from midnight
 * @param {boolean} isSunrise true for sunrise, false for sunset
 * @param {number} jd Julian Day
 * @param {number} lat Latitude
 * @param {number} lon Longitude (negative for West)
 * @returns {number|null} Minutes from 00:00 UTC
 */
function calcSunriseSetUTC(isSunrise, jd, lat, lon) {
  const t = calcTimeJulianCent(jd);
  const eqTime = calcEquationOfTime(t);
  const solarDec = calcSunDeclination(t);
  const hourAngle = calcHourAngleSunrise(lat, solarDec);

  if (hourAngle === null) return null;

  const delta = lon + (isSunrise ? radToDeg(hourAngle) : -radToDeg(hourAngle));
  return 720 - 4.0 * delta - eqTime; // UTC minutes from midnight
}

/**
 * Calculate Sunrise and Sunset times for a given date and coordinates.
 * @param {Date} date The reference Date
 * @param {number} lat Latitude (-90 to 90)
 * @param {number} lon Longitude (-180 to 180)
 * @returns {{ sunrise: Date, sunset: Date }}
 */
export function getSunriseSunset(date, lat, lon) {
  const jd = getJulianDay(date);

  // UTC minutes from midnight
  const riseMinutesUTC = calcSunriseSetUTC(true, jd, lat, lon);
  const setMinutesUTC = calcSunriseSetUTC(false, jd, lat, lon);

  // Create base date for UTC day
  const sunrise = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0));
  const sunset = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0));

  if (riseMinutesUTC !== null) {
    sunrise.setUTCMinutes(Math.round(riseMinutesUTC));
  } else {
    // Fallback: 6:00 AM local
    sunrise.setHours(6, 0, 0, 0);
  }

  if (setMinutesUTC !== null) {
    sunset.setUTCMinutes(Math.round(setMinutesUTC));
  } else {
    // Fallback: 18:00 (6:00 PM) local
    sunset.setHours(18, 0, 0, 0);
  }

  return { sunrise, sunset };
}
