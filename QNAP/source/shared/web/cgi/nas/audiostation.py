#!/usr/bin/python

import json
import random
import traceback
import urllib
import xml.etree.ElementTree as etree

import utils.logger as logger
import utils.xml2obj as xml2obj

import nas.naswebapi as naswebapi



class AudioStation:
    # internal id of selected player
    targetid = ""

    # shuffle mode
    shuffle = False

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
        URL = "/musicstation/api/dmc.php?a=listRenderers" + "&sid=" + naswebapi.webapi_session_id
        resdata = naswebapi.GET(URL, False)
        playersItems = []
        ##!! TODO - check auth errors correctly, not in exceptions
        try:
            playersData = xml2obj.deserialize(resdata)

            for player in playersData['QDocRoot']['devices'][0]['device']:
                playerId = player['deviceId'][0]['_text']
                playerName = player['deviceName'][0]['_text']
                playerType = player['location'][0]['_text']
                playerIP = player['ip'][0]['_text']

                playerItem = {'name':playerName, 'type':playerType, 'id':playerId, 'ip':playerIP}
                playersItems.append(playerItem)
        except Exception as ex:
            logger.error("listRenderers URL : " + URL)
            logger.error("listRenderers response : " + resdata)
            logger.error(traceback.format_exc())

        return playersItems


    # -- play lists operations --

    #- playlist list in short format, for client app
    #- "[
    # "name": "Beatles - A Hard Days Night",
    # "id": "playlist_shared_normal/280"
    def listPlaylistsJSON(self):
        logger.info("[AudioStation.listPlaylist]")
        URL = "/musicstation/api/medialist_api.php?act=list&type=allplaylist&linkid=&pagesize=200&currpage=1" + "&sid=" + naswebapi.webapi_session_id
        resdata = naswebapi.GET(URL, True, False, True)
        playlistsJSON = []
        try:
            playlists = xml2obj.deserialize(resdata)

            playlistsCount = int(playlists['QDocRoot']['datas'][0]['TotalCounts'][0]['_text'])
            logger.debug(" PlayLists count = " + str(playlistsCount))

            if (playlistsCount > 0):
                for playlist in playlists['QDocRoot']['datas'][0]['data']:
                    playlistId = playlist['LinkID'][0]['_text']
                    playlistName = playlist['Title'][0]['_text']

                    playlistItem = {'name':playlistName, 'id':playlistId}
                    playlistsJSON.append(playlistItem)
        except Exception as ex:
            logger.error("listPlaylist URL : " + URL)
            logger.error("listPlaylist response : " + resdata)
            logger.error(traceback.format_exc())

        return playlistsJSON


    # set current play list for selected device
    # @playlistId
    # @shuffle - because of music station behavior, it does not shuffle itself.
    #            we should reorder play list in random order and then send it to MusicStation
    def setPlaylist(self, playlistId):
        global shuffle

        playlistId = str(playlistId)
        logger.info("[AudioStation.setPlaylist] " + playlistId)

        # stop
        self.stop()

        # clear play-now
        URL = "/musicstation/api/mediatool_api.php?act=save&type=currplaylist&postxml=%3Cdatas%3E%3C%2Fdatas%3E&savetoserver=4&did:" + self.targetid + "&sid=" + naswebapi.webapi_session_id
        resxml = naswebapi.GET(URL)

        # get selected playlist content
        URL = "/musicstation/api/medialist_api.php?act=list&type=allplaylist&linkid=" + playlistId + "&sid=" + naswebapi.webapi_session_id
        playlist_xml = naswebapi.GET(URL)

        # remove non used tags from received playlist xml
        xml_root = etree.fromstring(playlist_xml)
        if xml_root is not None:
            datas = xml_root.find('datas')
            datas.remove(datas.find('TotalCounts'))
            datas.remove(datas.find('CurrPage'))
            datas.remove(datas.find('PageSize'))

        songsCount = len(datas.getchildren())
        logger.debug(" songs count: " + str(songsCount))

        if self.shuffle:
            # because of music station behavior, it does not shuffle itself.
            # we should reorder play list in random order and then send it to MusicStation
            #! xml2obj.indent(datas)
            #! logger.debug(etree.tostring(datas))

            # generate indexes for items that should be changed order
            orders = range(1, songsCount + 1)
            random.shuffle(orders)
            datasOrdered = etree.Element('datas')

           # iterate children and move them to the new root with reorder
            for i in range(0, songsCount):
                newOrder = orders[i]
                item = datas.find('.//data[' + str(newOrder) + ']')
                orderItem = item.find("Order")
                orderItem.text = str(i+1)
                orderItem2 = item.find("iOrderNr")
                orderItem2.text = str(i+1)
                datasOrdered.append(item)

            datas = datasOrdered

        # prepare playlist to send
        xml2obj.indent(datas)
        playlist_xml_trunc = etree.tostring(datas)
        logger.debug("  prepared playlist: \n" + playlist_xml_trunc)
        playlist_str_encoded = urllib.quote_plus(playlist_xml_trunc)

        # set playlist to play-now
        URL = "/musicstation/api/mediatool_api.php"
        data = "act=save&type=currplaylist&postxml=" + playlist_str_encoded + "&savetoserver=4&did=" + self.targetid + "&sid=" + naswebapi.webapi_session_id
        resxml = naswebapi.POST(URL, data, False)

        return songsCount


    # -- play operations --

    # plays selected playlist in selected player
    #  song - deprecated - from which song to start
    def play(self, song = 0):
        logger.info("[AudioStation.play]")
        URL = "/musicstation/api/dmc.php?a=play&d=" + self.targetid + "&sid=" + naswebapi.webapi_session_id
        resdata = naswebapi.GET(URL)
        return resdata

    # stops play on selected player
    def stop(self):
        logger.info("[AudioStation.stop]")
        return self.stopPlayer(self.targetid)

    # stops play on selected player
    def stopPlayer(self, playerid):
        logger.info("[AudioStation.stopPlayer]")
        URL = "/musicstation/api/dmc.php?a=stop&d=" + playerid + "&sid=" + naswebapi.webapi_session_id
        resdata = naswebapi.GET(URL)
        return resdata

    # set volume on player
    def setVolume(self, volume):
        URL = "/musicstation/api/dmc.php?a=setVolume&v=" + str(volume) + "&d=" + self.targetid + "&sid=" + naswebapi.webapi_session_id
        resdata = naswebapi.GET(URL)
        return resdata

    # get player status
    def playerStatus(self):
        URL = "/musicstation/api/dmc.php?a=getPlayerStatus&d=" + self.targetid + "&sid=" + naswebapi.webapi_session_id
        resxml = naswebapi.GET(URL)
        logger.debug(resxml)
        resdata = xml2obj.deserialize(resxml)

        status = resdata['QDocRoot']['status'][0]['_text']
        # if playerstatus returns error
        if (status != "0"):
            msg = resdata['QDocRoot']['msg'][0]['_text']
            player_status = ('ERROR', "", "00:00:00", msg)
            return player_status

        playSong = "" #!! TODO resdata['QDocRoot']['currentAudioTrack'][0]['_text']
        playState = resdata['QDocRoot']['playerState'][0]['_text']
        playTime = resdata['QDocRoot']['currTime'][0]['_text']
        player_status = (playState, playSong, playTime, "");
        return player_status

    def setShuffle(self, value):
        global shuffle
        self.shuffle = value

        URL = "/musicstation/api/dmc.php?a=setPlayMode&m=SHUFFLE&d=" + self.targetid + "&sid=" + naswebapi.webapi_session_id
        resdata = ""
        resdata = naswebapi.GET(URL)
        return resdata

    def next(self):
        #!! TODO - check implementation
        logger.info("[AudioStation.next]")
        URL = "/musicstation/api/dmc.php?a=next&d=" + playerid + "&sid=" + naswebapi.webapi_session_id
        resdata = synowebapi.GET(URL)
        return resdata
