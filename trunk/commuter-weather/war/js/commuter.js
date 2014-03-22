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

	var options = loadOptions();
	
	if (options.dataSource == NWS) {
		loadNws();
	} 
	else {
		loadForecastIo();
	}
	
	
	$.mobile.loading('show');
});


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
			$('#dataSource').html(period.dataSource);
		
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