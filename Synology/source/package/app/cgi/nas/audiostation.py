#!/usr/bin/python

import json
import traceback
import urllib
import xml.etree.ElementTree as etree

import utils.logger as logger
import utils.xml2obj as xml2obj

import nas.naswebapi as naswebapi



class AudioStation:
    # internal id of selected player
    targetid = ""

    # -- players operations --

    def setPlayer(self, player):
        global targetid
        self.targetid = urllib.quote_plus(player['id'])


    #- get players from AudioStation
    #- in internal object format
    #- players list in short format, for client app
    #- "[
    #-   {
    #-     "name": "CEOL piccolo (DLNA)",
    #-     "type": "upnp",
    #-     "id": "uuid:5f9ec1b3-ff59-19bb-8530-0005cd33a83b"
    #-   },
    #-   {...}
    #- ]
    def getPlayersItems(self):
        # return all players - local and remote
        URL = "/webapi/AudioStation/remote_player.cgi"
        data = "api=SYNO.AudioStation.RemotePlayer&version=1&method=list"
        resdata = naswebapi.POST(URL, data, False, False, False)

        playersData = json.loads(resdata)

        ##!! TODO - check auth errors correctly, not in exceptions
        playersItems = []
        try:
            players = playersData['data']['players']
            for player in players:
                playerId = player['id']
                playerName = player['name']
                playerType = player['type']

                playerItem = {'name':playerName, 'type':playerType, 'id':playerId, 'ip':''}
                playersItems.append(playerItem)
        except Exception as ex:
            logger.error(traceback.format_exc())
            logger.error(resdata)

        # additional request to collect detailed information for players
        # (perhaps) needs admin permissions
        #URL = "/webapi/_______________________________________________________entry.cgi"
        #data = "api=SYNO.MediaServer.ClientList&method=list_client&version=1"
        #resdata = naswebapi.POST(URL, data)
        resdata = naswebapi.EXEC("SYNO.MediaServer.ClientList", "list_client", 1)

        try:
            detailedData = json.loads(resdata)
            players = detailedData['data']['ClientList']
            for player in players:
                for playerItem in playersItems:
                    if (playerItem['name'] == player.get('friendlyName', '')):
                        playerItem['ip'] = player.get('ipAddr', '')
                        break
        except Exception as ex:
            logger.error(traceback.format_exc())
            logger.error(resdata)

        return playersItems


    # -- play lists operations --

    #- playlist list in short format, for client app
    #- "[
    # "name": "Beatles - A Hard Days Night",
    # "id": "playlist_shared_normal/280"
    def listPlaylistsJSON(self):
        logger.info("[AudioStation.listPlaylist]")
        URL = "/webapi/AudioStation/playlist.cgi"
        data = "api=SYNO.AudioStation.Playlist&version=2&method=list"
        resdata = naswebapi.POST(URL, data)
        playlists = json.loads(resdata)

        playlistsJSON = []
        try:
            playlistsCount = int(playlists['data']['total'])
            logger.debug(" PlayLists count = " + str(playlistsCount))

            if (playlistsCount > 0):
                for playlist in playlists['data']['playlists']:
                    playlistId = playlist['id']
                    playlistName = playlist['name']

                    playlistItem = {'name':playlistName, 'id':playlistId}
                    playlistsJSON.append(playlistItem)
        except Exception as ex:
            logger.error(traceback.format_exc())
            logger.error(resdata)

        return playlistsJSON


    #?????
    def setPlaylist(self, playlistId):
        playlistId = str(playlistId)
        logger.info("[AudioStation.setPlaylist] " + playlistId)

        # stop
        self.stop()

        # get playlist
        URL = "/webapi/AudioStation/remote_player.cgi"
        data = "api=SYNO.AudioStation.RemotePlayer&version=2&method=getplaylist&id=" + self.targetid + "&library=shared&containers_json=[{\"type\":\"playlist\",\"id\":\"" + playlistId + "\"}]"
        res = naswebapi.POST(URL, data)
        resdata = json.loads(res)
        # get items count in current playlist
        cnt = resdata['data']['total']
        logger.debug(str(cnt) + " songs was in playlist. Clear")

        # SET playlist with replace of previous playlist
        URL = "/webapi/AudioStation/remote_player.cgi"
        data = "api=SYNO.AudioStation.RemotePlayer&version=2&method=updateplaylist&id=" + self.targetid + "&library=shared&offset=0&limit=" + str(cnt) + "&play=true&containers_json=[{\"type\":\"playlist\",\"id\":\"" + playlistId + "\"}]"
        res = naswebapi.POST(URL, data)
        resdata = json.loads(res)

        return cnt


    # -- play operations --

    # plays selected playlist in selected player
    def play(self, song=0):
        logger.info("[AudioStation.play]")
        URL = "/webapi/AudioStation/remote_player.cgi"
        data = "api=SYNO.AudioStation.RemotePlayer&version=2&method=control&action=play&value=" + str(song) + "&id=" + self.targetid
        #data = "api=SYNO.AudioStation.RemotePlayer&version=2&method=control&action=play&id=" + self.targetid
        res = naswebapi.POST(URL, data)
        resdata = json.loads(res)
        return resdata

    # stops play on selected player
    def stop(self):
        logger.info("[AudioStation.stop]")
        return self.stopPlayer(self.targetid)

    # stops play on selected player
    def stopPlayer(self, playerid):
        logger.info("[AudioStation.stopPlayer]")
        URL = "/webapi/AudioStation/remote_player.cgi"
        data = "api=SYNO.AudioStation.RemotePlayer&version=2&method=control&action=stop&id=" + playerid
        res = naswebapi.POST(URL, data)
        resdata = json.loads(res)
        return resdata

    # set volume on player
    def setVolume(self, volume):
        URL = "/webapi/AudioStation/remote_player.cgi"
        data = "api=SYNO.AudioStation.RemotePlayer&version=2&method=control&action=set_volume&value=" + str(volume) + "&id=" + self.targetid
        res = naswebapi.POST(URL, data)
        resdata = json.loads(res)
        return resdata

    # get player status
    def playerStatus(self):
        URL = "/webapi/AudioStation/remote_player_status.cgi"
        data = "api=SYNO.AudioStation.RemotePlayerStatus&method=getstatus&version=1&id=" + self.targetid
        res = naswebapi.POST(URL, data, False, False, True)
        resdata = json.loads(res)

        # if playerstatus returns error
        #! TODO
        #if (status != "0"):
        #    msg = resdata['QDocRoot']['msg'][0]['_text']
        #    player_status = ('ERROR', "", "00:00:00", msg)
        #    return player_status

        if (resdata['data']['song']):
            playSong = resdata['data']['song']['title']
        else:
            playSong = ""
        playState = resdata['data']['state']
        if (playState == 'playing'):
            playState = 'PLAY'
        playTime = resdata['data']['position']
        player_status = (playState, playSong, playTime, "");
        return player_status

    def setShuffle(self, value):
        URL = "/webapi/AudioStation/remote_player.cgi"
        data = "api=SYNO.AudioStation.RemotePlayer&version=2&method=control&action=set_shuffle&value=" + str(value) + "&id=" + self.targetid
        res = naswebapi.POST(URL, data)
        resdata = json.loads(res)
        return resdata

    def next(self):
        logger.info("[AudioStation.next]")
        URL = "/webapi/AudioStation/remote_player.cgi"
        data = "api=SYNO.AudioStation.RemotePlayer&version=2&method=control&action=next&id=" + self.targetid
        res = naswebapi.POST(URL, data)
        resdata = json.loads(res)
        return resdata
