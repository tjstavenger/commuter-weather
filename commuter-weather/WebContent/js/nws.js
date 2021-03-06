function loadNws() {
	var today = new Date();
	var options = loadOptions();
	
	// remote CORS proxy
	$.when( $.getJSON('https://commuter-weather.herokuapp.com/?https://mobile.weather.gov/wtf/MapClick.php?lat=' + options.location.lat + '&lon=' + options.location.lon + '&unit=0&lg=english&FcstType=json&rand=' + today.getTime()),
			$.getJSON('https://commuter-weather.herokuapp.com/?https://mobile.weather.gov/wtf/MapClick.php?lat=' + options.location.lat + '&lon=' + options.location.lon + '&unit=0&lg=english&FcstType=digitalJSON&rand=' + today.getTime())
	  	  ).then( successNws, failureNws );
	  	  
}

/**
 * On success of receiving daily and hourly NWS data, parse data and load HTML
 * 
 * @param daily NWS response data for daily forecast
 * @param hourly NWS response data for hourly forecast
 */
function successNws( daily, hourly ) {
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
		
	correctHourly(hourly[0]);
	
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
function failureNws( daily, hourly ) {
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
	period.dataSource ='<a href="http://www.weather.gov/" class="ui-link">National Weather Service</a>';
	period.time = Date.parse(response.currentobservation.Date) ? Date.parse(response.currentobservation.Date) : new Date();
	period.name = response.location.areaDescription;
	period.night = true;
	period.sunrise = sun.sunrise;
	period.sunset = sun.sunset;
	period.weather = response.currentobservation.Weather;
	period.weatherImage = 'http://forecast.weather.gov/images/wtf/medium/' + response.currentobservation.Weatherimage;
	period.pop = 0;
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
	
	period.windDirection = '';
	period.windSpeed = 0;
	period.gustSpeed = 0;
	
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
			hour.windChill = hourlyData.windChill == null || hourlyData.windChill[i] == null || hourlyData.windChill[i] == 'null' || hourlyData.windChill[i] > hour.temperature ? hour.temperature : hourlyData.windChill[i];
			hour.relativeHumidity = hourlyData.relativeHumidity[i];
			hour.dewPoint = null;
			hour.pop = Number(hourlyData.pop[i]);
			hour.cloudAmount = hourlyData.cloudAmount[i];
			hour.windDirection = hourlyData.windDirectionCardinal[i];
			hour.windSpeed = hourlyData.windSpeed[i] == null || hourlyData.windSpeed[i] == 'null' ? 0 : Number(hourlyData.windSpeed[i]);
			hour.gustSpeed = hourlyData.windGust[i] == null || hourlyData.windGust[i] == 'null' ? 0 : Number(hourlyData.windGust[i]);
			hour.visibility = null;
			
			calculateApparentTemperature(hour);
			
			period.hourly[i] = hour;
			
			if (hour.windSpeed > period.windSpeed || hour.gustSpeed > period.gustSpeed) {
				period.windDirection = hour.windDirection;
				period.windSpeed = hour.windSpeed;
				period.gustSpeed = hour.gustSpeed;
			}	
			
			if (hour.pop > period.pop) {
				period.pop = hour.pop;
			}
		}
	}
	
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
 * @param tempf temperature in Fahrenheit
 * @param windmph wind speed in mph
 * @returns wind chill
 */
function calculateWindchill(tempf, windmph) {
	return Math.round(35.74+0.6215*tempf-35.75*(Math.pow(windmph,0.16))+0.4275*tempf* (Math.pow(windmph,0.16)));
}

/**
 * NWS hourly data in the evenings always starts at 6pm, even if it is later at night. Shift the time to where it should be.
 * 
 * TODO not sure how well the time diff calculation would work for weather forecasts in different time zones...
 * 
 * @param hourly NWS response data for hourly forecast
 */
function correctHourly(hourly) {
	var all = [];
	
	// put all data into one array
	for (var i = 0; i < 14; i++) {
		var period = hourly.PeriodNameList[i.toString()];
		
		if (hourly.hasOwnProperty(period)) {
			for (var j = 0; j < hourly[period].unixtime.length; j++) {	
				all.push({
					periodName: hourly[period].periodName,
					time: hourly[period].time[j],
					unixtime: hourly[period].unixtime[j],
					temperature: hourly[period].temperature[j],
					windChill: hourly[period].windChill ? hourly[period].windChill[j] : hourly[period].temperature[j],
					windSpeed: hourly[period].windSpeed[j],
					cloudAmount: hourly[period].cloudAmount[j],
					pop: hourly[period].pop[j],
					relativeHumidity: hourly[period].relativeHumidity[j],
					windGust: hourly[period].windGust[j],
					windDirectionCardinal: hourly[period].windDirectionCardinal[j],
					windDirection: hourly[period].windDirection[j],
					iconLink: hourly[period].iconLink[j],
					weather: hourly[period].weather[j]
				});
			}
		}
	}
		
	// shift the time for all hourly forecast data, assuming that hourly forecasts start for the next hour (the NWS unixtimes in the evenings are all sorts of mixed (calculate to tomorrow evening)
	var thisHour = new Date();
	thisHour.setMinutes(0,0,0);
	var nextHour = new Date(thisHour.valueOf()).add(1).hours().valueOf() / 1000; // NWS unixtime in seconds
	
	for (var i = 0; i < all.length; i++) {
		all[i].unixtime = nextHour;
		nextHour += 3600;
	}
	
	// put back into periods
	var allIndex = 0;
	
	var last;
	
	if (thisHour.getHours() < 5) {
		last = Date.parse('today').setHours(5) / 1000;
	}
	else if (thisHour.getHours() < 17) {
		last = Date.parse('today').setHours(17) / 1000;
	} else {
		last = Date.parse('tomorrow').setHours(5) / 1000;
	}
	
	for (var i = 0; i < 14; i++) {
		var period = hourly.PeriodNameList[i.toString()];
		
		if (hourly.hasOwnProperty(period)) {		
			// setup new arrays
			hourly[period].time = [];
			hourly[period].unixtime = [];
			hourly[period].temperature = [];
			hourly[period].windChill = [];
			hourly[period].windSpeed = [];
			hourly[period].cloudAmount = [];
			hourly[period].pop = [];
			hourly[period].relativeHumidity = [];
			hourly[period].windGust = [];
			hourly[period].windDirectionCardinal = [];
			hourly[period].windDirection = [];
			hourly[period].iconLink = [];
			hourly[period].weather = [];
			
			while (allIndex < all.length && all[allIndex].unixtime <= last) {
				hourly[period].time.push(new Date(Number(all[allIndex].unixtime) * 1000).toString('h tt'));
				hourly[period].unixtime.push(all[allIndex].unixtime);
				hourly[period].temperature.push(all[allIndex].temperature);
				hourly[period].windChill.push(all[allIndex].windChill);
				hourly[period].windSpeed.push(all[allIndex].windSpeed);
				hourly[period].cloudAmount.push(all[allIndex].cloudAmount);
				hourly[period].pop.push(all[allIndex].pop);
				hourly[period].relativeHumidity.push(all[allIndex].relativeHumidity);
				hourly[period].windGust.push(all[allIndex].windGust);
				hourly[period].windDirectionCardinal.push(all[allIndex].windDirectionCardinal);
				hourly[period].windDirection.push(all[allIndex].windDirection);
				hourly[period].iconLink.push(all[allIndex].iconLink);
				hourly[period].weather.push(all[allIndex].weather);
				
				allIndex++;
			}
			
			last += (60 * 60 * 12);
		}
	}
}
