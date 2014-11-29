package com.google.code.commuterweather.nws.cache;

import java.io.IOException;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.google.code.commuterweather.nws.DailyRequest;

public class DailyForecastCache extends ForecastCache {
	private DailyRequest dailyRequest = new DailyRequest();

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
	public void writeDailyForecast(HttpServletRequest req, HttpServletResponse resp) throws IOException {
		if (!hasForecast(req)) {
			cacheDailyForecast(req);
		}

		dailyRequest.writeForecast(req, resp.getOutputStream());
	}

	/**
	 * Request a new NWS daily forecast and put in in the cache.
	 * 
	 * @param req
	 *            {@link HttpServletRequest} with lat & lon parameters
	 * @throws IOException
	 *             if error making request
	 */
	public void cacheDailyForecast(HttpServletRequest req) throws IOException {
		byte[] forecast = dailyRequest.getForecast(req);
		putForecast(req, forecast);
	}
}
