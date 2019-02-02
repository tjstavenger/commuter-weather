/**
 * Use the NOAA sunrise/sunset calculation algorithm for the given date, lat, & lon.
 * 
 * @param date Date for which to calculate sunrise/sunset
 * @param lat latitude
 * @param lon longitude
 * @returns {___anonymous515_517} Object with sunrise/sunset values
 */
function getSunriseSunset(date, lat, lon) {
	var jday = getJD(date);
	
	var riseMinutes = calcSunriseSetUTC(1, jday, lat, lon) - date.getTimezoneOffset();	
	var sunrise = new Date(date.valueOf());
	sunrise.set({ hour: 0, minute: 0 });
	sunrise.addMinutes(riseMinutes);
	
	var setMinutes = calcSunriseSetUTC(0, jday, lat, lon) - date.getTimezoneOffset();
	var sunset = new Date(date.valueOf());
	sunset.set({ hour: 0, minute: 0 });
	sunset.addMinutes(setMinutes);
	
	var sun = new Object();
	sun.sunrise = sunrise; 
	sun.sunset = sunset;
	
	return sun;
}

/********************************************************
 * Sunrise & sunset calculation for a date at a lat/lon
 * as found at http://www.esrl.noaa.gov/gmd/grad/solcalc/
 ********************************************************/

function calcTimeJulianCent(jd)
{
  var T = (jd - 2451545.0)/36525.0;
  return T;
}

function radToDeg(angleRad) 
{
  return (180.0 * angleRad / Math.PI);
}

function degToRad(angleDeg) 
{
  return (Math.PI * angleDeg / 180.0);
}

function calcGeomMeanLongSun(t)
{
  var L0 = 280.46646 + t * (36000.76983 + t*(0.0003032))
  while(L0 > 360.0)
  {
    L0 -= 360.0
  }
  while(L0 < 0.0)
  {
    L0 += 360.0
  }
  return L0		// in degrees
}

function calcGeomMeanAnomalySun(t)
{
  var M = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  return M;		// in degrees
}

function calcEccentricityEarthOrbit(t)
{
  var e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  return e;		// unitless
}

function calcSunEqOfCenter(t)
{
  var m = calcGeomMeanAnomalySun(t);
  var mrad = degToRad(m);
  var sinm = Math.sin(mrad);
  var sin2m = Math.sin(mrad+mrad);
  var sin3m = Math.sin(mrad+mrad+mrad);
  var C = sinm * (1.914602 - t * (0.004817 + 0.000014 * t)) + sin2m * (0.019993 - 0.000101 * t) + sin3m * 0.000289;
  return C;		// in degrees
}

function calcSunTrueLong(t)
{
  var l0 = calcGeomMeanLongSun(t);
  var c = calcSunEqOfCenter(t);
  var O = l0 + c;
  return O;		// in degrees
}

function calcSunApparentLong(t)
{
  var o = calcSunTrueLong(t);
  var omega = 125.04 - 1934.136 * t;
  var lambda = o - 0.00569 - 0.00478 * Math.sin(degToRad(omega));
  return lambda;		// in degrees
}

function calcMeanObliquityOfEcliptic(t)
{
  var seconds = 21.448 - t*(46.8150 + t*(0.00059 - t*(0.001813)));
  var e0 = 23.0 + (26.0 + (seconds/60.0))/60.0;
  return e0;		// in degrees
}

function calcObliquityCorrection(t)
{
  var e0 = calcMeanObliquityOfEcliptic(t);
  var omega = 125.04 - 1934.136 * t;
  var e = e0 + 0.00256 * Math.cos(degToRad(omega));
  return e;		// in degrees
}

function calcSunDeclination(t)
{
  var e = calcObliquityCorrection(t);
  var lambda = calcSunApparentLong(t);

  var sint = Math.sin(degToRad(e)) * Math.sin(degToRad(lambda));
  var theta = radToDeg(Math.asin(sint));
  return theta;		// in degrees
}

function calcEquationOfTime(t)
{
  var epsilon = calcObliquityCorrection(t);
  var l0 = calcGeomMeanLongSun(t);
  var e = calcEccentricityEarthOrbit(t);
  var m = calcGeomMeanAnomalySun(t);

  var y = Math.tan(degToRad(epsilon)/2.0);
  y *= y;

  var sin2l0 = Math.sin(2.0 * degToRad(l0));
  var sinm   = Math.sin(degToRad(m));
  var cos2l0 = Math.cos(2.0 * degToRad(l0));
  var sin4l0 = Math.sin(4.0 * degToRad(l0));
  var sin2m  = Math.sin(2.0 * degToRad(m));

  var Etime = y * sin2l0 - 2.0 * e * sinm + 4.0 * e * y * sinm * cos2l0 - 0.5 * y * y * sin4l0 - 1.25 * e * e * sin2m;
  return radToDeg(Etime)*4.0;	// in minutes of time
}

function calcHourAngleSunrise(lat, solarDec)
{
  var latRad = degToRad(lat);
  var sdRad  = degToRad(solarDec);
  var HAarg = (Math.cos(degToRad(90.833))/(Math.cos(latRad)*Math.cos(sdRad))-Math.tan(latRad) * Math.tan(sdRad));
  var HA = Math.acos(HAarg);
  return HA;		// in radians (for sunset, use -HA)
}

function getJD(date)
{
  var docmonth = date.getMonth() + 1; // JavaScript months are 0 based
  var docday =   date.getDate();
  var docyear =  date.getFullYear();

  if (docmonth <= 2) {
    docyear -= 1;
    docmonth += 12;
  }
  
  var A = Math.floor(docyear/100);
  var B = 2 - A + Math.floor(A/4);
  var JD = Math.floor(365.25*(docyear + 4716)) + Math.floor(30.6001*(docmonth+1)) + docday + B - 1524.5;
  return JD;
}

function calcSunriseSetUTC(rise, JD, latitude, longitude)
{
  var t = calcTimeJulianCent(JD);
  var eqTime = calcEquationOfTime(t);
  var solarDec = calcSunDeclination(t);
  var hourAngle = calcHourAngleSunrise(latitude, solarDec);
  //alert("HA = " + radToDeg(hourAngle));
  if (!rise) hourAngle = -hourAngle;
  var delta = longitude + radToDeg(hourAngle);
  var timeUTC = 720 - (4.0 * delta) - eqTime;	// in minutes
  return timeUTC;
}