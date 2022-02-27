#!/usr/bin/python

import hashlib
import datetime


dsidmd5 = "c76cf3169971e70805e06e7f92dac721"

# date = 
#   for commercial license, is date when license was generated 
#   for trial license, is license expiration date
def encode(trial, licdate):
	global dsidmd5
	
	if (licdate < datetime.datetime(year=2015, month=11, day=04)):
		ver = 1
	else:
		ver = 2
	pos = 8

	curYear = licdate.year
	curMonth = licdate.month
	curDay = licdate.day

	sh = dsidmd5 + '00'

	sh_ba = [0] * 34
	for i in range(34):
		sh_ba[i] = int(sh[i], 16)
		
	if (ver > 1):
		rn_ba = bytearray([1,3,8,0,2,9,3,6,2,4, 5,8,7,4,6,2,7,5,6,1, 3,5,2,9,7,3,6,4,2,9, 7,1,8,5])
		for i in range(34): sh_ba[i] = sh_ba[i] ^ rn_ba[i]
		
	eh = str(curYear) + str(curMonth).zfill(2) + str(curDay).zfill(2) + '00'+ '9384738521'+'9038465387' + str(curDay).zfill(2) + str(curMonth).zfill(2)

	eh_ba = [0] * 34
	for i in range(34):
		eh_ba[i] = int(eh[i], 16)

	sh_ba[32] = sh_ba[pos+12]
	sh_ba[33] = sh_ba[pos+13]
	if (ver > 1):
		if (trial):
			eh_ba[pos+12] = 5
			eh_ba[pos+13] = 4
		else:
			eh_ba[pos+12] = 4
			eh_ba[pos+13] = 5
	else:
		sh_ba[pos+12] = 4
		sh_ba[pos+13] = 5
		eh_ba[pos+12] = 0
		eh_ba[pos+13] = 0
		
	license = str(ver) + str(pos)
	rh_ba = [0] * 34
	for i in range(34):
		rh_ba[i] = sh_ba[i] ^ eh_ba[i]
		license = license + format(rh_ba[i], 'x')

	return license

	
	
def decode(license):
	global dsidmd5
	global lc

	lc = 0

	try:
		if (license == ""):
			resultData = 0
			return resultData

		if (len(license) != 36): raise ValueError("  error - len36")
		
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
		
		if (eh_ba[p12] * eh_ba[p13] - eh_ba[p13] - eh_ba[p12] != p12 - pos - 1):
			raise ValueError("  error 45: " + str(eh_ba[p12]) + "," + str(eh_ba[p13]))
		if (not (4030 <= eh_ba[0]*2000+eh_ba[1]*300+eh_ba[2]*20+eh_ba[3]*2 <= 4060 and 1 <= eh_ba[4]*10 + eh_ba[5] <= 12 and 1 <= eh_ba[6]*10 + eh_ba[7] <= 31)):
			raise ValueError("  error date: " + str(eh_ba[0:8]))
		if (eh_ba[32:34] != eh_ba[4:6] or eh_ba[30:32] != eh_ba[6:8]):
			raise ValueError("  error date compare: ")
			
		lc = eh_ba[p13]**2*2 + eh_ba[p12]

		###date = sum([eh_ba[7-i]*10**i for i in range(8)])
		###print (date)
		###today = int(datetime.datetime.now().strftime("%Y%m%d"))
		###print (today)
			
		llc = (eh_ba[p12] > eh_ba[p13]) and (datetime.datetime.now().strftime("%Y%m%d") > str(sum([eh_ba[7-i]*10**i for i in range(8)])) and -2 or 2) or 1
		lc = eh_ba[p13]*eh_ba[p12] * (llc < 1 and [0] or [1])[0]
		resultData = llc
		return resultData
		
	except Exception as ex:
		print(ex)
		resultData = -3
		return resultData





print ("========================================")

print ("\n--- predefined commercial lic ver 1 \ status --> 1")
license = "10e779e3179970454d62696f5cd7bd4e20f7"
decoded = decode(license)
print ("License = " + license + " | status = " + str(decoded) + " | lc = " + str(lc))
if (decoded != 1):
	print ("  ERROR status. expected 1")

print ("\n--- commercial lic ver 1 \ status --> 1")
license = encode(False, datetime.datetime(year=2015, month=2, day=9))
decoded = decode(license)
print ("License = " + license + " | status = " + str(decoded) + " | lc = " + str(lc))
if (decoded != 1):
	print ("  ERROR status. expected 1")

print ("\n--- commercial lic ver 2 \ status --> 1")
license = encode(False, datetime.datetime.now())
decoded = decode(license)
print ("License = " + license + " | status = " + str(decoded) + " | lc = " + str(lc))
if (decoded != 1):
	print ("  ERROR status. expected 1")

print ("\n--- predefined trial lic \ status --> 2")
license = "21f4f9c835bdba1629f5a0cb6ea7ed694524"
decoded = decode(license)
print ("License = " + license + " | status = " + str(decoded) + " | lc = " + str(lc))
if (decoded != 2):
	print ("  ERROR status. expected 2")
	
print ("\n--- trial lic correct \ status --> 2")
license = encode(True, datetime.datetime.now() + datetime.timedelta(days=1))
decoded = decode(license)
print ("License = " + license + " | status = " + str(decoded) + " | lc = " + str(lc))
if (decoded != 2):
	print ("  ERROR status. expected 2")
	
print ("\n--- trial lic expired \ status --> -2")
license = encode(True, datetime.datetime.now() - datetime.timedelta(days=1))
decoded = decode(license)
print ("License = " + license + " | status = " + str(decoded) + " | lc = " + str(lc))
if (decoded != -2):
	print ("  ERROR status. expected -2")
	
print ("\n--- empty lic \ status --> 0")
license = ""
decoded = decode(license)
print ("License = " + license + " | status = " + str(decoded) + " | lc = " + str(lc))
if (decoded != 0):
	print ("  ERROR status. expected 0")


print ("\n--- wrong lic - not hex \ status --> -3")
license = "abc" # not hexadecimal
decoded = decode(license)
print ("License = " + license + " | status = " + str(decoded) + " | lc = " + str(lc))
if (decoded != -3):
	print ("  ERROR status. expected -3")

print ("\n--- wrong lic - hex but short \ status --> -3")
license = "123" # hex but short
decoded = decode(license)
print ("License = " + license + " | status = " + str(decoded) + " | lc = " + str(lc))
if (decoded != -3):
	print ("  ERROR status. expected -3")

print ("\n--- wrong lic 36 len random \ status --> -3")
license = "123456789012345678901234567890123456" # hex, 36 len, but random numbers
decoded = decode(license)
print ("License = " + license + " | status = " + str(decoded) + " | lc = " + str(lc))
if (decoded != -3):
	print ("  ERROR status. expected -3")
