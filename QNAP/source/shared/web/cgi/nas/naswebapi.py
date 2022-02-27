#!/usr/bin/python

import httplib
import subprocess
import re
import traceback
import urllib

import utils.logger as logger


webapi_session_id = ""
cookie = ""
webapi_host = None
webapi_ssl = False


# determine web address of qnap web API
# host is localhost,
def setWebHost():
    global webapi_host
    global webapi_ssl

    if webapi_host != None:
        return

    # TODO read from some config file

    try:
        webapi_ssl = subprocess.Popen(['/sbin/getcfg', 'System', 'Force SSL', '-d', '1'], stdout=subprocess.PIPE).communicate()[0].strip()
        logger.debug("Force SSL: [" + webapi_ssl + "]")
        if (webapi_ssl == "1"):
            webapi_ssl = True
            port = subprocess.Popen(['/sbin/getcfg', 'Stunnel', 'Port', '-d', '443'], stdout=subprocess.PIPE).communicate()[0].strip()
        else:
            webapi_ssl = False
            port = subprocess.Popen(['/sbin/getcfg', 'System', 'Web Access Port', '-d', '8080'], stdout=subprocess.PIPE).communicate()[0].strip()
    except Exception as ex:
        logger.error(traceback.format_exc())
        logger.debug("use default web port")
        webapi_ssl = False
        port = "8080"
    webapi_host = "127.0.0.1:" + port


def setSID(asid):
    global webapi_session_id
    webapi_session_id = asid

def setCookie(acookie):
    global cookie
    cookie = acookie


#============ HTTP functions ================

# send GET request
def GET(URL, logrequest=True, setCookies=False, logresponse=False):
    setWebHost()

    if (webapi_ssl):
        httpServ = httplib.HTTPSConnection(webapi_host)
    else:
        httpServ = httplib.HTTPConnection(webapi_host)
    httpServ.connect()

    if not setCookies:
        if cookie != "":
            headers = {}
            headers["Cookie"] = cookie
            #if (logrequest):
            #   logger.debug("[GET] Headers = ", headers)

    if (logrequest):
        logger.debug("[GET] URL = " + webapi_host + "  " + URL)
    httpServ.request('GET', URL)
    response = httpServ.getresponse()

    if response.status == httplib.OK:
        resp = response.read()
        if (logresponse):
            logger.debug("[GET] response: - - - - - - \n" + resp + "\n- - - - - -")

        if setCookies:
            headers = response.getheaders()
            #logger.debug("HEADERS :", headers)

            resp_cookie = response.getheader("set-cookie", "")
            if resp_cookie != "":
                cookie_parts = re.split('; |, ', resp_cookie)
                cook = ""
                for c in cookie_parts:
                    if not c.startswith("path="):
                        if cook != "":
                            cook = "; " + cook
                        cook = c + cook
                setCookie(cook)
    else:
        resp  = "HTTP status = " + str(response.status)
        logger.error("[GET] response: \n" + resp)

    httpServ.close()
    return resp


# send POST request to NAS local host
def POST(URL, data, logrequest=True, setCookies=False, logresponse=False):
    setWebHost()
    return POST2(URL, data, webapi_host, logrequest, setCookies, logresponse, webapi_ssl)


# send POST request to external host
def POST2(URL, data, host, logrequest=True, setCookies=False, logresponse=False, useSSL=False):
    if (useSSL):
        httpServ = httplib.HTTPSConnection(host)
    else:
        httpServ = httplib.HTTPConnection(host)
    httpServ.connect()

    headers = {
        "Content-type": "application/x-www-form-urlencoded",
        "Accept": "text/plain"
    }
    if cookie != "":
        headers["Cookie"] = cookie
        #if (logrequest):
        #   logger.debug("[POST] Headers = ", headers)

    if (logrequest):
        logger.debug("[POST] URL = " + str(useSSL) + " " + host + "  " + URL)
        logger.debug("[POST] data: " + urllib.unquote(data).decode('utf8') )
    httpServ.request('POST', URL, data, headers)
    response = httpServ.getresponse()

    if response.status == httplib.OK:
        resp = response.read()
        if (logresponse):
            logger.debug("[POST] response: - - - - - - \n" + resp + "\n- - - - - -")
    else:
        resp  = "HTTP status = " + str(response.status)
        logger.error("[POST] response: \n" + resp)

    httpServ.close()
    return resp
