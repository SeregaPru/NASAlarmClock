#!/usr/bin/python

from datetime import datetime, timedelta
import time
import threading
import signal

import utils.logger as logger


class Event(object):
    def __init__(self, name, action, hours, minutes, weekdays, args):
        self.name = name
        self.minutes = self.conv_to_set(minutes)
        self.hours = self.conv_to_set(hours)
        self.weekdays = self.conv_to_set(weekdays)
        self.action = action
        self.args = args

    def matchtime(self, curtime):
        # weekday() returns 0-6, starting from Monday.  in weekdays 0 is sunday, 1 is monday
        curday = (curtime.weekday() + 1) % 7
        # Return True if this event should trigger at the specified datetime
        return ((curtime.minute    in self.minutes) and
                (curtime.hour      in self.hours) and
                (curday in self.weekdays))

    def check(self, curtime):
        if self.matchtime(curtime):
            logger.debug("[scheduler run task] " + self.name)
            play_thread = threading.Thread(name=self.name, target=self.action, args=self.args)
            play_thread.start()

    def conv_to_set(self, obj):
        # string of ints to set of ints
        if isinstance(obj, basestring):
            strlist = obj.split(',')
            intlist = [int(i) for i in strlist]
            return set(intlist)
        if isinstance(obj, (int,long)):
            return set([obj])  # Single int item
        if not isinstance(obj, set):
            obj = set(obj)
        return obj


run_event = threading.Event()

class Scheduler:

    events = []
    lock = threading.Lock()

    def __init__(self, fillSchedulerFunc):
        logger.debug("[scheduler create]")
        self.fillSchedulerFunc = fillSchedulerFunc
        self.fillSchedulerFunc(self)

    def clearEvents(self):
        logger.debug("[scheduler clear all events]")
        self.events = []

    def addEvent(self, event):
        logger.debug("[scheduler add event] ", str(event.hours), str(event.minutes), str(event.weekdays))
        self.events.append(event)

    def run(self):
        logger.debug("[scheduler start]")

        run_event.set()
        signal.signal(signal.SIGUSR1, self.updateScheduler)

        shed_thread = threading.Thread(name='sheduler_runner', target=self.runnerfunc)
        shed_thread.start()

    def runnerfunc(self):
        nexttime = datetime(*datetime.now().timetuple()[:5])
        while run_event.is_set():
            #logger.debug("[scheduler check]")

            self.lock.acquire()
            for e in self.events:
                e.check(nexttime)
            self.lock.release()

            # logger.debug("[scheduler wait minute]")
            nexttime += timedelta(minutes=1)
            while (datetime.now() < nexttime) and (run_event.is_set()):
                time.sleep(1)

        logger.debug("[scheduler finished]")

    def updateScheduler(self, signum=0, stack=0):
        logger.debug("signal received - update scheduler")

        self.lock.acquire()
        self.fillSchedulerFunc(self)
        self.lock.release()
