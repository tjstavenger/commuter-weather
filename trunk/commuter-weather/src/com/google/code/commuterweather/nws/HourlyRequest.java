package com.google.code.commuterweather.nws;

/**
 * Make the NWS hourly forecast request.
 */
public class HourlyRequest extends NwsRequest {

	private static final String URL = "http://mobile.weather.gov/wtf/MapClick.php?unit=0&lg=english&FcstType=digitalJSON";

	/**
	 * {@inheritDoc}
	 * 
	 * @see com.google.code.commuterweather.nws.NwsRequest#getBaseUrl()
	 */
	@Override
	protected String getBaseUrl() {
		return URL;
	}
}
