package com.google.code.commuterweather.proxy;


public class HourlyProxy extends NwsProxy {
	private static final long serialVersionUID = 1L;

	private static final String URL = "http://mobile.weather.gov/wtf/MapClick.php?unit=0&lg=english&FcstType=digitalJSON";
	
	/**
	 * {@inheritDoc}
	 * 
	 * @see com.google.code.commuterweather.proxy.NwsProxy#getBaseUrl()
	 */
	@Override
	protected String getBaseUrl() {
		return URL;
	}
}
