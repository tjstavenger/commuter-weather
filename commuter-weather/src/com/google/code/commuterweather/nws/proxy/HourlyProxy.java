package com.google.code.commuterweather.nws.proxy;

import java.io.IOException;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.google.code.commuterweather.nws.HourlyRequest;

/**
 * Proxy the NWS hourly forecast request.
 */
public class HourlyProxy extends HttpServlet {
	private static final long serialVersionUID = 1L;

	private HourlyRequest hourlyRequest = new HourlyRequest();

	/**
	 * {@inheritDoc}
	 * 
	 * Write the NWS daily forecast request to the HttpServletResponse.
	 * 
	 * @see javax.servlet.http.HttpServlet#doGet(javax.servlet.http.HttpServletRequest,
	 *      javax.servlet.http.HttpServletResponse)
	 */
	@Override
	protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
		hourlyRequest.writeForecast(req, resp.getOutputStream());
	}

}
