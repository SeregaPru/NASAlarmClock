#!/usr/bin/python

import json
import sys

import utils.logger as logger


#== ....
def Raw(data):
    print data
    sys.exit()

def ErrorExit(status, data, code = 0, onlyprint=False):
    if status == "ERROR":
        logger.error(data)
        stack = logger.messages
    else:
        stack = ""
    result = {"status": status, "data": data, "code": code, "stack": stack}
    resultstr = json.dumps(result, indent=1, sort_keys=False)
    print resultstr
    if (not onlyprint):
        sys.exit()

def OK():
    ErrorExit("OK", "")

def Send(data):
    ErrorExit("OK", data)

def Error(message, code = 0):
    ErrorExit("ERROR", message, code)

# only prints response but not exit
def Print(data):
    ErrorExit("OK", data, 0, True)
