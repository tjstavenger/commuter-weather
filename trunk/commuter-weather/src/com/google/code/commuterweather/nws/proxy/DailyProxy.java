package com.google.code.commuterweather.nws.proxy;

import java.io.IOException;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.google.code.commuterweather.nws.DailyRequest;

/**
 * Proxy the NWS daily forecast request.
 */
public class DailyProxy extends HttpServlet {
	private static final long serialVersionUID = 1L;

	private DailyRequest dailyRequest = new DailyRequest();

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
		dailyRequest.writeForecast(req, resp.getOutputStream());
	}
}
