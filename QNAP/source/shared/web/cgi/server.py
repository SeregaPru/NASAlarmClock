#!/usr/bin/python

import daemon.runner
import sys
import threading
import time
import traceback

import utils.logger as logger

import nas.audiostation as audiostation
import nas.login as login
import nas.version as version

import scheduler
import tasks
import players
import play


class Core():
    interactive = False

    playersCache = ""
    audiostation = None

    def __init__(self, interactive):
        self.interactive = interactive

        if (not self.interactive):
            # Daemon behaviour
            self.stdin_path      = '/dev/null'
            self.stdout_path     = '/dev/stdout'
            self.stderr_path     = '/dev/stderr'
            self.pidfile_path    = '/var/run/alarmclock.pid'
            self.pidfile_timeout = 5


    def run(self):
        # Main daemon loop
        try:
            logger.setup()

            if (self.interactive):
                logger.interactive = True
                logger.info("===============================================")
                logger.info("[ Interactive run ]")
            else:
                logger.info("===============================================")
                logger.info("[ Daemon run ]")
            logger.info(" version = " + version.version)

            login.login()
            self.audiostation = audiostation.AudioStation()

            # generate players list cache
            logger.debug("players cache - initial fill")
            self.updatePlayers()

            # create and fill scheduler
            self.sched = scheduler.Scheduler(self.fillScheduler)
            self.sched.run()

            while True:
                time.sleep(1)

            logger.info("[ Daemon run end ]")

        except (KeyboardInterrupt, SystemExit):
            print '\n! Received interrupt, quitting threads.\n'
            self.finish()

        except Exception:
            #self.sched.shutdown()
            logger.error("Exception: " + traceback.format_exc())
            self.finish()
            sys.exit(1)


    def fillScheduler(self, sched):
        logger.setup()
        logger.info("[server fillScheduler]")

        # read tasks from file
        tasksData = tasks.get_tasks()
        logger.debug(tasksData)

        sched.clearEvents()

        # initialize scheduler with tasks
        for task in tasksData:
            if (task['on'] == "1"):
                event = scheduler.Event(
                    "play_" + str(task['id']),
                    self.playAlarm, task['hour'], task['minute'], task['schedule'], (task['id'],))
                sched.addEvent(event)

        # special task to update players list
        event = scheduler.Event(
            "update_players",
            self.updatePlayers,
            "0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23", #hours
            "0,2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,40,42,44,46,48,50,52,54,56,58", #minutes
            "0,1,2,3,4,5,6", #days
            ()
            )
        sched.addEvent(event)


    def finish(self):
        logger.setup()
        logger.info("[server finish]")
        scheduler.run_event.clear()


    # launch new thread to play selected alarm
    def playAlarm(self, taskGuid):
        logger.setup()
        logger.info("[server playAlarm]", taskGuid)
        asplayer = play.ASPlayer()
        asplayer.PlayGUID(taskGuid)


    def updatePlayers(self):
        logger.setup()
        # logger.debug("players cache - begin update")

        # get players from audiostation, compare them with memory and if needed rewrite cache file
        playersItems = self.audiostation.getPlayersItems()
        #logger.debug(playersItems)
        playersData = players.getPlayersSerialized(playersItems)
        # compare with memory cache
        if (playersData != self.playersCache):
            # update both memory and file cache
            logger.debug("players cache - update memory and file cache")
            logger.debug(playersData)
            logger.debug(self.playersCache)
            self.playersCache = playersData
            players.updatePlayersCache(playersItems)


if __name__ == "__main__":
    if len(sys.argv) == 2:
        if (sys.argv[1] == "-i"): #interactive
            core = Core(True)
            core.run()
        else:
            core = Core(False)
            runner = daemon.runner.DaemonRunner(core)
            runner.do_action() # start|stop|restart as sys.argv[1]
    else:
        print "Usage: %s start|stop|restart" % sys.argv[0]
        sys.exit(1)
else:
    print "Core daemon can't be included in another program."
    sys.exit(1)
