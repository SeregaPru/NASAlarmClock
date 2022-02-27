#!/usr/bin/python

# tasks management

import os
import os.path
import signal
import json
from lockfile import pidlockfile

from utils import logger
from utils import response

from nas import login
from nas import nassettings


tasksFileName = nassettings.SETTINGS_PATH + 'settings.conf'


# return task list from stored file
def get_tasks():
    logger.info("[tasks.get_tasks]")
    logger.info(" Read tasks information from file")
    try:
        with open(tasksFileName, 'r') as file_:
            fileData = file_.read()
        resultData = json.loads(fileData)
    except Exception as ex:
        resultData = []
    return resultData


# save task list to file
def save_tasks(rawdata):
    logger.info("[tasks.save_tasks]")

    # prepare tasks settings
    logger.debug(" Prepare tasks data")
    jsondata = json.dumps(rawdata, indent=2, sort_keys=True)
    tasks = json.loads(jsondata)

    # write task settings to file with tasks list
    logger.debug(" Write file")
    with open(tasksFileName, 'w') as file_:
        file_.write(jsondata)

    notify_daemon()

    response.OK()


def notify_daemon():
    # notify daemon to update scheduler - send to alarclock daemon SIGUSR1 signal
    logger.debug(" Update jobs in scheduler")
    # get pid file of daemon
    pidfile_path = '/var/run/alarmclock.pid'
    pidfile_timeout = 5
    lockfile = pidlockfile.PIDLockFile(pidfile_path, False, pidfile_timeout)
    pid = lockfile.read_pid()
    logger.debug(" Daemon pid = " + str(pid))

    # send to daemon SIGUSR1 signal
    if (pid != None):
        os.kill(pid, signal.SIGUSR1)
