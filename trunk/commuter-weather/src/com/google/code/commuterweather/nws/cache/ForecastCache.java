package com.google.code.commuterweather.nws.cache;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import javax.servlet.http.HttpServletRequest;

import com.google.code.commuterweather.nws.NwsRequest;

public class ForecastCache {

	private Map<String, byte[]> cache = new ConcurrentHashMap<String, byte[]>();

	/**
	 * Get the cached forecast for the lat/lon specified as request parameters.
	 * 
	 * @param req
	 *            {@link HttpServletRequest} with lat & lon parameters
	 * @return byte array representing JSON cached forecast, may be null if none
	 *         available
	 */
	public byte[] getForecast(HttpServletRequest req) {
		return cache.get(getKey(req));
	}

	/**
	 * Test if the cache has a forecast for the given lat/lon specified as
	 * request parameters.
	 * 
	 * @param req
	 *            {@link HttpServletRequest} with lat & lon parameters
	 * @return boolean true if the cache has a forecast for the given lat/lon
	 */
	public boolean hasForecast(HttpServletRequest req) {
		return cache.containsKey(getKey(req));
	}

	/**
	 * Put the given forecast in the cache for the lat/lon specified as request
	 * parameters.
	 * 
	 * @param req
	 *            {@link HttpServletRequest} with lat & lon parameters
	 * @param forecast
	 *            byte array representing JSON forecast to cache
	 */
	public void putForecast(HttpServletRequest req, byte[] forecast) {
		cache.put(getKey(req), forecast);
	}

	/**
	 * Concatenate the lat & long specified as request parameters to create
	 * unique keys for the Map cache.
	 * 
	 * @param req
	 *            {@link HttpServletRequest} with lat & lon parameters
	 * @return String unique key for lat/lon
	 */
	private static String getKey(HttpServletRequest req) {
		String lat = req.getParameter(NwsRequest.LAT_PARAM);
		String lon = req.getParameter(NwsRequest.LON_PARAM);

		return NwsRequest.LAT_PARAM + lat + NwsRequest.LON_PARAM + lon;
	}
}
