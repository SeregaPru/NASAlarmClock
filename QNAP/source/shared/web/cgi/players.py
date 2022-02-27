#!/usr/bin/python

import os.path
import lockfile
import json

import utils.logger as logger

import nas.audiostation as audiostation
import nas.nassettings as nassettings


playersFileName = nassettings.SETTINGS_PATH + 'players.conf'
playersFileLock = nassettings.SETTINGS_PATH + 'players.lock'


def getPlayersSerialized(playersItems):
    return json.dumps(playersItems, indent=1, sort_keys=True)


# read players data from cache file
# and deserialize them from JSON to internal format
def readPlayersCache():
    if not os.path.isfile(playersFileName):
        return "[]"

    # read from file
    #TODO LOCK set
    with open(playersFileName, 'r') as file_:
        playersData = file_.read()
    #TODO LOCK release

    return playersData


# write players data to file
# input - internal format
# save - serialized data
def updatePlayersCache(playersItems):
    #JSON serialize
    playersData = getPlayersSerialized(playersItems)

    #TODO LOCK set
    with open(playersFileName, 'w') as file_:
        file_.write(playersData)
    #TODO LOCK release



# list of players (local and remote)
# return: players list in internal format
def listPlayers_internal():
    playersData = readPlayersCache()

    if ((playersData == "[]") or (len(playersData) < 10)):
        logger.debug("players cache file not found. make request")
        audiost = audiostation.AudioStation()
        playersItems = audiost.getPlayersItems()
        updatePlayersCache(playersItems)
    else:
        # json deserialize
        playersItems = json.loads(playersData)

    return playersItems


# select player by name
# return false if player is not found
# return player object if player found
def selectPlayer(playerName):
    logger.info("[players.selectPlayer] " + playerName)

    # get list of installed players
    playersItems = listPlayers_internal()

    # look in players for selected target player
    for player in playersItems:
        if player['name'] == playerName:
            return player

    logger.error("Player [ " + playerName + " ] not found in installed players: ", playersItems)
    return False
