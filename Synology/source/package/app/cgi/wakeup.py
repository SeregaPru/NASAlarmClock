#!/usr/bin/python

import time

from utils import logger

import nas.naswebapi as naswebapi


class wakeupPlayer:

    wakeupTimeoutSec = 20

    # the main method of this class -
    # do wakeup according to selected method
    # - wakeup player directly
    # - or indirectly by sending play and stop command
    #   then wait for some seconds to full device ready, and then begin to play and set initial volume
    def doWakeup(self, wakeupMethod, player, audiost):
        logger.debug("[wakeup.doWakeup] method = " + wakeupMethod)
        if (wakeupMethod == "yamaha"):
            # directly wakeup yamaha receiver
            self.wakeupYamaha(player)

        elif (wakeupMethod == "wait"):
            # indirectly wakeup network player - send play & stop
            audiost.setVolume(0)
            play_status = audiost.play(0)
            audiost.stop()
            logger.debug("sleep some second - wait device for wakeup")
            time.sleep(self.wakeupTimeoutSec)


    # wakeup yamaha network av receiver
    # by sending special remote control commands by HTTP to receiver's ip address
    def wakeupYamaha(self, player):
        logger.info("[wakeup.Yamaha] " + player['name'])

        powerOnCmd = '<?xml version="1.0" encoding="utf-8"?><YAMAHA_AV cmd="PUT"><Main_Zone><Power_Control><Power>On</Power></Power_Control></Main_Zone></YAMAHA_AV>'
        selectPCSourceCMD = '<?xml version="1.0" encoding="utf-8"?><YAMAHA_AV cmd="PUT"><Main_Zone><Input><Input_Sel>PC</Input_Sel></Input></Main_Zone></YAMAHA_AV>'

        yamahaHost = player['ip']
        if yamahaHost != "":
            URL = "/YamahaRemoteControl/ctrl"
            res = naswebapi.POST2(URL, powerOnCmd, yamahaHost, True, False)
            res = naswebapi.POST2(URL, selectPCSourceCMD, yamahaHost, True, False)
            time.sleep(5)
