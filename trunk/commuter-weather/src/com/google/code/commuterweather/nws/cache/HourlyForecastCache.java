package com.google.code.commuterweather.nws.cache;

import java.io.IOException;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.google.code.commuterweather.nws.HourlyRequest;

public class HourlyForecastCache extends ForecastCache {
	private HourlyRequest hourlyRequest = new HourlyRequest();

	/**
	 * Write the cached forecast to the {@link HttpServletResponse}.
	 * 
	 * @param req
	 *            {@link HttpServletRequest} with lat & lon parameters
	 * @param resp
	 *            {@link HttpServletResponse} to write forecast to
	 * @throws IOException
	 *             if error writing forecast
	 */
	public void writeHourlyForecast(HttpServletRequest req, HttpServletResponse resp) throws IOException {
		if (!hasForecast(req)) {
			cacheHourlyForecast(req);
		}

		hourlyRequest.writeForecast(req, resp.getOutputStream());
	}

	/**
	 * Request a new NWS hourly forecast and put in in the cache.
	 * 
	 * @param req
	 *            {@link HttpServletRequest} with lat & lon parameters
	 * @throws IOException
	 *             if error making request
	 */
	public void cacheHourlyForecast(HttpServletRequest req) throws IOException {
		byte[] forecast = hourlyRequest.getForecast(req);
		putForecast(req, forecast);
	}
}
