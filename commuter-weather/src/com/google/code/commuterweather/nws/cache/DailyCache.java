package com.google.code.commuterweather.nws.cache;

import java.io.IOException;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * Cache the NWS daily forecast request.
 */
public class DailyCache extends HttpServlet {
	private static final long serialVersionUID = 1L;

	protected static final DailyForecastCache CACHE = new DailyForecastCache();

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
		CACHE.writeDailyForecast(req, resp);
	}
}
