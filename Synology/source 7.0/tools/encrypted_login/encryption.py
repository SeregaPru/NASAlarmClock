#!/usr/bin/python

import logger
import json
import rsa
import pyaes
import urllib
import random
import base64
import time

	
def EncryptParam(src, RSAModulus):
	logger.debug("EncryptParam ", src);
	# generate random secret key
	rndkey = GenRandomKey(500)

	# encrypt secret key with RSA public key (1024 bit)
	rsapubkey = rsa.key.PublicKey(RSAModulus, 0x10001)
	rsa_res_bytes = rsa.encrypt(rndkey, rsapubkey)
	rsa_res_str = base64.b64encode(rsa_res_bytes)
	logger.debug("rsa_res_str = ", rsa_res_str);
	
	# ecrypt source with secret key with AES algorithm
	aes = pyaes.AESModeOfOperationCBC(rndkey)
	aes_res_str = aes.encrypt(src)
	logger.debug("aes_res_str = ", aes_res_str);

	# return pair of RSA-encrypted secretkey, and AES-encrypted source
	res = []
	res['rsa'] = rsa_res_str
	res['aes'] = aes_res_str
	return res

	
# encrypt assotiated array 
# first make single string in URL format key1=val1&key2=val2&...
# then encrypt this string
def EncryptArray(srcarr, RSAModulus):
	src = urllib.urlencode(srcarr)
	res = EncryptParam(src, RSAModulus)
	return res
	

def GenRandomKey(length):
	symbols = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ~!@#$%^&*()_+-/"
	res = ''.join(random.choice(symbols) for i in range(length))
	return res
	
	
def getEncryptionInfo():
	logger.info("[SynoWebApi.getEncryptionInfo]")
	URL = "/webapi/encryption.cgi"
	data = "format=module&api=SYNO.API.Encryption&method=getinfo&version=1"

	res = synowebapi.POST(URL, data, True)
	resdata = json.loads(res)

	return resdata

	
# login
# remember session id
# returns false if error
def login_enc(login, password):
	global cookie
	global sid
	
	logger.info("[login.login_enc]")

	# first get encryption info
	encrinfo = getEncryptionInfo()
	CipherKey = encrinfo['data']['cipherkey']
	CipherToken = encrinfo['data']['ciphertoken']
	Public_Key = encrinfo['data']['public_key']
	ServerTime = encrinfo['data']['server_time']

	Public_Key_long = long(Public_Key, 16)
	logger.info("Public_Key_long: ", Public_Key_long)
	
	TimeBias = ServerTime - int(round(time.time()))
	logger.info("ServerTime: ", ServerTime)
	logger.info("TimeBias: ", TimeBias)
	OTPcode = ""

	src = {}
	src['OTPcode'] = ""	#!! OTPcode
	src['username'] = login
	src['passwd'] = password
	src['rememberme'] = 0
	src['timezone'] = "+04:00" #!! this.stdTimezone()
	src[CipherToken] = ServerTime
	
	CipherKey_val = encryption.EncryptArray(src, Public_Key_long)
	CipherKey_data = json.dumps(CipherKey_val, indent=0, sort_keys=False)

	URL = "/webman/login.cgi?enable_syno_token=yes"
	data = "OTPcode=&" + cipherkey + "=" + CipherKey_data + "&isIframeLogin=no" + "&enable_device_token=no"
	res = synowebapi.POST(URL, data, True)
	resdata = json.loads(res)

	if resdata['success'] == 1:
		sid = resdata['data']['sid']
		synowebapi.setSID(sid)
		synowebapi.setCookie("id=" + sid)
		return resdata
	else:
		logger.error("Login error: " + str(resdata))
		return False
	