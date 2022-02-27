#!/usr/bin/python

import json
import hashlib
import datetime
import ConfigParser
import xml.etree.ElementTree as etree

import utils.logger as logger
import utils.response as response
from utils.resdata import resData
import utils.xml2obj as xml2obj

import nas.naswebapi as naswebapi
import nas.nassettings as nassettings


# file name with account info
accountFileName = nassettings.SETTINGS_PATH + 'account.json'

lc = 0

qnap_sid = ""


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


#-- ?????
def login(forceLogin = False):
    logger.info("[Login.login]")

    resultData = ReadAccount()
    resultData['login_error'] = ""

    if ((naswebapi.webapi_session_id == "") or (forceLogin)):
        login_result = _musicstation_login(resultData['login'], resultData['password'])
        if (login_result.data != ""):
            resultData['login_failed'] = login_result.code
            resultData['login_error'] = login_result.data
    return resultData

# login to musicstation
def _musicstation_login(login, password, encode = True):
    logger.info("[Login.musicstation_login]")

    # if account is empty - send special error
    if (login == ""):
        return resData("Username not specified. ", -4)

    if (encode):
        enc_passwd = _ezEncode(password)
    else:
        enc_passwd = password

    URL = "/musicstation/api/as_login_api.php?act=login&id=" + login + "&password=" + enc_passwd

    resxml = naswebapi.GET(URL, True, True)
    logger.info(resxml)
    try:
        xml_root = etree.fromstring(resxml)

        if xml_root is not None:
            status = xml_root.find('datas').find('data').find('status').text
            # status 1 is ok
            if status == '1':
                sid = xml_root.find('datas').find('data').find('sid').text
                naswebapi.setSID(sid)
                logger.info("[MUSICSTATION LOGIN] ok")
                return resData("", 0)
            # status 2 - not enough permission to use Music Station
            if status == '2':
                logger.error("[MUSICSTATION LOGIN] Login error. not enough permission to use Music Station. " + str(resxml))
                return resData("Not enough permission to use Music Station", -1)
            # status 0 - invalid username or password
            if status == '0':
                logger.error("[MUSICSTATION LOGIN] Login error. invalid username or password. " + str(resxml))
                return resData("Invalid username or password", -1)

        logger.error("[MUSICSTATION LOGIN] Login error: Unknown reason. " + str(resxml))
        return resData("Authentication failed.", -1)
    except Exception as ex:
        reserror = str(resxml)
        logger.error("[MUSICSTATION LOGIN] Login error: Authentication request error. " + reserror)
        if (reserror == "HTTP status = 302"):
            return resData("Music Station package is not available. Please confirm that the Music Station package is properly installed and started.", -2)
        else:
            return resData("Authentication request error.", -2)


# login to qnap
def _qnap_login(login, password, encode = True):
    global qnap_sid
    logger.info("[Login.qnap_login]")

    if (qnap_sid != ""):
        return True

    if (encode):
        enc_passwd = _ezEncode(password)
    else:
        enc_passwd = password

    URL = "/cgi-bin/authLogin.cgi?user=" + login + "&pwd=" + enc_passwd

    resxml = naswebapi.GET(URL, True, True)
    #logger.info(resxml)
    try:
        resdata = xml2obj.deserialize(resxml)

        status = resdata['QDocRoot']['authPassed'][0]['_text']
        if (status == '1'):
            qnap_sid = resdata['QDocRoot']['authSid'][0]['_text']
            return ""
            #return True
        else:
            logger.error("[QNAP_LOGIN] Login error: " + str(resxml))
            return "[QNAP_LOGIN] Login error: " + str(resxml)
            #return False
    except Exception as ex:
        logger.error("[QNAP_LOGIN] Login error: Authentication request error. " + str(resxml))
        return "Authentication request error"


#-- check that user with this SID is logined in NAS
def check_sid(sid):
    logger.info("[Login.check_sid]")

    URL = "/cgi-bin/authLogin.cgi?sid=" + sid
    resxml = naswebapi.GET(URL)
    resdata = xml2obj.deserialize(resxml)

    authPassed = resdata['QDocRoot']['authPassed'][0]['_text'] if 'authPassed' in resdata['QDocRoot'] else ""

    if (authPassed == '1'):
        user = resdata['QDocRoot']['user'][0]['_text']
        response.Send(user)
    else:
        # auth failed
        response.Error('Authentication failed.')

def loginproxy(login, password):
    ###login_res = _musicstation_login(login, password)
    login_res = _qnap_login(login, password, False)
    if (login_res == ""):
        response.OK()
    else:
        response.Error('Authentication failed.')


#-- ?????
#-- not used because is available only for administrator accounts
#def getDsId():
#    URL = "/cgi-bin/management/manaRequest.cgi?subfunc=sysinfo&sid=" + qnap_sid
#    resxml = naswebapi.GET(URL, True, False, False)
#    #logger.info(resxml)
#    xml_root = etree.fromstring(resxml)
#    serialnodes = xml_root.findall(".//serial_number")
#    dsid = serialnodes[0].text
#    return dsid

def getDsId2():
    settings = ConfigParser.ConfigParser()
    settings.read('/var/hw_serial_number')
    dsid = settings.get('Hardware', 'serial number')
    return dsid

def sysinfo():
    global lc

    logger.info("[Login.sysinfo]")

    # musicstation login
    resultData = login(True)
    if (resultData.has_key('login_failed')):
        resultData['license_details'] = -1
        return resultData

    # if music station is turned off - check login by standart qnap auth
    #login_result2 = _qnap_login(resultData['login'], resultData['password'])
    #if (login_result2 != ""):
    #    resultData['login_failed'] = -1
    #    if (resultData['login_error'] == ""):
    #        resultData['login_error'] = login_result2
    #    return resultData

    try:
        dsid = getDsId2()
        dsidmd5 = hashlib.md5(dsid).hexdigest()
        resultData['dsid'] = dsidmd5

        if (not resultData.has_key('license')):
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

        sh = dsidmd5 + '13'
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
        logger.error(ex)
        resultData['license_details'] = -3
        return resultData


#-- ?????
#-- obsolete. use GET_ACCOUNT instead
def check_auth():
    logger.info("[Login.check_auth]")
    resultData = sysinfo()
    if 'login_failed' in resultData:
        response.Error(resultData['login_error'], resultData['login_failed'])
    else:
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


#-------------------------------------------------------------------
# Python implementation of QNAP's encoding function
# Converted from http://eu1.qnap.com/Storage/SDK/get_sid.js

ezEncodeChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

def _ezEncode(str):
    out = ''
    length = len(str)

    i = 0
    while i < length:
        c1 = ord(str[i]) & 0xff
        i += 1
        if i == length:
            out += ezEncodeChars[c1 >> 2]
            out += ezEncodeChars[(c1 & 0x3) << 4]
            out += '=='
            break
        c2 = ord(str[i])
        i += 1
        if i == length:
            out += ezEncodeChars[c1 >> 2]
            out += ezEncodeChars[((c1 & 0x3) << 4) | ((c2 & 0xF0) >> 4)]
            out += ezEncodeChars[(c2 & 0xF) << 2]
            out += '='
            break
        c3 = ord(str[i])
        i += 1
        out += ezEncodeChars[c1 >> 2]
        out += ezEncodeChars[((c1 & 0x3)<< 4) | ((c2 & 0xF0) >> 4)]
        out += ezEncodeChars[((c2 & 0xF) << 2) | ((c3 & 0xC0) >> 6)]
        out += ezEncodeChars[c3 & 0x3F]

    return out
