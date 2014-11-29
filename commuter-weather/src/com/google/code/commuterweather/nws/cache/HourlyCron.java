package com.google.code.commuterweather.nws.cache;

import java.io.IOException;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * Cache the NWS hourly forecast request.
 */
public class HourlyCron extends HourlyCache {

	private static final long serialVersionUID = 1L;

	/**
	 * {@inheritDoc}
	 * 
	 * Write the NWS daily forecast request to the cache file.
	 * 
	 * @see javax.servlet.http.HttpServlet#doGet(javax.servlet.http.HttpServletRequest,
	 *      javax.servlet.http.HttpServletResponse)
	 */
	@Override
	protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
		CACHE.cacheHourlyForecast(req);
	}

}
