var DRIVE = 'images/drive.png';
var DRIVE_CLASS = 'commute-drive';
var CAUTION = 'images/caution.png';
var CAUTION_CLASS = 'commute-caution';
var RIDE = 'images/ride.png';
var RIDE_CLASS = 'commute-ride';

/**
 * Load NWS daily and hourly data via proxy to prevent CORS errors
 */
$(document).ready(function() {	
	$('#error').popup();

	var today = new Date();
	var options = loadOptions();
	
	// remote CORS proxy
//	$.when( $.getJSON('http://www.corsproxy.com/mobile.weather.gov/wtf/MapClick.php?lat=' + options.location.lat + '&lon=' + options.location.lon + '&unit=0&lg=english&FcstType=json&rand=' + today.getTime()),
//			$.getJSON('http://www.corsproxy.com/mobile.weather.gov/wtf/MapClick.php?lat=' + options.location.lat + '&lon=' + options.location.lon + '&unit=0&lg=english&FcstType=digitalJSON&rand=' + today.getTime())
//	  	  ).then( success, failure );
	
	// local jsp proxy
//	$.when( $.getJSON('proxy.jsp?' + encodeURIComponent('http://mobile.weather.gov/wtf/MapClick.php?lat=' + options.location.lat + '&lon=' + options.location.lon + '&unit=0&lg=english&FcstType=json&rand=' + today.getTime())),
//			$.getJSON('proxy.jsp?' + encodeURIComponent('http://mobile.weather.gov/wtf/MapClick.php?lat=' + options.location.lat + '&lon=' + options.location.lon + '&unit=0&lg=english&FcstType=digitalJSON&rand=' + today.getTime()))
//		  ).then( success, failure );
	
	// local servlet proxy
//	$.when( $.getJSON('daily?lat=' + options.location.lat + '&lon=' + options.location.lon),
//			$.getJSON('hourly?lat=' + options.location.lat + '&lon=' + options.location.lon)
//		  ).then( success, failure );
	
	// YQL proxy - jsonCompat=new prevents YQL from formatting JSON (lossy, removes single sized arrays and turns numbers to strings)
	// See http://developer.yahoo.com/yql/guide/yql_url.html
	// See http://developer.yahoo.com/yql/guide/json_to_json.html
	$.when( $.getJSON('http://query.yahooapis.com/v1/public/yql?q=' + encodeURIComponent('select * from json where url = "http://mobile.weather.gov/wtf/MapClick.php?lat=' + options.location.lat + '&lon=' + options.location.lon + '&unit=0&lg=english&FcstType=json&rand=' + today.getTime()) + '"&format=json&jsonCompat=new'),
			$.getJSON('http://query.yahooapis.com/v1/public/yql?q=' + encodeURIComponent('select * from json where url = "http://mobile.weather.gov/wtf/MapClick.php?lat=' + options.location.lat + '&lon=' + options.location.lon + '&unit=0&lg=english&FcstType=digitalJSON&rand=' + today.getTime()) + '"&format=json&jsonCompat=new')
		  ).then( successYql, failure );
	
	$.mobile.loading('show');
});
	
/**
 * On success of receiving daily and hourly NWS data through YQL proxy, parse data and load HTML.
 * 
 * Get the YQL response data in the same format as if received directly from NWS.
 *  
 * @param daily NWS response data for daily forecast
 * @param hourly NWS response data for hourly forecast
 */
function successYql( daily, hourly ) {
	if (daily[0].query.results && hourly[0].query.results) { // yql timeouts return "success" for some reason...
		success([daily[0].query.results.json], [hourly[0].query.results.json]);
	}
	else {
		failure(daily, hourly);
	}
}

/**
 * On success of receiving daily and hourly NWS data, parse data and load HTML
 * 
 * @param daily NWS response data for daily forecast
 * @param hourly NWS response data for hourly forecast
 */
function success( daily, hourly ) {
	var options = loadOptions();
	
	var today = new Date();
	var day1 = new Date(today.valueOf());
	day1.setDate(day1.getDate() + 1);
	var day2 = new Date(today.valueOf());
	day2.setDate(day2.getDate() + 2);
	var day3 = new Date(today.valueOf());
	day3.setDate(day3.getDate() + 3);
	var day4 = new Date(today.valueOf());
	day4.setDate(day4.getDate() + 4);
	var day5 = new Date(today.valueOf());
	day5.setDate(day5.getDate() + 5);
	var day6 = new Date(today.valueOf());
	day6.setDate(day6.getDate() + 6);
	var day7 = new Date(today.valueOf());
	day7.setDate(day7.getDate() + 7);
	
	var sun = new Array();
	sun[0] = getSunriseSunset(today, options.location.lat, options.location.lon);
	sun[1] = getSunriseSunset(day1, options.location.lat, options.location.lon);
	sun[2] = getSunriseSunset(day2, options.location.lat, options.location.lon);
	sun[3] = getSunriseSunset(day3, options.location.lat, options.location.lon);
	sun[4] = getSunriseSunset(day4, options.location.lat, options.location.lon);
	sun[5] = getSunriseSunset(day5, options.location.lat, options.location.lon);
	sun[6] = getSunriseSunset(day6, options.location.lat, options.location.lon);
	sun[7] = getSunriseSunset(day7, options.location.lat, options.location.lon);
  
	var hours = new Array();	
	var periods = new Array();
	periods[0] = parseCurrent(daily[0], sun[0]);
	var day = 0;
		
	for (var i = 0; i < daily[0].time.startPeriodName.length; i++) { 
		periods[i + 1] = parsePeriod(i, daily[0], hourly[0], sun[day]);
		
		if (periods[i + 1].hourly && periods[i + 1].hourly.length > 0) {
			hours.push.apply(hours, periods[i + 1].hourly);
		}		
			
		if (periods[i + 1].night) {
			day++;
		}
	}
		
	evaluateHours(hours, options);
	evaluatePeriods(periods, hours, options);
	
	loadPeriods(periods);
	$.mobile.loading('hide');
}

/**
 * On failure of receiving NWS forecast data (i.e., 404, 500, etc. style error)
 * 
 * @param daily NWS response data for daily forecast
 * @param hourly NWS response data for hourly forecast
 */
function failure( daily, hourly ) {
	$.mobile.loading('hide');
	$('#error').popup('open');
}

/**
 * Parse the current conditions from the daily NWS response
 * 
 * @param response daily NWS response data
 * @param sun sunrise/sunset data for today
 * @returns {___anonymous3701_3706} current conditions object
 */
function parseCurrent(response, sun) {
	var period = new Object();
	period.current = true;
	period.time = Date.parse(response.currentobservation.Date);
	period.name = response.location.areaDescription;
	period.night = true;
	period.sunrise = sun.sunrise;
	period.sunset = sun.sunset;
	period.weather = response.currentobservation.Weather;
	period.weatherImage = 'http://forecast.weather.gov/images/wtf/medium/' + response.currentobservation.Weatherimage;
	period.pop = null;
	period.temperatureLabel = null;
	period.temperature = response.currentobservation.Temp;
	period.relativeHumidity = response.currentobservation.Relh;
	period.dewPoint = response.currentobservation.Dewp;
	period.windChill = response.currentobservation.WindChill == null || response.currentobservation.WindChill == 'null' || response.currentobservation.WindChill > period.temperature ? period.temperature : response.currentobservation.WindChill;
	period.text = null;
	period.windDirection = toCardinal(response.currentobservation.Windd);
	period.windSpeed = response.currentobservation.Winds == 'NA' ? 0 : Number(response.currentobservation.Winds);
	period.gustSpeed = response.currentobservation.Gust == 'NA' ? 0 : Number(response.currentobservation.Gust);
	period.visibility = Number(response.currentobservation.Visibility);
	period.hourly = null; // no hourly for current conditions
	
	if ( response.data.hazard && response.data.hazard.length > 0 ) {
		period.hazards = new Array();
		
		for (var i = 0; i < response.data.hazard.length; i++) {
			period.hazards[i] = new Object();
			period.hazards[i].text = response.data.hazard[i];
			period.hazards[i].url = response.data.hazardUrl[i];
		}
	} else {
		period.hazards = null;
	}
	
	
	calculateApparentTemperature(period);
	
	return period;
}

/**
 * Parse the NWS daily & hourly forecast data for the given period index.
 * 
 * @param index int index of period to parse
 * @param daily NWS daily forecast data
 * @param hourly NWS hourly forecast data
 * @param sun sunrise/sunset for requested period
 * @returns {___anonymous4876_4881} period forecast object
 */
function parsePeriod(index, daily, hourly, sun) {
	var period = new Object();
	period.current = false;
	period.time = new Date(daily.time.startValidTime[index]);
	period.name = daily.time.startPeriodName[index];
	period.night = period.name.match(/ight$/) != null; // ends with night or Night
	period.sunrise = sun.sunrise;
	period.sunset = sun.sunset;
	period.weather = daily.data.weather[index];
	period.weatherImage = daily.data.iconLink[index];
	period.pop = (daily.data.pop[index] == null || daily.data.pop[index] == 'null' ? 0 : Number(daily.data.pop[index]));
	period.temperatureLabel = daily.time.tempLabel[index];
	period.temperature = daily.data.temperature[index];
	period.windChill = null;
	period.relativeHumidity = null;
	period.dewPoint = null;
	period.text = daily.data.text[index];
	period.visibility = null;
	
	period.hourly = new Array();
	var hourlyData = hourly[period.name.replace(/ /g, '').replace(/\'/g, '_')]; // hourly 'period' matches daily after removing spaces and single quotes
	var maxWindDirection = '';
	var maxWindSpeed = 0;
	var maxGustSpeed = 0;	
	
	if (hourlyData) { // NWS web service returns period names that don't exist as properties (towards the end of the forecast period)
		for (var i = 0; i < hourlyData.time.length; i++) {	
			var hour = new Object();
			hour.period = period;
			var hourlyDate;
			
			if (period.night && hourlyData.time[i].match(/am$/) != null) { // nightly forecast for the next morning
				hourlyDate = new Date(period.time.valueOf()).add(1).days();
			} else {
				hourlyDate = new Date(period.time.valueOf());
			}
			
			hour.time = Date.parse(hourlyDate.toString('M-d-yyyy') + ' ' + hourlyData.time[i]);
			hour.weather = hourlyData.weather[i];
			hour.weatherImage = 'http://forecast.weather.gov/images/wtf/medium/' + hourlyData.iconLink[i];
			hour.temperature = hourlyData.temperature[i];
			hour.windChill = hourlyData.windChill[i] == null || hourlyData.windChill[i] == 'null' || hourlyData.windChill[i] > hour.temperature ? hour.temperature : hourlyData.windChill[i];
			hour.relativeHumidity = hourlyData.relativeHumidity[i];
			hour.dewPoint = null;
			hour.pop = hourlyData.pop[i];
			hour.cloudAmount = hourlyData.cloudAmount[i];
			hour.windDirection = hourlyData.windDirectionCardinal[i];
			hour.windSpeed = hourlyData.windSpeed[i] == null || hourlyData.windSpeed[i] == 'null' ? 0 : Number(hourlyData.windSpeed[i]);
			hour.gustSpeed = hourlyData.windGust[i] == null || hourlyData.windGust[i] == 'null' ? 0 : Number(hourlyData.windGust[i]);
			hour.visibility = null;
			
			calculateApparentTemperature(hour);
			
			period.hourly[i] = hour;
			
			if (hour.windSpeed > maxWindSpeed || hour.gustSpeed > maxGustSpeed) {
				maxWindDirection = hour.windDirection;
				maxWindSpeed = hour.windSpeed;
				maxGustSpeed = hour.gustSpeed;
			}	
		}
	}
		
	period.windDirection = maxWindDirection;
	period.windSpeed = maxWindSpeed;
	period.gustSpeed = maxGustSpeed;
	
	calculateApparentTemperature(period);
	
	return period;
}

/**
 * Calculate and set the apparent temperature on the given period.
 * 
 * The real temperature, wind speed, and relative humidity must all be set before executing this method.
 * 
 * @param period period to calculate apparent temperature for
 */
function calculateApparentTemperature(period) {
	if (period.temperature <= 50 && period.windSpeed > 3) {
		period.apparentTemperature = calculateWindchill(period.temperature, period.windSpeed);
	}
	else if (period.temperature > 75 && period.relativeHumidity) {
		period.apparentTemperature = calculateHeatIndex(period.temperature, period.relativeHumidity);
	}
	else {
		period.apparentTemperature = period.temperature;
	}
}

/**
 * Calculate the heat index following the mobile.weather.gov site
 * 
 * @param tempf temperature in fahrenheit
 * @param humid relative humidity
 * @returns heat index
 */
function calculateHeatIndex(tempf, humid) {
	return Math.round(-42.379+2.04901523*tempf+10.14333127*humid-0.22475541*tempf*humid-6.83783*(Math.pow(10, -3))*
	(Math.pow(tempf, 2))-5.481717*(Math.pow(10, -2))*(Math.pow(humid, 2))+1.22874*(Math.pow(10, -3))*(Math.pow(tempf, 2))*
	humid+8.5282*(Math.pow(10, -4))*tempf*(Math.pow(humid, 2))-1.99*(Math.pow(10, -6))*(Math.pow(tempf, 2))*(Math.pow(humid,2)));
}

/**
 * Calculate the wind chill following the mobile.weather.gov site
 * 
 * @param tempf temperature in fahrenheit
 * @param windmph wind speed in mph
 * @returns wind chill
 */
function calculateWindchill(tempf, windmph) {
	return Math.round(35.74+0.6215*tempf-35.75*(Math.pow(windmph,0.16))+0.4275*tempf* (Math.pow(windmph,0.16)));
}

/**
 * Use the given options to determine if one should go for a bike ride during each individual hour.
 * 
 * As the hours are processed, the given hour's period is also updated, in case later period processing is not possible (i.e., no hourly data available).
 * 
 * @param hours parsed NWS hourly forecast objects
 * @param options user specified min/max parameter values in which to ride
 */
function evaluateHours(hours, options) {
	for (var h = 0; h < hours.length; h++) {
		var hour = hours[h];
		hour.commuteImage = RIDE; // default to ride
		hour.commuteClass = RIDE_CLASS;
		
		if (hour.period.commuteImage == null) {
			hour.period.commuteImage = RIDE;
			hour.period.commuteClass = RIDE_CLASS;
		}
		
		if ((options.beforeSunrise.enabled && hour.period.sunrise > new Date(hour.time.valueOf()).addMinutes(options.beforeSunrise.warn)) ||
			(options.afterSunset.enabled && hour.period.sunset < new Date(hour.time.valueOf()).addMinutes(-1 * options.afterSunset.warn)) ||
			(options.minTemp.enabled && hour.temperature < options.minTemp.warn) ||
			(options.maxTemp.enabled && hour.temperature > options.maxTemp.warn) ||
			(options.maxPop.enabled && hour.pop > options.maxPop.warn) ||
			(options.maxWind.enabled && hour.windSpeed > options.maxWind.warn) ||
			(options.maxGust.enabled && hour.gustSpeed > options.maxGust.warn)) {
			
			hour.commuteImage = CAUTION;
			hour.commuteClass = CAUTION_CLASS;
			
			if (hour.period.commuteImage != DRIVE ) {
				hour.period.commuteImage = CAUTION;
				hour.period.commuteClass = CAUTION_CLASS;
			}
		}			
		
		if ((options.beforeSunrise.enabled && hour.period.sunrise > new Date(hour.time.valueOf()).addMinutes(options.beforeSunrise.drive)) ||
			(options.afterSunset.enabled && hour.period.sunset < new Date(hour.time.valueOf()).addMinutes(-1 * options.afterSunset.drive)) ||
			(options.minTemp.enabled && hour.temperature < options.minTemp.drive) ||
			(options.maxTemp.enabled && hour.temperature > options.maxTemp.drive) ||
			(options.maxPop.enabled && hour.pop > options.maxPop.drive) ||
			(options.maxWind.enabled && hour.windSpeed > options.maxWind.drive) ||
			(options.maxGust.enabled && hour.gustSpeed > options.maxGust.drive)) {
			
			hour.commuteImage = DRIVE;
			hour.commuteClass = DRIVE_CLASS;
			hour.period.commuteImage = DRIVE;
			hour.period.commuteClass = DRIVE_CLASS;
		}
	}
}

/**
 * Use the given options to determine if one should go for a bike ride during each period.
 * 
 * If the period is a forecast for the daytime, the algorithm takes into consideration the chosen commute times.
 * If the weather is "bad" during the commute times, the rider is suggested to drive. If the weather is "bad"
 * between commutes times, the rider is cautioned to ride.
 * 
 * @param periods parsed NWS period forecast objects
 * @param hours parsed NWS hourly forecast objects
 * @param options user specified min/max parameter values in which to ride 
 */
function evaluatePeriods(periods, hours, options) {
	for (var p = 0; p < periods.length; p++) {
		var period = periods[p];		
		
		if (period.hourly && period.hourly.length > 0) {
			if (!period.night) { // let the evaluateHours() value stay for night forecasts, day forecasts will change for specified commute times
				var morningHours = new Array();
				var afternoonHours = new Array();
				var dayHours = new Array();
				
				var periodDate = period.time.toString('M-d-yyyy') + ' ';
				var morningStart = Date.parse(periodDate + options.morningCommute.start).setMinutes(0); // set to the start of the hour
				var morningEnd = Date.parse(periodDate + options.morningCommute.end);
				if (morningEnd.getMinutes() > 0) {
					morningEnd.add(1).hours().setMinutes(0); // set to the start of the next hour
				}
				var afternoonStart = Date.parse(periodDate + options.afternoonCommute.start).setMinutes(0); // set to the start of the hour
				var afternoonEnd = Date.parse(periodDate + options.afternoonCommute.end);
				if (afternoonEnd.getMinutes() > 0) {
					afternoonEnd.add(1).hours().setMinutes(0); // set to the start of the next hour
				}
				
				for (var i = 0; i < hours.length && hours[i].time <= afternoonEnd; i++) { // TODO not the most efficient search algorithm...
					if (hours[i].time >= morningStart && hours[i].time <= morningEnd) {
						morningHours.push(hours[i]);
					}
					
					if (hours[i].time >= morningStart && hours[i].time <= afternoonEnd) {
						dayHours.push(hours[i]);
					}
					
					if (hours[i].time >= afternoonStart && hours[i].time <= afternoonEnd) {
						afternoonHours.push(hours[i]);
					}
				}
				
				period.commuteImage = RIDE; // default to RIDE
				period.commuteClass = RIDE_CLASS;
				
				if (options.morningCommute.enabled) {
					for (var i = 0; i < morningHours.length; i++) {
						if (morningHours[i].commuteImage == DRIVE) {
							period.commuteImage = DRIVE;
							period.commuteClass = DRIVE_CLASS;
						} else if (morningHours[i].commuteImage == CAUTION && period.commuteImage != DRIVE) {
							period.commuteImage = CAUTION;
							period.commuteClass = CAUTION_CLASS;
						}
					}
				}
				
				if (options.afternoonCommute.enabled) {
					for (var i = 0; i < afternoonHours.length; i++) {
						if (afternoonHours[i].commuteImage == DRIVE) {
							period.commuteImage = DRIVE;
							period.commuteClass = DRIVE_CLASS;
						} else if (afternoonHours[i].commuteImage == CAUTION && period.commuteImage != DRIVE) {
							period.commuteImage = CAUTION;
							period.commuteClass = CAUTION_CLASS;
						}
					}
				}
				
				if (period.commuteImage == RIDE) {
					for (var i = 0; i < dayHours.length; i++) {
						if (dayHours[i].commuteImage == DRIVE || dayHours[i].commuteImage == CAUTION) {
							period.commuteImage = CAUTION;
							period.commuteClass = CAUTION_CLASS;
						}
					}
				}
			}
		} else {
			// no hourly data available
			period.commuteImage = RIDE;	
			period.commuteClass = RIDE_CLASS;
			
			if (period.temperature < options.minTemp.warn ||
				period.temperature > options.maxTemp.warn ||
				period.pop > options.maxPop.warn ||
				period.windSpeed > options.maxWind.warn ||
				period.gustSpeed > options.maxGust.warn) {

				period.commuteImage = CAUTION;
				period.commuteClass = CAUTION_CLASS;
			}
			
			if (period.temperature < options.minTemp.drive ||
				period.temperature > options.maxTemp.drive ||
				period.pop > options.maxPop.drive ||
				period.windSpeed > options.maxWind.drive ||
				period.gustSpeed > options.maxGust.drive) {

				period.commuteImage = DRIVE;
				period.commuteClass = DRIVE_CLASS;
			}
		}
	}
}

/**
 * Load the period forecast objects into HTML.
 * 
 * @param periods parsed NWS period forecast objects
 */
function loadPeriods(periods) {
	var panel = "";
	
	for (var i = 0; i < periods.length; i++) {
		var period = periods[i];
		
		panel += '<div data-role="collapsible" data-inset="false" data-collapsed="true" data-content-theme="d" data-iconpos="right" ';
		
		if (period.current) {
			$('#updated').text(period.time.toString('MM/dd/yy h:mm tt'));
		
			if (period.hazards && period.hazards.length > 0) {
				panel += 'data-theme="e" data-collapsed-icon="alert" data-expanded-icon="alert">';	
			} else {
				panel += 'data-collapsed-icon="" data-expanded-icon="">';
			}
		} else {
			panel += 'data-collapsed-icon="arrow-r" data-expanded-icon="arrow-d">';
		}
		
		panel += '<h3>' + 
					'<div class="period-title">' + period.name + '</div>'+ 
					'<table class="period-table">' + 
						'<tr>' +
							'<td><img src="' + period.weatherImage + '" class="commute-image ' + period.commuteClass + '"/><div class="' + period.commuteClass + '"></div></td>' +
							'<td>' +
								period.weather +
								'<table class="weather-table">' +
									'<tr>' +
										'<td><img src="images/temp.svg" class="weather-icon" />' + (period.temperatureLabel ? period.temperatureLabel + ' ' : '') + period.temperature + '&deg;</td>' + 
										'<td>' + (period.current ? '<img src="images/windChill.svg" class="weather-icon" />' + period.apparentTemperature + '&deg;' : '<img src="images/precip.svg" class="weather-icon" />' + period.pop + '%') + '</td>' + 
									'</tr>' +
									'<tr>' +
										'<td><img src="images/wind.svg" class="weather-icon" />' + period.windDirection + ' ' + period.windSpeed + 'mph</td>' +
										'<td><img src="images/gust.svg" class="weather-icon" />'+ period.gustSpeed + 'mph</td>' +
									'</tr>' +
								'</table>' +
								(period.current ? '<img src="images/visibility.svg" class="weather-icon" />' + period.visibility + ' miles' : '<img src="images/sun.svg" class="weather-icon" />' + (period.night ? period.sunset.toString('h:mm tt') : period.sunrise.toString('h:mm tt'))) +
							'</td>' +
						'</tr>' +
					'</table>' +
				'</h3>';
		
		if ( period.current ) {
			if ( period.hazards && period.hazards.length > 0 ) {
				panel += '<div>Current weather advisories:<ul>';
				
				for (var j = 0; j < period.hazards.length; j++) {
					panel += '<li><a href="' + period.hazards[j].url + '" target="_blank">' + period.hazards[j].text + '</a></li>';
				}
				
				panel += '</ul></div>';
			} else {
				panel += '<div>No current weather advisories.</div>';
			}
		}
		
		if ( (period.text && period.text.length > 0) || (period.hourly && period.hourly.length > 0) ) {
			panel += '<div>';

			if (period.text && period.text.length > 0) {
				panel += '<div class="period-text">' + period.text + '</div>';
			}
			
			if (period.hourly && period.hourly.length > 0) {
				for (var j = 0; j < period.hourly.length; j++) {
					var hour = period.hourly[j];
					panel += 
						'<div class="hourly">' +
							'<table class="hourly-table">' + 
								'<div class="hourly-title">' + hour.time.toString('h tt') + '</div>' +
								'<tr>' +
									'<td><img src="' + hour.weatherImage + '" class="commute-image ' + hour.commuteClass +'"/><div class="' + hour.commuteClass + '"></div></td>' +
									'<td>' + 
										hour.weather + '<br/>' + 
										'<table class="weather-table">' +
											'<tr>' +
												'<td><img src="images/temp.svg" class="weather-icon" />' + hour.temperature + '&deg;</td>' +
												'<td><img src="images/windChill.svg" class="weather-icon" />' + hour.apparentTemperature + '&deg;</td>' +
											'</tr>' +
											'<tr>' +
												'<td><img src="images/wind.svg" class="weather-icon" />' + hour.windDirection + ' ' + hour.windSpeed + 'mph</td>' +
												'<td><img src="images/gust.svg" class="weather-icon" />' + hour.gustSpeed + 'mph</td>' +
											'</tr>' +
										'</table>' +
										'<table class="weather-table" style="width: 100%">' +
											'<tr>' +
												'<td><img src="images/precip.svg" class="weather-icon" />' + hour.pop + '%</td>' +
												'<td><img src="images/cloud.svg" class="weather-icon" />' + hour.cloudAmount + '%</td>' +
												'<td><img src="images/humidity.svg" class="weather-icon" />' + hour.relativeHumidity + '%</td>' +
											'</tr>' +
										'</table>' +
									'</td>' +
								'</tr>' +
							'</table>' +
						'</div>';
				}
			}
									
			panel += '</div>';
		}
								
		panel += '</div>';
	}
	
	$('#forecast').append(panel);
	$('div[data-role=collapsible]').collapsible();
}

/**
 * Convert the given degrees for wind direction into a cardinal direction (N, E, S, W, etc.)
 * 
 * @param degrees float degrees (0-360)
 * @returns {String} cardinal direction
 */
function toCardinal(degrees) {
	if (degrees > 348.75 || degrees <= 11.25) {
		return 'N';
	} else if (degrees > 11.25 && degrees <= 33.75) {
		return 'NNE';
	} else if (degrees > 33.75 && degrees <= 56.25) {
		return 'NE';
	} else if (degrees > 56.25 && degrees <= 78.75) {
		return 'ENE';
	} else if (degrees > 78.75 && degrees <= 101.25) {
		return 'E';
	} else if (degrees > 101.25 && degrees <= 123.75) {
		return 'ESE';
	} else if (degrees > 123.75 && degrees <= 146.25) {
		return 'SE';
	} else if (degrees > 146.25 && degrees <= 168.75) {
		return 'SSE';
	} else if (degrees > 168.75 && degrees <= 191.25) {
		return 'S';
	} else if (degrees > 191.25 && degrees <= 213.75) {
		return 'SSW';
	} else if (degrees > 213.75 && degrees <= 236.25) {
		return 'SW';
	} else if (degrees > 236.25 && degrees <= 258.75) {
		return 'WSW';
	} else if (degrees > 258.75 && degrees <= 281.25) {
		return 'W';
	} else if (degrees > 281.25 && degrees <= 303.75) {
		return 'WNW';
	} else if (degrees > 303.75 && degrees <= 326.25) {
		return 'NW';
	} else if (degrees > 326.25 && degrees <= 348.75) {
		return 'NNW';
	} else {
		return '';
	}
}