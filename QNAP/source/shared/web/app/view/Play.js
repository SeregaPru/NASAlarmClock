Ext.define('AlarmClock.view.Play', {
    extend: 'Ext.Panel',
    xtype: 'playview',

    timer: undefined,
    recordId: '',

    constructor: function () {
        this.playForm = this.createPlayForm();
        this.substate = 1;

        var content = this.fillConfig();
        this.callParent([content]);
    },

    createPlayForm: function () {
        var playForm = {
            cls: 'playform',
            layout: {
                type: 'vbox',
            },
            padding: '20 20',

            items: [
				{
				    layout: 'hbox',
				    padding: '0 0 16 0',
				    items: [
						{
						    xtype: 'label',
						    width: 80,
						    height: 42,
						    padding: '14 0',
						    html: 'Status:',
						},
						{
						    xtype: 'label',
						    itemId: 'status',
						    height: 42,
						    html: "<img src=resources/icons/status_wait.png align=top> <span style='margin-top: 1em; display: inline-block;> wait</span>",
						    style: 'font-weight:bold;',
						},
				    ]
				},
				{
				    layout: 'hbox',
				    padding: '0 0 32 0',
				    items: [
						{
						    xtype: 'label',
						    width: 80,
						    html: 'Volume:'
						},
						{
						    xtype: 'label',
						    itemId: 'volume',
						    html: '0%',
						    style: 'font-weight:bold;',
						},
				    ]
				},
				{
				    layout: 'hbox',
				    padding: '0 0 32 0',
				    items: [
						{
						    xtype: 'label',
						    width: 80,
						    html: 'Time:'
						},
						{
						    xtype: 'label',
						    itemId: 'time',
						    html: '00:00 / 00:00',
						    style: 'font-weight:bold;',
						},
				    ]
				},
				{
				    layout: 'hbox',
				    padding: '0 0 32 0',
				    items: [
						{
						    xtype: 'label',
						    width: 80,
						    html: 'Song:',
						},
						{
						    xtype: 'label',
						    itemId: 'song',
						    html: '< unknown >',
						    style: 'font-weight:bold;',
						},
				    ]
				},

				{
				    cls: 'contextbutton bluebutton',
				    xtype: 'button',
				    text: "Stop",
				    width: 100,
				    listeners: {
				        tap: function () { this.onBtnStop(); },
				        scope: this,
				    },
				},
            ]
        }

        return playForm;
    },

    fillConfig: function () {
        var panelContent = {
            xtype: 'panel',
            layout: 'vbox',
            items: [
				{
				    xtype: 'toolbar',
				    docked: 'top',
				    items: [
					{
					    xtype: 'button',
					    text: 'Back',
					    icon: 'resources/icons/back.png',
					    cls: 'backbutton',
					    listeners: {
					        tap: function () { this.onPageBack(); },
					        scope: this,
					    }
					},
					{
					    xtype: 'spacer',
					},
					{
					    html: globals.AppTitle + ' - Play',
					    cls: 'titlebar',
					},
					{
					    xtype: 'spacer',
					},
				    ]
				},

				{
				    xtype: 'panel',
				    layout: 'card',
				    flex: 1,
				    items: [
						this.playForm,
				    ]
				},
            ]
        }
        return panelContent;
    },

    // start play selected task
    play: function (record) {
        console.log("start play: " + record);

        // clear controls
        this.updateStatus(this.getStatusHtml(3), "", "", "");

        this.recordId = record.internalId;

        Ext.Ajax.request({
            url: globalVars.baseURL + "?action=startplay&guid=" + this.recordId,
            async: true,
            headers: { "Content-Type": "text/plain" }, // trick to disable OPTIONS request
            useDefaultXhrHeader: false,                // trick to disable OPTIONS request

            success: function (response, options) {
                console.log(response.statusText + ": " + response.responseText);
                var jsonResponse = Ext.util.JSON.decode(response.responseText);
                if (jsonResponse.status == 'ERROR') {
                    //!!this.close();
                    this.displayError(jsonResponse.data);
                } else {
                    this.traceStatus(this.recordId);
                }
            },

            failure: function (response, options) {
                this.close();
                var errorMsg = "";
                console.log(response);
                if (response.isTimeout)
                    errorMsg = "Timeout reached. It's normal behavior when launch from browser. In scheduled launch you will hear everything.";
                else
                    errorMsg = response.statusText + ": " + response.responseText;
                console.log(errorMsg);
                this.displayError(errorMsg);
            },

            scope: this
        });
    },

    // stop playing and close window
    onBtnStop: function () {
        console.log("stop play");
        clearInterval(this.timer);

        // if status is not stopped then send stop signal to player
        if (this.status != 4)
            Ext.Ajax.request({
                url: globalVars.baseURL + "?action=stopplay&playerid=" + this.playerid,
				async: true,
				headers: { "Content-Type": "text/plain" }, // trick to disable OPTIONS request
				useDefaultXhrHeader: false,                // trick to disable OPTIONS request
            });

        this.updateStatus(this.getStatusHtml(4), "", "", "");
        //!!this.close();
    },


    // periodically update playing status
    traceStatus: function (guid) {
        var Url = globalVars.baseURL + "?action=playstatus&guid=" + guid;
        var me = this;

        this.timer = setInterval(
			function () {
			    Ext.Ajax.request({
			        url: Url,
					async: true,
					headers: { "Content-Type": "text/plain" }, // trick to disable OPTIONS request
					useDefaultXhrHeader: false,                // trick to disable OPTIONS request
					
			        success: function (response, options) {
			            var jsonResponse = Ext.util.JSON.decode(response.responseText);
			            if (jsonResponse.status == 'ERROR') {
			                me.onBtnStop();
			                me.displayError(jsonResponse.data);
			            } else {

			                var data = Ext.util.JSON.decode(jsonResponse.data);

			                if (data.status == 'ERROR') {
			                    me.displayError(data.message);
			                    me.onBtnStop();
			                    return;
			                }

			                me.playerid = data.player;
			                me.status = data.status;
			                if (data.status == 4)
			                    clearInterval(me.timer);

			                me.updateStatus(me.getStatusHtml(data.status), (data.time1 + " / " + data.time2), (data.volume + "%"), data.song);
			            }
			        },

			        failure: function (response, options) {
			            me.onBtnStop();
			            var errorMsg = "";
			            console.log(response);
			            if (response.isTimeout)
			                errorMsg = "Timeout reached.";
			            else
			                errorMsg = response.statusText + ": " + response.responseText;
			            console.log(errorMsg);
			            me.displayError(errorMsg);
			        },

			        scope: this
			    });
			},
		1000);
    },

    // update controls on playimng form with current status info
    updateStatus: function (status, time, volume, song) {
        var timeLabel = Ext.ComponentQuery.query("#time")[0];
        var songLabel = Ext.ComponentQuery.query("#song")[0];
        var statusLabel = Ext.ComponentQuery.query("#status")[0];
        var volumeLabel = Ext.ComponentQuery.query("#volume")[0];

        statusLabel.setHtml(status);
        timeLabel.setHtml(time);
        volumeLabel.setHtml(volume);
        songLabel.setHtml(song);
    },

    displayError: function (message) {
        console.log("error: " + message);
        Ext.Msg.alert('Error launch task',
			message +
			"<br><br><a href='" + globalVars.baseURL + "?action=get_log' target=_new>see log file</a>."
		);
    },

    getStatusHtml: function (status) {
        var img = "";
        if (status == 1) img = "setup";
        if (status == 3) img = "wait";
        if (status == 4) img = "finish";

        if (status == 2) {
            img = "notes" + this.substate;
            this.substate = (this.substate == 3) ? 1 : this.substate + 1;
        }

        if (status == 1) txt = "setup";
        if (status == 2) txt = "playing";
        if (status == 3) txt = "wait";
        if (status == 4) txt = "finish";

        return "<img src=resources/icons/status_" + img + ".png align=top> <span style='margin-top: 1em; display: inline-block;'> " + txt + "</span>";
    },


    // go back to previous page
    onPageBack: function () {
        var items,
		mainview,
		current;

        // when go back, stop music
        this.onBtnStop();

        items = Ext.Viewport.getItems();
        mainview = items.get('ext-mainview-1');

        commonFuncs.animateActiveItem(mainview, { type: 'slide', direction: 'right' }, true);
    },

});
