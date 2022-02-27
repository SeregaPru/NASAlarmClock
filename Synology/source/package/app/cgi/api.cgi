#!/usr/bin/python

#
# Back-end for mobile client.
#

import json
import os
import sys
import traceback
import urlparse

import utils.logger as logger
import utils.response as response

import nas.audiostation as audiostation
import nas.login as login
import nas.nassettings as nassettings
import nas.version as version

import play
import players
import tasks


httpMethod = ""
GetArgs = []
PostArgs = []

def main():
    global httpMethod, GetArgs, PostArgs

    print "Content-type: application/json"
    print "Access-Control-Allow-Origin: *"
    print "Access-Control-Expose-Headers: Access-Control-Allow-Origin"
    print "Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept"
    print

    logger.setup()
    #logger.info("[ API.main ]")

    try:
        #-- determine method POST or GET or CmdLine
        if 'REQUEST_METHOD' in os.environ:
            httpMethod = os.environ['REQUEST_METHOD']

            # parse GET request
            if httpMethod == "GET":
                qs = ""
                if 'QUERY_STRING' in os.environ:
                    qs = os.environ['QUERY_STRING']
                GetArgs = urlparse.parse_qs(qs)
                action = GetArgs["action"][0]

            # parse POST request
            elif httpMethod == "POST":
                # get POST request data
                fp = sys.stdin
                clength = int(os.environ['CONTENT_LENGTH'])
                rawdata = fp.read(clength)
                fp.close
                PostArgs = json.loads(rawdata)
                action = PostArgs['action']

            # other methods are not supported
            else:
                response.Error("Only GET and POST are supported")
        else:

        #-- command-line call parameters
            httpMethod = "CLI"
            logger.interactive = True
            if len(sys.argv) < 2:
                response.Error("Missing 'action' parameter, should be first argument")
            else:
                action = sys.argv[1]


        ##======================= BEGIN MAIN WORK ===============

        status = "OK"
        resultData = ""

        #-- logger functions
        # get content of log file.
        if action == "get_log":
            logger.info("[API.get_log]")
            with open(nassettings.LOG_FILENAME) as f:
                print f.read()
            sys.exit()

        elif action == "clear_log":
            logger.info("[API.clear_log]")
            logger.clear()
            response.OK()


        #-- login functions
        elif action == "login":
            logger.info("[API.login]")
            checkPOST()
            param_login = getParam("login", 2, True)
            param_password = getParam("password", 3, True)
            login.loginproxy(param_login, param_password)

        elif action == "check_auth":
            logger.info("[API.check_auth]")
            login.check_auth()

        elif action == "check_sid":
            logger.info("[API.check_sid]")
            checkGET()
            sid = getParam("sid", 2, True)
            login.check_sid(sid)

        elif action == "check_version":
            logger.info("[API.check_version]")
            response.Send(version.version)

        elif action == "get_account":
            logger.info("[API.get_account]")
            login.get_account()

        elif action == "set_account":
            logger.info("[API.set_account]")
            checkPOST()
            accountData = getParam("data", 2, True)
            login.set_account(accountData)


        #-- devices and playlist functions
        elif action == "get_devices":
            logger.info("[API.get_devices]")
            loginResult = login.login()
            playersItems = players.listPlayers_internal()
            res = {"players": playersItems}
            response.Send(res)

        elif action == "get_playlists":
            logger.info("[API.get_playlists]")
            loginResult = login.login()
            audiost = audiostation.AudioStation()
            playlists = audiost.listPlaylistsJSON()
            res = {"playlists": playlists}
            response.Send(res)

        elif action == "get_allinone":
            logger.info("[API.get_allinone]")
            loginResult = login.login()

            playersItems = players.listPlayers_internal()

            audiost = audiostation.AudioStation()
            playlists = audiost.listPlaylistsJSON()

            tasksData = tasks.get_tasks()
            res = {"tasks": tasksData, "players": playersItems, "playlists": playlists}
            response.Send(res)


        #-- tasks functions
        elif action == "get_tasks":
            logger.info("[API.get_tasks]")
            tasksData = tasks.get_tasks()
            response.Send(tasksData)

        elif action == "save_tasks":
            logger.info("[API.save_tasks]")
            checkPOST()
            tasksData = getParam("data", 2, True)
            tasks.save_tasks(tasksData)


        #-- play functions
        elif action == "play":
            logger.info("[API.play]")
            guid = getParam("guid", 2, True)
            asplayer = play.ASPlayer()
            asplayer.PlayGUID(guid)

        elif action == "startplay":
            logger.info("[API.startplay]")
            guid = getParam("guid", 2, True)
            asplayer = play.ASPlayer()
            asplayer.StartPlayGUID(guid)

        elif action == "playstatus":
            guid = getParam("guid", 2, True)
            asplayer = play.ASPlayer()
            asplayer.GetPlayStatus(guid)

        elif action == "stopplay":
            logger.info("[API.stopplay]")
            playerid = getParam("playerid", 2, True)
            asplayer = play.ASPlayer()
            asplayer.StopPlayGUID(playerid)


        else:
            response.Error("unknown action: " + action)

    except Exception as ex:
        logger.error(traceback.format_exc())
        response.Error("Exception: " + str(ex))



#=============================================

def checkPOST():
    global httpMethod
    if httpMethod != "POST":
        response.Error("POST method expected")

def checkGET():
    global httpMethod
    if httpMethod != "GET":
        response.Error("GET method expected")

# returns named param from GEt or POST request
# or ordered param from CLI
# if param is required and parameter not found, then exception is triggered, else empty string returned
def getParam(paramName, paramOrder, required):
    global httpMethod, GetArgs, PostArgs
    param = ""
    if httpMethod == "POST":
        param = PostArgs[paramName]
    elif httpMethod == "GET":
        param = GetArgs[paramName][0]
    elif httpMethod == "CLI":
        if len(sys.argv) > paramOrder:
            param = str(sys.argv[paramOrder])

    if (required) and (param == ""):
        raise Exception('Argument "' + paramName + '" or with order "' + str(paramOrder) + '" ir required')

    return param



if __name__ != "__main__":
    sys.exit(0)

main()
