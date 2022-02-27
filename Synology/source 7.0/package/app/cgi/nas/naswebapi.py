#!/usr/bin/python

import http.client
import urllib
import re
import os.path
import subprocess

import utils.logger as logger


webapi_session_id = ""
webapi_device_i= ""
cookie = ""
token = ""
webapi_host = None


# determine web address of qnap web API
# host is localhost,
def setWebHost():
    global webapi_host
    if webapi_host != None:
        return

    port = "5000"
    http_settings_file = '/etc/httpd/conf/httpd.conf-sys'
    nginx_settings_file = '/etc/nginx/nginx.conf'

    if os.path.exists(http_settings_file):
        confFile = open(http_settings_file)
    elif os.path.exists(nginx_settings_file):
        confFile = open(nginx_settings_file)
    else:
        webapi_host = "localhost:" + port
        return

    for line in confFile:
        if line.lower().strip().startswith("listen "):
            port = line.strip().split(" ")[1]
            logger.debug("PORT found = " + port)
            break

    webapi_host = "localhost:" + port



def setSID(asid):
    global webapi_session_id
    webapi_session_id = asid
    ###logger.debug("  >> setSID: " + asid)

def setDID(adid):
    global webapi_device_id
    webapi_device_id = adid
    ###logger.debug("  >> setDID: " + adid)

def setCookie(acookie):
    global cookie
    cookie = acookie
    ###logger.debug("  >> setCookie: " + acookie)

def setToken(atoken):
    global token
    token = atoken
    ###logger.debug("  >> setToken: " + atoken)

#============ HTTP functions ================

# send GET request
def GET(URL, logrequest=True, setCookies=False, logresponse=False):
    setWebHost()

    httpServ = http.client.HTTPConnection(webapi_host)
    httpServ.connect()

    if not setCookies:
        if cookie != "":
            headers = {}
            headers["Cookie"] = cookie
            ###if (logrequest):
            ###   logger.debug("[GET] Headers = ", headers)

    if (logrequest):
        logger.debug("[GET] URL = " + webapi_host + "  " + URL)
    httpServ.request('GET', URL)
    response = httpServ.getresponse()

    if response.status == http.client.OK:
        resp = response.read().decode('utf-8')
        if (logresponse):
            logger.debug("[GET] response: - - - - - - \n" + resp + "\n- - - - - -")
    else:
        resp  = "HTTP status = " + str(response.status)
        logger.error("[GET] response: \n" + resp)

    httpServ.close()
    return resp


# send POST request to NAS local host
def POST(URL, data, logrequest=True, setCookies=False, logresponse=False):
    setWebHost()
    return POST2(URL, data, webapi_host, logrequest, setCookies, logresponse)


# send POST request to external host
def POST2(URL, data, host, logrequest=True, setCookies=False, logresponse=False):
    httpServ = http.client.HTTPConnection(host)
    httpServ.connect()

    headers = {
        "Content-type": "application/x-www-form-urlencoded",
        "Accept": "text/plain"
    }
    if token != "":
        headers["X-SYNO-TOKEN"] = token
        ###logger.debug("  >> use token: " + token)
    if cookie != "":
        headers["Cookie"] = cookie
        ###logger.debug("  >> use cookie: " + cookie)

    ###if (logrequest):
    ###    logger.debug("[POST]   url: " + URL)
    ###    logger.debug("[POST]   data: " + data)
    ###    logger.debug("[POST]   Headers = ", headers)

    httpServ.request('POST', URL, data, headers)
    response = httpServ.getresponse()

    if response.status == http.client.OK:
        resp = response.read().decode('utf-8')
        if (logresponse):
            logger.debug("[POST] response: - - - - - - \n" + resp + "\n- - - - - -")

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
        resp = "HTTP status = " + str(response.status)
        logger.error("[POST] response: \n" + resp)

    httpServ.close()
    return resp

# exec webapi with help of command script
# /usr/syno/bin/synowebapi
def EXEC(API, method, version=1, logrequest=True, logresponse=False):
    if (logrequest):
        logger.debug("[EXEC] : " + API + " | " + method + " | " + str(version))

    try:
        from subprocess import DEVNULL  # Python 3.
    except ImportError:
        DEVNULL = open(os.devnull, 'wb')

    try:
        resp = subprocess.check_output(["/usr/syno/bin/synowebapi", "--exec", "api=" + API, "method=" + method, "version=" + str(version)], stderr=DEVNULL, shell=False)
    except subprocess.CalledProcessError as grepexc:
        logger.debug("[EXEC] error (" + str(grepexc.returncode) + ") : " + grepexc.output)
        resp = grepexc.output

    if (logresponse):
        logger.debug("[EXEC] response: - - - - - - \n" + resp + "\n- - - - - -")
    return resp
