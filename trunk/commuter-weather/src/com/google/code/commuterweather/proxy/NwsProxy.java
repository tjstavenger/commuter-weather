package com.google.code.commuterweather.proxy;

import java.io.IOException;
import java.net.URL;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.commons.io.IOUtils;

import com.google.appengine.api.urlfetch.HTTPHeader;
import com.google.appengine.api.urlfetch.HTTPMethod;
import com.google.appengine.api.urlfetch.HTTPRequest;
import com.google.appengine.api.urlfetch.HTTPResponse;
import com.google.appengine.api.urlfetch.URLFetchServiceFactory;

public abstract class NwsProxy extends HttpServlet {
	private static final long serialVersionUID = 1L;

	private static final String LAT_PARAM = "lat";
	private static final String LON_PARAM = "lon";
	private static final String AMP = "&";
	private static final String EQUALS = "=";
	
	/**
	 * Make the NWS service request and write its response.
	 * 
	 * @see javax.servlet.http.HttpServlet#doGet(javax.servlet.http.HttpServletRequest, javax.servlet.http.HttpServletResponse)
	 */
	@Override
	protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
		URL url = new URL(getUrl(req));
		HTTPRequest nwsRequest = new HTTPRequest(url, HTTPMethod.GET);
		nwsRequest.addHeader(new HTTPHeader("Connection", "keep-alive"));
		nwsRequest.addHeader(new HTTPHeader("Cache-Control", "max-age=0"));
		nwsRequest.addHeader(new HTTPHeader("Accept", "application/json,text/javascript,text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"));
		nwsRequest.addHeader(new HTTPHeader("User-Agent", req.getHeader("User-Agent")));
		nwsRequest.addHeader(new HTTPHeader("Accept-Encoding", "gzip,deflate,sdch"));
		nwsRequest.addHeader(new HTTPHeader("Accept-Language", "en-US,en;q=0.8"));
		
		HTTPResponse nwsResponse = URLFetchServiceFactory.getURLFetchService().fetch(nwsRequest);
		IOUtils.write(nwsResponse.getContent(), resp.getOutputStream());
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
