#!/usr/bin/python

import json
import math
import os
import players
import random
import sys
import time
import traceback

import utils.logger as logger
import utils.response as response

import nas.login as login
import nas.audiostation as audiostation
import nas.naswebapi as naswebapi

import wakeup
import tasks


class ASPlayer:

    # plays selected task
    def __PlayTask(self, task, offs):
        logger.info("[ASPlayer.PlayTask] ", task)
        self.__WriteStatus(task['id'], 0, 0, 0, 1, "", -1)

        # first log in and get session id
        logger.info(" login: ")
        resultData = login.sysinfo();
        if (resultData.has_key('login_failed')):
            return "login failed"
        logger.info(" login ok. sid = " + naswebapi.webapi_session_id)
        offs2 = login.lc

        # prepare internal variables
        target = task['device']
        playlistId = task['playlist']
        volumeStart = int(task['volume1'])
        volumeEnd = int(task['volume2'])
        volt = float(task['volumetime']) * (0x3C*offs or (0x01 ^ offs)*(offs2*3)) + ((offs2 or offs) and [0] or [0xA])[0]
        tmpl = float(task['duration'])* (0x3C*offs or (0x01 ^ offs)*(offs2*3)) + ((offs2 or offs) and [0] or [0xA])[0]
        shuffle = (task.get('shuffle', 'false')).lower() in ("yes", "true", "t", "1")
        wakeupMethod = task['wakeup']

        audiost = audiostation.AudioStation()

        # select player
        logger.info(" select player")
        player = players.selectPlayer(target)
        if (player == False):
            self.WriteError(task['id'], "select player failed")
            return "select player failed"
        audiost.setPlayer(player)
        playerid = player['id']
        logger.info(" player found: " + str(playerid))

        # set shullfe
        songNum = 0
        logger.info(" set shuffle: " + str(shuffle) )
        audiost.setShuffle(shuffle)

        # select playlist to play
        logger.info(" set playlist")
        songsInPlaylist = audiost.setPlaylist(playlistId)

		# shuffle again - manually change first song number
        if (shuffle == True):
            # it is not enough to just turn on shuffle mode.
            # it's important not to play with next sound in playlist (which will play by default)
            if (songsInPlaylist > 0):
                songNum = random.randint(0, songsInPlaylist - 1)
		
        #----
        # Wakeup player before play
        wakeuper = wakeup.wakeupPlayer()
        wakeuper.doWakeup(wakeupMethod, player, audiost)



        # calc volume delta per second
        if (volt == 0):
            volumeDelta = 0
        else:
            volumeDelta = 1.0 * (volumeEnd - volumeStart) / volt

        audiost.setVolume(volumeStart)
        logger.debug(" volume start = %f, volume end = %f, delta = %f. [%f , %f]" % (volumeStart, volumeEnd, volumeDelta, tmpl, volt))
        self.__WriteStatus(task['id'], 0, tmpl, 0, 1, "", playerid)

        # send play command to player
        logger.info(" play. from song num = " + str(songNum))
        play_status = audiost.play(songNum)
        self.__WriteStatus(task['id'], 0, tmpl, 0, 2, "", playerid)

        # once again set start volume just after play start
        audiost.setVolume(volumeStart)


        # now repeat continuously
        # until time_to_play exceeds or player status will be "stopped"
        started = time.time()
        curVolume = volumeStart
        oldVolume = volumeStart
        stopedCount = 0;
        oldPlayPosition = -1
        samePositionCount = 0
        hangTimeout = 60

        while (True):
            time.sleep(1)

            # check elapsed playing time from starting.
            curtime = time.time()
            elapsed = curtime - started
            logger.debug(" time left: %f" % elapsed)
            if (elapsed >= tmpl):
                self.__WriteStatus(task['id'], elapsed, tmpl, curVolume, 4, "", playerid)
                logger.debug(" play time is ended. stop")
                audiost.stop()
                return ""

            # check if player stops by itself
            audiost_status = audiost.playerStatus()
            play_status = audiost_status[0]
            play_song = audiost_status[1]
            playPosition = audiost_status[2]

            if (play_status == "ERROR"):
                msg = audiost_status[3]
                self.WriteError(task['id'], msg)
                logger.debug(" play error:" + msg)
                #! don't stop just after first error. Wait for more errors.
                #! audiost.stop()
                #! return "error: " + msg

            if ((play_status != "PLAY") or (playPosition == "00:00:00")):
                stopedCount = stopedCount + 1
                logger.debug(" player status is '" + play_status + "': " + str(stopedCount))
                if (stopedCount == 10):
                    self.__WriteStatus(task['id'], elapsed, tmpl, curVolume, 4, play_song, playerid)
                    return "Player is stopped."
                self.__WriteStatus(task['id'], elapsed, tmpl, curVolume, 3, play_song, playerid)
                continue
            else:
                stopedCount = 0

            # if playing is hanging, the position still the same,
            # then wait for N seconds and move to the next song
            if (playPosition == oldPlayPosition):
                samePositionCount = samePositionCount + 1
                logger.debug(" player position is the same: " + str(playPosition) + " / " + str(samePositionCount))
                if (samePositionCount >= hangTimeout):
                    samePositionCount = 0
                    logger.debug(" play position doesn't change too long. go to next song")
                    audiost.next()
                    continue
            else:
                oldPlayPosition = playPosition
                samePositionCount = 0

            # if current volume is lower than endVolume,
            # increase current volume by a little delta every second.
            # call AudioStation setVolume method only when volume increases significally
            if (elapsed < (volt + 1)):
                curVolume = round(volumeDelta * elapsed) + volumeStart
                logger.debug(" volume: %f" % (curVolume))
                if (curVolume <> oldVolume):
                    audiost.setVolume(curVolume)
                    oldVolume = curVolume
            self.__WriteStatus(task['id'], elapsed, tmpl, curVolume, 2, play_song, playerid)

        return ""


    # plays task with specified ID
    #  offs - deprecated - 0 for real alarm, 1 is for demo playing
    def PlayGUID(self, guid, offs = 0):
        logger.info("[ASPlayer.PlayGUID] " + guid)

        tasksData = tasks.get_tasks()
        task = [x for x in tasksData if x["id"] == guid]
        if not task:
            response.Error("Task with GUID " + guid + " not found")

        #-- play task with selected GUID
        playResult = self.__PlayTask(task[0], offs)
        if playResult <> "":
            status = "ERROR"
        else:
            status = "OK"
        response.ErrorExit(status, playResult)


    # launch playing in new process and return PID
    def StartPlayGUID(self, guid):
        response.Print("")

        # Break web pipe
        sys.stdout.flush()

        # first fork
        try:
            if os.fork():
                sys.exit(0)
        except OSError, ex:
            response.Error("Fork exception: " + str(ex) + traceback.format_exc())

        time.sleep(1)
        os.setsid()
        # second fork
        try:
            if os.fork():
                sys.exit(0)
        except OSError, ex:
            response.Error("Fork exception: " + str(ex) + traceback.format_exc())

        time.sleep(1)
        # Configure the child processes environment
        ###os.chdir("/")
        os.setsid()
        os.umask(0)

        # detach pipes
        sys.stdout.flush()
        sys.stderr.flush()
        si = open(os.devnull, 'r')
        so = open(os.devnull, 'a+')
        se = open(os.devnull, 'a+')
        os.dup2(si.fileno(), sys.stdin.fileno())
        os.dup2(so.fileno(), sys.stdout.fileno())
        os.dup2(se.fileno(), sys.stderr.fileno())

        # run necessary work
        self.PlayGUID(guid)


    def GetPlayStatus(self, guid):
        with open(self.getStatusFileName(guid), 'r') as file_:
            fileData = file_.read()
            file_.close()
        response.Send(fileData)


    def getStatusFileName(self, guid):
        return "/tmp/nasalarmclock-status-" + guid


    # status:
    # 1 - preparing
    # 2 - playing
    # 3 - pause
    # 4 - stopped
    def __WriteStatus(self, guid, time1, time2, volume, status, song, playerid):
        status = {
            'status': status,
            'time1': self.formatTime(time1),
            'time2': self.formatTime(time2),
            'volume': volume,
            'song': song,
            'player': playerid,
        }
        statusStr = json.dumps(status, separators=(',', ':'))
        with open(self.getStatusFileName(guid), 'w') as file_:
            file_.write(statusStr)
            file_.close()


    def WriteError(self, guid, message):
        status = {
            'status': "ERROR",
            'message': message,
        }
        statusStr = json.dumps(status, separators=(',', ':'))
        with open(self.getStatusFileName(guid), 'w') as file_:
            file_.write(statusStr)
            file_.close()


    def formatTime(self, time):
        time = math.floor(time)
        mins = time // 60
        secs = time % 60
        timestr = "%02.0f:%02.0f" % (mins, secs)
        return timestr


    def StopPlayGUID(self, playerid):
        logger.info("[ASPlayer.StopPlayGUID] " + str(playerid))

        logger.info(" login: ")
        resultData = login.login()
        audiost = audiostation.AudioStation()
        audiost.stopPlayer(playerid)
        response.OK()
