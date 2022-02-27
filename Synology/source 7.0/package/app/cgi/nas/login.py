#!/usr/bin/python

import json
import hashlib
import datetime
import configparser
import traceback
import xml.etree.ElementTree as etree

import utils.logger as logger
import utils.response as response
import utils.xml2obj as xml2obj

import nas.naswebapi as naswebapi
import nas.nassettings as nassettings


# file name with account info
accountFileName = nassettings.SETTINGS_PATH + 'account.json'

lc = 0


#-- ?????
def ReadAccount():
    logger.info("[Login.ReadAccount]")
    try:
        with open(accountFileName, 'r') as file_:
            fileData = file_.read()
            file_.close()
            resultData = json.loads(fileData)
            return resultData
    except (OSError, IOError) as e:
        resultData = {}
        resultData['login'] = ""
        resultData['password'] = ""
        return resultData

# login with default, stored in file, account information
def login():
    logger.info("[Login.login]")

    resultData = ReadAccount()
    resultData['login_error'] = ""

    if (naswebapi.cookie == ""):
        login_result = login_internal(resultData['login'], resultData['password'])
        if (login_result != ""):
            resultData['login_failed'] = -1
            resultData['login_error'] = login_result

    return resultData


#---- low-lewel login implementations ----

# login
def login_internal(login, password):
    logger.info("[login.login_internal]")
    ### old DSM ### URL = "/webman/login.cgi?enable_syno_token=yes"
    ### old DSM ### data = 'username=' + login + '&passwd=' + password + '&OTPcode=&__cIpHeRtExT=&isIframeLogin=no&enable_device_token=no'
    URL = "/webapi/entry.cgi"
    data = "api=SYNO.API.Auth&version=6&method=login&account=" + login + "&passwd=" + password + "&format=cookie"

    res = naswebapi.POST(URL, data, False, True)
    ###res = naswebapi.POST(URL, data, True, True, True)
    resdata = json.loads(res)

    if resdata['success'] == 1:
        ### old DSM ### token = resdata['SynoToken']
        ### old DSM ### naswebapi.setToken(token)

        naswebapi.setCookie(naswebapi.cookie)
        cookie_str = naswebapi.cookie
        ###logger.debug("  >> login cookies: " + cookie_str)

        # get SID from cookie
        cookie_arr = cookie_str.split(";")
        for item in cookie_arr:
            item_arr = item.split("=")
            if item_arr[0].lstrip() == "id":
                sid = item_arr[1]
                naswebapi.setSID(sid)
                ### old DSM ### naswebapi.setCookie("stay_login=1; id=" + sid)
            if item_arr[0].lstrip() == "did":
                did = item_arr[1]
                naswebapi.setDID(did)
        return ""
    else:
        logger.error("Login error: " + str(resdata))
        return "Authentication failed"

#-- check that user with this SID is logined in NAS
def check_sid(sid):
    ##!! TODO - need to make later
    response.Send(sid)

# login proxy request for external clients
def loginproxy(login, password):
    logger.info("[login.loginproxy]")

    login_result = login_internal(login, password)
    if (login_result == ""):
        response.Send(naswebapi.webapi_session_id)
    else:
        response.Error("Login failed")


def sysinfo():
    global lc

    resultData = login()
    if (resultData.get('login_failed', None) != None):
        resultData['license_details'] = -1
        return resultData

    #URL = "/webapi/_______________________________________________________entry.cgi"
    #data = "api=SYNO.Core.System&method=info&version=1"
    #res = naswebapi.POST(URL, data,   True, False, False)
    res = naswebapi.EXEC("SYNO.Core.System", "info", 1, True, False)

    try:
        resdata = json.loads(res)
        dsid = resdata['data']['serial'].encode('utf-8')
        dsidmd5 = hashlib.md5(dsid)
        dsidmd5hex = dsidmd5.hexdigest()
        resultData['dsid'] = dsidmd5hex

        if (not resultData.get('license', None) != None):
            resultData['license'] = ""
        if (resultData['license'] == ""):
            resultData['license_details'] = 0
            return resultData

        license = resultData['license']
        if (len(license) != 36): raise ValueError("")

        ver = int(license[0])
        pos = int(license[1])
        p12 = pos + 12
        p13 = p12 + 1

        rh = license[2:]
        rh_ba = [0] * 34
        for i in range(34): rh_ba[i] = int(rh[i], 16)

        sh = dsidmd5hex + '13'
        sh_ba = rh_ba[:]
        for i in range(34): sh_ba[i] = int(sh[i], 16)

        if (ver > 1):
            rn_ba = bytearray([1,3,8,0,2,9,3,6,2,4, 5,8,7,4,6,2,7,5,6,1, 3,5,2,9,7,3,6,4,2,9, 7,1,8,5])
            for i in range(34): sh_ba[i] = sh_ba[i] ^ rn_ba[i]

        sh_ba[32:34] = sh_ba[p12:p12+2]
        if (ver == 1):
            sh_ba[p12:p13+1] = [0,0]

        eh_ba = rh_ba[:]
        for i in range(34): eh_ba[i] = sh_ba[i] ^ rh_ba[i]

        if ((eh_ba[p12] * eh_ba[p13] - eh_ba[p13] - eh_ba[p12] != p12 - pos - 1) or
            (not (4030 <= eh_ba[0]*2000+eh_ba[1]*300+eh_ba[2]*20+eh_ba[3]*2 <= 4060 and 1 <= eh_ba[4]*10 + eh_ba[5] <= 12 and 1 <= eh_ba[6]*10 + eh_ba[7] <= 31)) or
            (eh_ba[32:34] != eh_ba[4:6] or eh_ba[30:32] != eh_ba[6:8])):
            raise ValueError("")

        llc = (eh_ba[p12] > eh_ba[p13]) and (datetime.datetime.now().strftime("%Y%m%d") > str(sum([eh_ba[7-i]*10**i for i in range(8)])) and -2 or 2) or 1
        lc = eh_ba[p13]*eh_ba[p12] * (llc < 1 and [0] or [1])[0]

        resultData['license_details'] = llc
        return resultData

    except Exception as ex:
        resultData['license_details'] = -3
        logger.error(traceback.format_exc())
        logger.error(resdata)
        return resultData


#-- ?????
def check_auth():
    logger.info("[Login.check_auth]")
    resultData = sysinfo()
    if 'login_failed' in resultData:
        response.Error(resultData['login_failed'])
    response.Send(resultData['license_details'])




#-- Read account information from file
def get_account():
    logger.info("[Login.get_account]")
    resultData = sysinfo()
    response.Send(resultData)


#-- write account settings to file
def set_account(rawdata):
    logger.info("[Login.set_account]")
    # prepare account settings
    jsondata = json.dumps(rawdata, indent=2, sort_keys=True)

    # write account settings to file
    logger.debug('Write account information to file')
    with open(accountFileName, 'w') as file_:
        file_.write(jsondata)

    response.OK()
