$.cookie.json = true; 				// use JSON.stringify and JSON.parse to save objects
$.cookie.defaults.path = '/'; 		// all cookies available to full site
$.cookie.defaults.expires = 7; 	// cookies basically don't expire

/**
 * Load current options from cookie
 */
$(document).ready(function() {	
	var options = loadOptions();
	$('#locationZip').val(options.locationZip);
	$('#minTemp').val(options.minTemp);
	$('#maxTemp').val(options.maxTemp);
	$('#maxPop').val(options.maxPop);
	$('#maxWind').val(options.maxWind);
	$('#maxGust').val(options.maxGust);
	$('#morningStart').val(options.morningStart);
	$('#morningEnd').val(options.morningEnd);
	$('#afternoonStart').val(options.afternoonStart);
	$('#afternoonEnd').val(options.afternoonEnd);
	$('#beforeSunrise').val(options.beforeSunrise);
	$('#afterSunset').val(options.afterSunset);
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
		options.locationZip = 99352;
		options.locationLat = 46.3;
		options.locationLon = -119.31;
		options.minTemp = 40;
		options.maxTemp = 100;
		options.maxPop = 30;
		options.maxWind = 15;
		options.maxGust = 15;
		options.morningStart = '06:00';
		options.morningEnd = '07:00';
		options.afternoonStart = '16:00';
		options.afternoonEnd = '17:00';
		options.beforeSunrise = 75;
		options.afterSunset = 75;
	}
	
	return options;
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
				options.locationZip = parseInt($('#locationZip').val());
				options.locationLat = parseFloat(latLon[0]); 
				options.locationLon = parseFloat(latLon[1]);
				options.minTemp = parseFloat($('#minTemp').val());
				options.maxTemp = parseFloat($('#maxTemp').val());
				options.maxPop = parseFloat($('#maxPop').val());
				options.maxWind = parseFloat($('#maxWind').val());
				options.maxGust = parseFloat($('#maxGust').val());
				options.beforeSunrise = parseFloat($('#beforeSunrise').val());
				options.afterSunset = parseFloat($('#afterSunset').val());
				options.morningStart = $('#morningStart').val();
				options.morningEnd = $('#morningEnd').val();
				options.afternoonStart = $('#afternoonStart').val();
				options.afternoonEnd = $('#afternoonEnd').val();				
				
				$.cookie('options', options);
			}
	});
}