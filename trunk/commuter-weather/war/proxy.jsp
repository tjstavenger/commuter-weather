<%-- Proxy requests to weather.gov --%>
<%@page session="false"%>
<%@page import="java.net.*,java.io.*" %>
<%@page trimDirectiveWhitespaces="true"%> 
<%
try {
	String reqUrl = URLDecoder.decode(request.getQueryString(), "UTF-8");
	
	// extract the host
	String host = reqUrl.split("\\/")[2];
	
	if ("mobile.weather.gov".equals(host)) {
		URL url = new URL(reqUrl);
		URLConnection con = url.openConnection();
		con.setConnectTimeout(5000);
		con.setReadTimeout(5000);
		BufferedReader rd = new BufferedReader(new InputStreamReader(con.getInputStream()));
		StringBuilder json = new StringBuilder();
		String line;
		while ((line = rd.readLine()) != null) {
			json.append(line);
		}
		rd.close();
		out.println(json.toString());
	}
	else {
		// deny access via HTTP status code 502
		response.setStatus(502);
		out.println("ERROR 502: This proxy does not allow you to access that location.");
	}

} catch(Exception e) {
	response.setStatus(500);	
	out.println("ERROR 500: An internal server error occured. " + e.getMessage());
	e.printStackTrace(new PrintWriter(out));	
}
%>