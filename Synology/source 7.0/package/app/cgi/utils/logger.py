#!/usr/bin/python

import logging
import logging.handlers
import json
import os

import nas.nassettings as nassettings


acLogger = None
messages = []
interactive = False


def setup():
    global acLogger

    # add new logger
    acLogger = logging.getLogger('AlarmClock')
    acLogger.setLevel(logging.DEBUG)

    # clear all old loggers
    if (len(acLogger.handlers) > 0):
        for h in acLogger.handlers:
            acLogger.removeHandler(h)

    # Add the log message handler to the logger
    handler = logging.handlers.RotatingFileHandler(nassettings.LOG_FILENAME, maxBytes=1024000, backupCount=5)
    # set custom log file formatter
    formatter = logging.Formatter('%(asctime)s %(levelname)s  %(message)s')
    handler.setFormatter(formatter)
    acLogger.addHandler(handler)


def debug(message, *objects):
    for o in objects:
        obj_json = json.dumps(o, indent=1, sort_keys=True)
        message += "\n" + obj_json
    #messages.append(["DEBUG", str(message)])
    if (isinstance(message, str)):
        msg = message
    else:
        msg = str(message)
    if (interactive):
        print(msg)
    acLogger.debug(msg);

def info(message, *objects):
    for o in objects:
        obj_json = json.dumps(o, indent=1, sort_keys=True)
        message += "\n" + obj_json
    if (isinstance(message, str)):
        msg = message
    else:
        msg = str(message)
    messages.append(["INFO", msg])
    if (interactive):
        print (msg)
    acLogger.info(message);

def error(message, *objects):
    for o in objects:
        obj_json = json.dumps(o, indent=1, sort_keys=True)
        message += "\n" + obj_json
    if (isinstance(message, str)):
        msg = message
    else:
        msg = str(message)
    messages.append(["ERROR", msg])
    if (interactive):
        print (msg)
    acLogger.error(message);


def printmessages():
    for message in messages:
        print (message[0] + ": " + message[1])

def clear():
    setup()
    logging.shutdown()

    os.remove(nassettings.LOG_FILENAME)

    setup()
