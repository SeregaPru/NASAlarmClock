#!/usr/bin/python

import httplib

# send POST request
# to specified host and port
def POST2(URL, data, host, cookie, logrequest=True):
	httpServ = httplib.HTTPConnection(host)
	httpServ.connect()
	if (logrequest):
		print("POST data = ", data)
	
	headers = {}
	if cookie != "":
		headers["Cookie"] = cookie
	
	httpServ.request('POST', URL, data, headers)
	
	response = httpServ.getresponse()
	if response.status == httplib.OK:
		resp = response.read()
		print("Output from POST request :" + resp)
	else:
		resp  = "HTTP status = " + str(response.status)
		print(resp)
		
	httpServ.close()	
	return resp


	
username = 'kate'
password = 'Pobeda10'
host = 'localhost:5000'
 
 
data = 'username=' + username + '&passwd=' + password + '&OTPcode=&__cIpHeRtExT=&isIframeLogin=no&enable_device_token=no'
url = '/webman/login.cgi?enable_syno_token=yes'
ress = POST2(url, data, host, "", True)
print ress
