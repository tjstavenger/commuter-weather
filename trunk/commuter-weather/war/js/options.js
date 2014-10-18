$.cookie.json = true; 			// use JSON.stringify and JSON.parse to save objects
$.cookie.defaults.path = '/'; 	// all cookies available to full site
$.cookie.defaults.expires = 7; 	// cookies basically don't expire

var NWS = 'nws';
var FORECAST_IO = "forecast.io";

/**
 * Load current options from cookie
 */
$(document).ready(function() {	
	var options = loadOptions();
	$('#dataSource-' + options.dataSource).prop('checked', 'checked');
	$('input:radio[name=dataSource]').checkboxradio("refresh");
	$('#locationZip').val(options.location.zip);
	
	loadCommute('morningCommute', options.morningCommute);
	loadCommute('afternoonCommute', options.afternoonCommute);
	
	loadOption('minTemp', options.minTemp);
	loadOption('maxTemp', options.maxTemp);
	loadOption('maxPop', options.maxPop);
	loadOption('maxWind', options.maxWind);
	loadOption('maxGust', options.maxGust);
	loadOption('beforeSunrise', options.beforeSunrise);
	loadOption('afterSunset', options.afterSunset);
});

/**
 * Load options from cookie via JSON.parse()
 * 
 * @returns options object
 */
function loadOptions() {
	var options = $.cookie('options');
	
	if (options == null) {	
		options = new Object();
		options.dataSource = NWS;
		
		options.location = new Object();
		options.location.zip = 99352;
		options.location.lat = 46.3;
		options.location.lon = -119.31;
		/*
		options.location.zip = 99354;
		options.location.lat = 46.34947;
		options.location.lon = -119.27781;
		*/
		
		options.morningCommute = newCommute(true, '06:00', '07:00');
		options.afternoonCommute = newCommute(true, '16:00', '17:00');
		
		options.minTemp = newOption(true, 27, 25);		
		options.maxTemp = newOption(true, 95, 105);
		options.maxPop = newOption(true, 30, 60);
		options.maxWind = newOption(true, 25, 30);
		options.maxGust = newOption(true, 30, 35);
		options.beforeSunrise = newOption(true, 90, 120);
		options.afterSunset = newOption(true, 90, 120);
	}
	
	return options;
}

/**
 * Create a new commute time object with the given enabled, start, and end values.
 * 
 * @param enabled boolean true/false if enabled or disabled
 * @param start string 24 hour clock to start
 * @param end string 24 hour clock to end
 */
function newCommute(enabled, start, end) {
	var value = new Object();
	value.enabled = enabled;
	value.start = start;
	value.end = end;
	
	return value;
}

/**
 * Parse the values for the commute time with the given ID prefix.
 * 
 * @param id string ID prefix
 */
function parseCommute(id) {
	var value = new Object();
	value.enabled = $('#' + id + 'Enabled').val() == 'true';
	value.start = $('#' + id + 'Start').val();
	value.end = $('#' + id + 'End').val();

	return value;
}

/**
 * Load the input values for the commute time with the given ID prefix.
 * 
 * @param id string ID prefix
 */
function loadCommute(id, value) {
	$('#' + id + 'Enabled').val(value.enabled.toString()).slider('refresh');
	$('#' + id + 'Start').val(value.start);
	$('#' + id + 'End').val(value.end);
}

/**
 * Create a new options object with the given enabled, warn, and drive values.
 * 
 * @param enabled boolean true/false if enabled or disabled
 * @param warn numeric value to warn at
 * @param drive numeric value to drive at
 */
function newOption(enabled, warn, drive) {
	var value = new Object();
	value.enabled = enabled;
	value.warn = warn;
	value.drive = drive;
	
	return value;
}

/**
 * Parse the values for the option with the given ID prefix.
 * 
 * @param id string ID prefix
 * @param value object value with enabled, warn, and drive attriutes
 */
function parseOption(id) {
	var value = new Object();
	value.enabled = $('#' + id + 'Enabled').val() == 'true';
	value.warn = parseFloat($('#' + id + 'Warn').val());
	value.drive = parseFloat($('#' + id + 'Drive').val());

	return value;
}

/**
 * Load the input values for the option with the given ID prefix.
 * 
 * @param id string ID prefix
 * @param value object value with enabled, warn, and drive attriutes
 */
function loadOption(id, value) {
	$('#' + id + 'Enabled').val(value.enabled.toString()).slider('refresh');
	$('#' + id + 'Warn').val(value.warn);
	$('#' + id + 'Drive').val(value.drive);
}

/**
 * Save current options to cookie via JSON.stringify()
 */
function saveOptions() {
	var today = new Date();
	$.ajax({
			url: 'http://www.corsproxy.com/graphical.weather.gov/xml/sample_products/browser_interface/ndfdXMLclient.php?listZipCodeList=' + $('#locationZip').val() + '&rand=' + today.getTime(),
			dataType: 'xml',
			async: false,
			success: function( data ) 
			{
				var latLonList = data.getElementsByTagName('latLonList')[0].childNodes[0].nodeValue;
				var latLon = latLonList.split(' ')[0].split(',');
				
				var options = new Object();
				options.dataSource = $('input:radio[name=dataSource]:checked').val();
				
				options.location = new Object();
				options.location.zip = parseInt($('#locationZip').val());
				options.location.lat = parseFloat(latLon[0]); 
				options.location.lon = parseFloat(latLon[1]);
				
				options.morningCommute = parseCommute('morningCommute');
				options.afternoonCommute = parseCommute('afternoonCommute');
				
				options.minTemp = parseOption('minTemp');
				options.maxTemp = parseOption('maxTemp');
				options.maxPop = parseOption('maxPop');
				options.maxWind = parseOption('maxWind');
				options.maxGust = parseOption('maxGust');
				options.beforeSunrise = parseOption('beforeSunrise');
				options.afterSunset = parseOption('afterSunset');			
				
				$.cookie('options', options);
			}
	});
}