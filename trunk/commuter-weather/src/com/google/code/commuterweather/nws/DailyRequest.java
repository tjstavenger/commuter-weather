package com.google.code.commuterweather.nws;

/**
 * Make the NWS daily forecast request.
 */
public class DailyRequest extends NwsRequest {

	private static final String URL = "http://mobile.weather.gov/wtf/MapClick.php?unit=0&lg=english&FcstType=json";

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
