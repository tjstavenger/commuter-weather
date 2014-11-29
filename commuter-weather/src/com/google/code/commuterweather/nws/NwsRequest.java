package com.google.code.commuterweather.nws;

import java.io.IOException;
import java.io.OutputStream;
import java.net.URL;

import javax.servlet.http.HttpServletRequest;

import org.apache.commons.io.IOUtils;

import com.google.appengine.api.urlfetch.HTTPHeader;
import com.google.appengine.api.urlfetch.HTTPMethod;
import com.google.appengine.api.urlfetch.HTTPRequest;
import com.google.appengine.api.urlfetch.HTTPResponse;
import com.google.appengine.api.urlfetch.URLFetchServiceFactory;

public abstract class NwsRequest {

	public static final String LAT_PARAM = "lat";
	public static final String LON_PARAM = "lon";

	private static final String AMP = "&";
	private static final String EQUALS = "=";

	/**
	 * Make the NWS service request using the given HttpServletRequest's lat/lon
	 * parameters and return its response as a byte array.
	 * 
	 * @param req
	 *            {@link HttpServletRequest} with lat/lon parameters
	 * @return forecast JSON as byte array
	 * @throws IOException
	 *             if error making request
	 */
	public byte[] getForecast(HttpServletRequest req) throws IOException {
		URL url = new URL(getUrl(req));
		HTTPRequest nwsRequest = new HTTPRequest(url, HTTPMethod.GET);
		nwsRequest.addHeader(new HTTPHeader("Connection", "keep-alive"));
		nwsRequest.addHeader(new HTTPHeader("Cache-Control", "max-age=0"));
		nwsRequest.addHeader(new HTTPHeader("Accept", "application/json,text/javascript,text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"));
		nwsRequest.addHeader(new HTTPHeader("User-Agent", req.getHeader("User-Agent")));
		nwsRequest.addHeader(new HTTPHeader("Accept-Encoding", "gzip,deflate,sdch"));
		nwsRequest.addHeader(new HTTPHeader("Accept-Language", "en-US,en;q=0.8"));

		HTTPResponse nwsResponse = URLFetchServiceFactory.getURLFetchService().fetch(nwsRequest);

		return nwsResponse.getContent();
	}

	/**
	 * Make the NWS service request using the given HttpServletRequest's lat/lon
	 * parameters and write its response to the given OutputStream.
	 * 
	 * @see javax.servlet.http.HttpServlet#doGet(javax.servlet.http.HttpServletRequest,
	 *      javax.servlet.http.HttpServletResponse)
	 */
	public void writeForecast(HttpServletRequest req, OutputStream outputStream) throws IOException {
		byte[] forecast = getForecast(req);
		IOUtils.write(forecast, outputStream);
	}

	/**
	 * Get the base URL on which to append the requested latitude and longitude.
	 * 
	 * @return String URL
	 */
	protected abstract String getBaseUrl();

	/**
	 * Append the requested latitude and longitude to the NWS URL.
	 * 
	 * @param req
	 * @return
	 */
	protected String getUrl(HttpServletRequest req) {
		String lat = req.getParameter(LAT_PARAM);
		String lon = req.getParameter(LON_PARAM);

		StringBuilder url = new StringBuilder();
		url.append(getBaseUrl());
		url.append(AMP);
		url.append(LAT_PARAM);
		url.append(EQUALS);
		url.append(lat);
		url.append(AMP);
		url.append(LON_PARAM);
		url.append(EQUALS);
		url.append(lon);

		return url.toString();
	}
}
