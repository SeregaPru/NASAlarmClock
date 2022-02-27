Ext.define('AlarmClock.view.Main', {
    extend: 'Ext.Panel',
    xtype: 'mainview',

    // flag for mode, when app launced first and should be auto configured
    initializeSettings: false,

    constructor: function () {
        // request data from server
        var allData = this.getAllData();
        //!! TODO if (allData == false) {
        //!! TODO     this.error = "But there is error in package settings. Please run and setup AlarmClock package in DSM first.";
        //!! TODO     return;
        //!! TODO }

        // fill datastores
        this.playListStore = this.createPlayListStore(allData);
        this.deviceStore = this.createDeviceStore(allData);
        this.taskListStore = this.createTaskListStore(allData); // depends of device store

        this.bigScreen = (Ext.Viewport.getWindowWidth() >= 768); // ipad 1 - big screen
        this.wideScreen = (Ext.Viewport.getWindowWidth() >= 384); // iphone 6 - small screen
        console.log("big screen = " + this.bigScreen + " ; wide screen = " + this.wideScreen + " ; width = " + Ext.Viewport.getWindowWidth());

        // create form
        this.wakeupStore = this.createWakeupStore();
        this.detailsForm = this.createDetailsForm();
        this.taskList = this.createTaskList(this.playListStore);

        var content = this.fillConfig();
        this.callParent([content]);

        var me = this;
        Ext.Viewport.on('resize', function() {
            me.onOrientationChange();
        });

        this.loadWarnings();
        this.checkTasksCount();
        this.checkPackageVersion();
        this.error = "";

        // show normal statusbar and disable fullscreen
        try {
            StatusBar.styleDefault();
            StatusBar.backgroundColorByHexString("#f8f9f9");
        } catch (ex) { }
    },

    fillConfig: function() {
        var panelContent = {
            xtype: 'panel',
            layout: 'vbox',
            items: [
                {
                    html: globals.AppTitle,
                    docked: 'top',
                    cls: 'titlebar',
                },

                {
                    xtype: 'titlebar',
                    docked: 'top',
                    items: [
                        {
                            xtype: 'hintbutton',
                            hint: 'Add new alarm',
                            icon: 'resources/icons/add.png',
                            listeners: {
                                tap: function () { this.addRow(); },
                                scope: this,
                            },
                        },
                        {
                            xtype: 'hintbutton',
                            hint: 'Delete selected alarm',
                            icon: 'resources/icons/del.png',
                            listeners: {
                                tap: function () { this.deleteRow(); },
                                scope: this,
                            },
                        },
                        {
                            xtype: 'hintbutton',
                            hint: 'Save all unsaved changes',
                            icon: 'resources/icons/save.png',
                            listeners: {
                                tap: function () { this.Save(); },
                                scope: this,
                            },
                        },
                        {
                            xtype: 'hintbutton',
                            hint: 'Reload saved alarms and forget unsaved changes',
                            icon: 'resources/icons/reset.png',
                            listeners: {
                                tap: function () { this.Reset(); },
                                scope: this,
                            },
                        },
                        {
                            xtype: 'hintbutton',
                            hint: 'Test play selected alarm',
                            icon: 'resources/icons/play.png',
                            listeners: {
                                tap: function () { this.playTask(); },
                                scope: this,
                            },
                        },
                        {
                            xtype: 'hintbutton',
                            hint: 'Settings for account and license information',
                            icon: 'resources/icons/settings.png',
                            listeners: {
                                tap: function () { this.showSettings(); },
                                scope: this,
                            },
                        },
                    ]
                },

				// warning panels
                {
                    html: '',
                    docked: 'top',
                    cls: 'warningbar AddTask',
                    itemId: 'WarningAddTask',
                    hidden: true,
                },
                {
                    html: 'License information ...',
                    docked: 'top',
                    cls: 'warningbar license',
                    itemId: 'WarningLicense',
                    hidden: true,
                },
                {
                    html: '',
                    docked: 'bottom',
                    cls: 'warningbar version',
                    itemId: 'WarningVersion',
                    hidden: true,
                },

				
                {
                    xtype: 'panel',
                    layout: 'hbox',
                    itemId: "mainContainer",
                    flex: 1,
                    items: [
                        this.taskList,
                        {
                            xtype: 'panel',
                            layout: 'card', // card is special for on-the-fly resize
                            flex: 1,
                            scrollable: (Ext.browser.is.IE) ? undefined : false, //!!
                            itemId: "detailsFormContainer",
                            hidden: (this.bigScreen ? false : true),
                            style: 'background:#F0F0F0;',
                        },
                    ]
                },

            ]
        }
        return panelContent;
    },


    // create and fill task list with brief information
    createTaskList: function () {
        root = this;

        Ext.define('MyDataItem', {
            extend: 'Ext.dataview.component.DataItem',
            alias: 'widget.mydataitem',
            config: {
                layout: 'hbox',
                items: [
                {
                    flex: 0,
                    width: 6,
                    itemId: 'dirty',
                    html: '',
                },
                {
                    flex: 1,
                    itemId: 'main',
                    html: '',
                },
                {
                    xtype: 'togglefieldext',
                    flex: 0,
                    width: 70,
                    name : 'on',
                    value: 'on',
                    checked: 'on',
                    itemId: 'on',
                    listeners: {
                        changeAction: function (me, newValue) {
                            if (me.parent) {
                                var record = me.parent._record;
                                record.data.on = newValue.toString(); // should be stored as string with " for compatibility with synology package
                                record.setDirty();
                                // select current row in list and update details form
                                var idx = this.taskList.getStore().indexOf(record);
                                this.taskList.select(idx);
                                this.taskList.refresh();
                                this.onRowClick(record, false, "togglefieldext");
                            }
                        },
                        scope: this,
                    }
                },
                {
                    flex: 0,
                    width: 15,
                    cls: 'scmore',
                    html: '',
                },
                ]
            },
            updateRecord: function(record) {
                var me = this;
                me.down('#dirty').set("cls", record.dirty ? "dirty" : "" );
                me.down('#on').setValue(record.get('on'));

                me.down('#main').setHtml(
                    '<table border=0 cellpadding=0 cellspacing=0 width=100% class=scitem><tr>' +
                    '  <td width=1% nowrap><div class="sctime">' + this.formatTime(record.get('hour')) + ":" + this.formatTime(record.get('minute')) + '</div>' +
                    '    <div class="scdays">' + this.formatSchedule(record.get('schedule')) + '</div> ' +
                    '  </td>' +
                    '  <td width=90%><div class="scplaylist">' + this.formatPlaylist(record.get('playlist')) + '</div>' +
                    '    <div class="scdevice">' + record.get('device') + '</div>' +
                    '  </td>' +
                    '</tr></table>'
                );

                me.callParent(arguments);
            },
            formatTime: function (value) { return (value < 10 ? '0' : '') + value; },
            formatSchedule: function (value) {
                //var days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                var ret = "";
                for (var i = 1; i <= 5; i++) {
                    var day = i % 7;
                    var css = "";
                    if ((" " + value).indexOf(day) > 0)
                        css += "class='sel'";
                    //ret += "<span " + css + ">" + days[day] + "</span>";
                    ret += "<span " + css + "></span>";
                }
                for (var i = 6; i <= 7; i++) {
                    var day = i % 7;
                    var css = "";
                    if ((" " + value).indexOf(day) > 0)
                        css += " sel";
                    //ret += "<span " + css + ">" + days[day] + "</span>";
                    ret += "<span class='wek" + css + "'></span>";
                }
                return ret;
            },
            formatPlaylist: function(value) {
                var item = root.playListStore.getAt(root.playListStore.findExact('id', value));
                return (item == undefined) ? "<i>(unknown playlist)</i>" : item.data.display;
            },
        });

        Ext.define('MyDataView', {
            extend: 'Ext.dataview.DataView',
            config: {
                defaultType: 'mydataitem',
                useComponents: true,
            },
        });

        this.isHolded = false;

        var list = Ext.create('MyDataView', {
            flex: 1,
            store: this.taskListStore,
            cls: 'sclistitem',
            listeners: {
                itemtap: function (view, index, target, record, evt) {
                    //TODO do not show details form if touched toggle-switch
                    if (this.isHolded) return;
                    var showdetails = (evt.target.className.indexOf('x-toggle-inner') <= -1);
                    this.onRowClick(record, showdetails, "itemtap");
                },

                itemtaphold: function (view, index, target, record, evt) {
                    if (this.isHolded) return;

                    var me = this;
                    me.isHolded = true;
                    Ext.ux.menu.Menu.open(
                        target, // the anchor
                        [
                            { text: 'Play',   value: 'Play',   },
                            { text: 'Delete', value: 'Delete', },
                        ],
                        function(value) { // callback (called after the menu is closed)
                            console.log(value);
                            me.isHolded = false;
                            // The value will be 'value1', 'value2', or 'value3'.
                            // If you close the menu by tapping on the mask, it becomes null.
                            if (value == "Play")
                                me.playTask();
                            else
                                if (value == "Delete")
                                    me.deleteRow();
                        }
                    );
                },

                scope: this,
            }
        });

        return list;
    },


    //
    createDetailsForm: function () {
        var detailsForm = new Ext.form.FormPanel(
        {
            name: 'detailsForm',
            cls: 'detailsForm',
            border: false,

            layout: { type: 'vbox', align: 'stretch' },
            scrollable: true,

            // inner panel special for scrolling fields inside form
            // the form itself doesn't allow scrolling
            items: [
            {
                xtype: 'panel',
                flex: (Ext.browser.is.IE) ? 0 : 1,
                layout: (Ext.browser.is.Firefox) ? '' : 'vbox', // TODO. vbox here is not displayed in firefox
                scrollable: (Ext.browser.is.IE) ? undefined :
                {
                    direction: 'vertical',
                    indicators: {
                        y: {
                            autoHide: false
                        }
                    }
                },

                items: [
                    {
                        name: 'id',
                        xtype: 'hiddenfield',
                    },

                    {
                        xtype: "hiddenfield",
                        name: "on",
                    },

                    // days
                    {
                        //!! replace with smth label
                        xtype: 'fieldset',
                        title: 'SCHEDULE',
                        items: [
                        {
                            //!! todo correct css for ie
                            xtype: "daysselect",
                            name: 'schedule',
                            cls: "calendarbuttons",
                            listeners: {
                                change: function () {
                                    this.onApplyDetails("schedule");
                                },
                                scope: this,
                            },
                        },
                        ],
                    },

                    // time
                    {
                        xtype: 'fieldset',
                        title: '',
                        items: [
                        {
                            xtype: 'inlinetimepicker',
                            name: 'time',
                            displayField: 'hour',
                            valueField: 'hour',
                            height: 120,
                            width: "100%",
                            listeners: {
                                change: function () {
                                    this.onApplyDetails("time");
                                },
                                scope: this,
                            },
                        },
                        ],
                    },

                    {
                        xtype: 'fieldset',
                        title: 'PLAY SETTINGS',
                        items: [
                        // playlist
                        {
                            xtype: "selectfieldext",
                            name: "playlist",
                            itemId: "playlist",
                            label: "Playlist",
                            labelText: 'Playlist',
                            labelWidth: 130,
                            store: this.playListStore,
                            displayField: "display",
                            valueField: "id",
                            usePicker: false,
                            listeners: {
                                selected: function () {
                                    this.onApplyDetails("playlist");
                                },
                                scope: this,
                            }
                        },

                        // device
                        {
                            xtype: "selectfieldext",
                            name: "device",
                            itemId: "devicelist",
                            label: "Device",
                            labelText: 'Device',
                            labelWidth: 130,
                            store: this.deviceStore,
                            displayField: "display",
                            valueField: "display",
                            usePicker: false,
                            listeners: {
                                selected: function () {
                                    this.onApplyDetails("device");
                                },
                                scope: this,
                            }
                        },

                        // duration
                        {
                            xtype: "spinnerfield",
                            name: "duration",
                            label: "Play duration" + (this.wideScreen ? " " : "<br>") + "<small>(minutes)</small>",
                            labelText: "Play duration" + (this.wideScreen ? " " : "<br>") + "<small>(minutes)</small>",
                            labelWidth: (this.wideScreen ? 240 : 170),
                            //decimalPrecision: 1,
                            minValue: 0,
                            maxValue: 999,
                            value: 2,
                            stepValue: 1,
                            allowNegative: false,
                            allowDecimals: true,
                            allowBlank: false,
                            enableKeyEvents: true,
                            listeners: {
                                spin: {
                                    buffer: 300,
                                    fn: function (edit) {
                                        var a = edit.getValue();
                                        if (!Ext.isEmpty(a)) { edit.setValue(a) } else { edit.setValue(0) }
                                        this.onApplyDetails("duration");
                                    },
                                    scope: this,
                                }
                            }
                        },

                        // increase volume time
                        {
                            xtype: "spinnerfield",
                            name: "volumetime",
                            label: "Volume increase" + (this.wideScreen ? " " : "<br>") + "time <small>(minutes)</small>",
                            labelText: "Volume increase" + (this.wideScreen ? " " : "<br>") + "time <small>(minutes)</small>",
                            labelWidth: (this.wideScreen ? 240 : 170),
                            //decimalPrecision: 1,
                            minValue: 0,
                            maxValue: 999,
                            value: 1,
                            stepValue : 1,
                            allowNegative: false,
                            allowDecimals: true,
                            allowBlank: false,
                            enableKeyEvents: true,
                            listeners: {
                                spin: {
                                    buffer: 300,
                                    fn: function (edit) {
                                        var a = edit.getValue();
                                        if (!Ext.isEmpty(a)) { edit.setValue(a) } else { edit.setValue(0) }
                                        this.onApplyDetails("volumetime");
                                    },
                                    scope: this,
                                }
                            }
                        },

                        // volume start
						/*
                        {
                            xtype: 'sliderfieldextended',
                            value: 15,
                            minValue: 0,
                            maxValue: 100,
                            increment: 1, //!! was 5
                            name: ["volume1"],
                            label: "Start volume",
                            labelText: "Start volume",
                            labelWidth: 130,
                            listeners: {
                                change: {
                                    fn: function () {
                                        this.onApplyDetails("volume1");
                                    },
                                    scope: this,
                                }
                            }
                        },
						*/
                        {
                            xtype: "spinnerfield",
                            name: "volume1",
                            label: "Start volume",
                            labelText: "Start volume",
                            labelWidth: (this.wideScreen ? 240 : 170),
                            //decimalPrecision: 1,
                            minValue: 0,
                            maxValue: 100,
                            value: 15,
                            stepValue : 1,
                            allowNegative: false,
                            allowDecimals: true,
                            allowBlank: false,
                            enableKeyEvents: true,
                            listeners: {
                                spin: {
                                    buffer: 300,
                                    fn: function (edit) {
                                        var a = edit.getValue();
                                        if (!Ext.isEmpty(a)) { edit.setValue(a) } else { edit.setValue(0) }
                                        this.onApplyDetails("volume1");
                                    },
                                    scope: this,
                                }
                            }
                        },

                        // volume end
						/*
                        {
                            xtype: 'sliderfieldextended',
                            value: 30,
                            minValue: 0,
                            maxValue: 100,
                            increment: 1, //!! was 5
                            name: ["volume2"],
                            label: "End volume",
                            labelText: "End volume",
                            labelWidth: 130,
                            listeners: {
                                change: {
                                    fn: function (me, thumb, newValue, oldValue) {
                                        this.onApplyDetails("volume2");
                                    },
                                    scope: this,
                                }
                            }
                        },
						*/
                        {
                            xtype: "spinnerfield",
                            name: "volume2",
                            label: "End volume",
                            labelText: "End volume",
                            labelWidth: (this.wideScreen ? 240 : 170),
                            //decimalPrecision: 1,
                            minValue: 0,
                            maxValue: 100,
                            value: 15,
                            stepValue : 1,
                            allowNegative: false,
                            allowDecimals: true,
                            allowBlank: false,
                            enableKeyEvents: true,
                            listeners: {
                                spin: {
                                    buffer: 300,
                                    fn: function (edit) {
                                        var a = edit.getValue();
                                        if (!Ext.isEmpty(a)) { edit.setValue(a) } else { edit.setValue(0) }
                                        this.onApplyDetails("volume2");
                                    },
                                    scope: this,
                                }
                            }
                        },

                        // shuffle
                        {
                            xtype: 'togglefieldext',
                            flex: 0,
                            labelWidth: (this.wideScreen ? 240 : 170),
                            label: "Shuffle",
                            labelText: "Shuffle",
                            name : 'shuffle',
                            itemId: 'shuffle',
                            value: 'shuffle',
                            checked: 'shuffle',
                            listeners: {
                                changeAction: function (me, newValue) {
                                    this.onApplyDetails("shuffle");
                                },
                                scope: this,
                            }
                        },

                        // wakeup player
                        {
                            xtype: "selectfieldext",
                            name: "wakeup",
                            label: "Wakeup player",
                            labelText: 'Wakeup player',
                            labelWidth: 140,
                            store: this.wakeupStore,
                            displayField: "display",
                            valueField: "id",
                            usePicker: false,
                            listeners: {
                                selected: function () {
                                    this.onApplyDetails("wakeup");
                                },
                                scope: this,
                            }
                        },
                        ],
                    },
                ],

            }], //!!
        }
        );

        return detailsForm;
    },


    // ...
    createDetailsPage: function () {
        if (this.detailsPage != undefined) return;

        var page = {
            xtype: 'panel',
            layout: 'vbox',
            cls: 'detailspage',
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
                        tap: function() { this.onPageBack(); },
                        scope:this,
                    }
                },
                {
                    xtype: 'spacer',
                },
                {
                    html: globals.AppTitle,
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
                itemId: "detailsPageContainer",
                items: [
                    this.detailsForm,
                ]
            },
            ]
        }; //-- page

        console.log("add details page");
        this.detailsPage = Ext.Viewport.add(page);

        return this.detailsPage;
    },

    // go back to previuos page
    onPageBack: function() {
        var items,
        mainview,
        current;

        items = Ext.Viewport.getItems();
        mainview = items.get('ext-mainview-1');

        commonFuncs.animateActiveItem(mainview, { type: 'slide', direction: 'right' }, true);
    },

    copyObject: function(obj) {
        return (JSON.parse(JSON.stringify(obj)));
    },

    // tasklist row (task) click handler
    // populates details form with values and makes it enabled for edit
    onRowClick: function (record, showDetails, source) {
        console.log("onRowClick " + source);
        if (record == undefined) return;

        // set time
        var time = [record.data.hour, record.data.minute];
        record.data.time = time;

        // show details page ...
        this.detailsForm.show();

        var me = this;
        if (this.bigScreen)
        {
            // for big screen - update right side
            var pnl = Ext.ComponentQuery.query("#detailsFormContainer")[0];
            if (pnl.items.length == 0)
                pnl.add(me.detailsForm);
            me.detailsForm.setRecord(record);
        }
        else
            if (showDetails) {
                this.createDetailsPage();

                // for small screen show details page fullscreen
                commonFuncs.animateActiveItem(me.detailsPage, { type: 'slide', direction: 'left' }, false, 0,
					function() {
						// update details page
						me.detailsForm.setRecord(record);
                    }
                );
            }
    },

    getSelectedRecord: function() {
        return this.taskList.getSelection()[0];
    },

    // apply changed details to grid
    onApplyDetails: function (source) {
        console.log("onApplyDetails " + source);

        var record = this.getSelectedRecord();
        if (record == undefined) return;

        var formValues = this.detailsForm.getValues();

        // parse time array to hour and minute fields
        var time = formValues.time;
        if (time) {
            formValues.hour = time[0].toString();    // should be stored as string with " for compatibility with synology package
            formValues.minute = time[1].toString();  // should be stored as string with " for compatibility with synology package
            delete (formValues.time);
        }

        // translate toggle field value from int to string
        formValues.shuffle = formValues.shuffle.toString(); // should be stored as string with " for compatibility with synology package


        if (formValues.volume1 instanceof Array) formValues.volume1 = formValues.volume1[0];
        if (formValues.volume2 instanceof Array) formValues.volume2 = formValues.volume2[0];

        record.beginEdit();
        record.setData(formValues);
        record.endEdit();
        record.commit();
        record.setDirty();

        this.taskList.refresh();
    },


    // requst for all necessary data from server
    getAllData: function() {
        var data;
        Ext.Ajax.request({
            url: globalVars.baseURL + "?action=get_allinone",
            method : 'GET',
            async: false,
            useDefaultXhrHeader: false,
            success: function(response) {
                data = Ext.util.JSON.decode(response.responseText);
                if (data.status != "OK")
                    data = false;
            },
            failure: function (response) {
                Ext.Msg.alert('Error receiving data', response.responseText);
            }
        });
        return data;
    },

    // fill device list store
    createDeviceStore: function (allData) {
        var store = new Ext.data.SimpleStore({
            fields: ["display"],
            idProperty: "display",
        });

        if (allData != false) {
            var players = [];
            players.push(["(not selected)"]);
            allData.data.players.forEach(function(player) {
                players.push({"display": player.name});
            });
            store.add(players);
        }

        return store;
    },

    // fill Playlist store
    createPlayListStore: function (allData) {
        var store = new Ext.data.SimpleStore({
            fields: ["id", "display"]
        });

        if (allData != false) {
            var playlists = [];
            playlists.push([-1, "(not selected)"]);
            allData.data.playlists.forEach(function(playlist) {
                playlists.push([playlist.id, playlist.name]);
            });
            store.add(playlists);
        }

        return store;
    },

    // fill tasks store
    createTaskListStore: function (allData) {
        var store = new Ext.data.SimpleStore
        ({
            fields: ["id", "on", "schedule", "hour", "minute", "device", "playlist", "duration", "volume1", "volume2", "volumetime", "shuffle", "wakeup"],
            idProperty: "id",

            /*
            data: [
                { id: "1C8FB3EA-C960-4723-B10A-1D19E853DF11", on: "1", schedule: "1,2,3", hour: "6", minute: "14", device: "RX-V 671", playlist: "Beatles - Abbey Road", duration: "2", volume1: "20", volume2: "50", volumetime: "1" },
                { id: "1C8FB3EA-C960-4723-B10A-1D19E853DF12", on: "0", schedule: "0", hour: "9", minute: "24", device: "RX-V 671", playlist: "Beatles - Abbey Road", duration: "4", volume1: "30", volume2: "60", volumetime: "2" },
                { id: "1C8FB3EA-C960-4723-B10A-1D19E853DF13", on: "1", schedule: "0,6", hour: "14", minute: "34", device: "RX-V 671", playlist: "Beatles - Abbey Road", duration: "6", volume1: "40", volume2: "70", volumetime: "3" },
                { id: "1C8FB3EA-C960-4723-B10A-1D19E853DF14", on: "0", schedule: "0,1,2,3,4,5,6", hour: "16", minute: "44", device: "RX-V 671", playlist: "Beatles - Abbey Road", duration: "8", volume1: "50", volume2: "80", volumetime: "4" },
            ]
            */
        });

        if (allData != false) {
            var tasks = [];
            var me = this;
            allData.data.tasks.forEach(function(task) {
                if (task.wakeup == undefined) {
                    console.log("task.wakeup == undefined");
                    task.wakeup = "no";
                }

                tasks.push(task);
                // add additional players to players list
                // for temporarily not presented players but used in tasks
                if (me.deviceStore.find("display", task.device) < 0)
                    me.deviceStore.add({"display": task.device});
            });
            store.add(tasks);
        }

        return store;
    },

    // fill wakeup supported players
    createWakeupStore: function (allData) {
        var store = new Ext.data.SimpleStore({
            fields: ["id", "display"]
        });
        var wakeups = [];
        wakeups.push(["no", "No"]);
        wakeups.push(["wait", "Play & wait"]);
        wakeups.push(["yamaha", "Yamaha receiver"]);
        store.add(wakeups);
        return store;
    },


    // generate new guid
    generateGUID: function() {
        var guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,
            function(c) {
                var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
                return v.toString(16);
            }).toUpperCase();
        return guid;
    },


    // add new row to list
    addRow: function() {
        console.log("add row");

        var data = {
            id: this.generateGUID(),
            on: "1",
            schedule: "0,1,2,3,4,5,6",
            hour: "7",
            minute: "0",
            device: "(not selected)",
            playlist: "(not selected)",
            duration: "1",
            volume1: "10",
            volume2: "25",
            volumetime: "1",
            shuffle: "0",
            wakeup: "no",
        };

        var store = this.taskList.getStore();
        store.add(data);

        var rowIdx = store.data.length - 1;
        var record = store.getAt(rowIdx);
        record.setDirty();
        this.taskList.refresh();

        // select new added row
        this.taskList.select(rowIdx);

        // update details form
        this.onRowClick(record, false, "addRow");
        this.checkTasksCount();
    },


    // delete current selected row
    deleteRow: function() {
        console.log("delete row");

        var record = this.taskList.getSelection()[0];
        if (record == undefined) return;

        var store = this.taskList.getStore();
        store.remove([record]);
        this.taskList.refresh();

        if (store.data.length > 0) {
            // select prev row
            var rowIdx = store.data.length - 1;
            var record = store.getAt(rowIdx);
            this.taskList.select(rowIdx);

            // update details form
            this.onRowClick(record, false, "deleteRow");
        } else {
            this.detailsForm.hide();
        }
        this.checkTasksCount();
    },

    checkTasksCount: function() {
        var store = this.taskList.getStore();
        if (store.data.length > 0) {
            this.showWarning("", "#WarningAddTask");
        } else {
            this.showWarning("You have no alarms added.<br>Add and setup your new alarm here", "#WarningAddTask");
        }
    },

    // save all changes
    Save: function() {
        console.log("save");

        var me = this;
        me.setMasked({
            xtype: 'loadmask',
            message: 'Saving ...'
        });

        Ext.Ajax.request({
            method: 'POST',
            url: globalVars.baseURL,
            jsonData: {
                action: 'save_tasks',
                data: this.getDataForSave()
            },
            headers: {
                "Content-Type": "text/plain" // trick to disable OPTIONS request
            },
            useDefaultXhrHeader: false,
            success: function(response, options){
                this.setMasked(false);
                //console.log(response.statusText + ": " + response.responseText);
                var jsonResponse = Ext.JSON.decode(response.responseText);
                if (jsonResponse.status == 'ERROR')
                {
                    if (jsonResponse.data == '-1')
                        Ext.Msg.alert('Error saving tasks', "Login error. See details in log file");
                    else
                        Ext.Msg.alert('Error saving tasks', jsonResponse.data + "<br>See details in log file");
                }
                else
                {
                    // if success save, clear dirty marks
                    this.taskListStore.each(function(record) { record.dirty = false; });
                    this.taskList.refresh();
                }
            },
            failure: function(response, options){
                this.setMasked(false);
                console.log(response.statusText + ": " + response.responseText);
                Ext.Msg.alert('Error saving tasks', response.responseText);
            },
            scope: this
        });
    },

    getDataForSave: function() {
        var ret = [],
            i, ln, item,
            array = this.taskListStore.data.items;

        for (i = 0, ln = array.length; i < ln; i++) {
            item = array[i]['data'];
            delete item.time;
            ret.push(item);
        }

        console.log(ret);
        return ret;
    },

    // reset task list
    Reset: function() {
        console.log("reset");

        var me = this;
        me.setMasked({
            xtype: 'loadmask',
            message: 'Loading ...'
        });

        Ext.defer(function () {
            var allData = me.getAllData();

            //!! TODO
            me.playListStore = me.createPlayListStore(allData);
            var playlist = Ext.ComponentQuery.query("#playlist")[0];
            ///console.log(playlist);
            playlist.setStore(me.playListStore);

            me.deviceStore = me.createDeviceStore(allData);
            var devicelist = Ext.ComponentQuery.query("#devicelist")[0];
            ///console.log(devicelist);
            devicelist.setStore(me.deviceStore);

            me.taskListStore = me.createTaskListStore(allData);
            me.taskList.setStore(me.taskListStore);
            me.taskList.refresh();
            me.checkTasksCount();

            me.setMasked(false);
        }, 100);
    },

    // reposition details panel when orientation changes
    onOrientationChange: function() {
        var me = this;
        var newBigScreen = (Ext.Viewport.getWindowWidth() >= 768);
        if (newBigScreen == me.bigScreen) return;

        me.bigScreen = newBigScreen;

        console.log("big screen = " + this.bigScreen + " ; wide screen = " + this.wideScreen + " ; width = " + Ext.Viewport.getWindowWidth());
        console.log(Ext.Viewport);

        me.createDetailsPage();
        var detailsPanel = Ext.ComponentQuery.query("#detailsFormContainer")[0];
        var detailsPage = Ext.ComponentQuery.query("#detailsPageContainer")[0];

        // hide / show details panel for small/large screen
        if (me.bigScreen) {
            // detach details form from details page
            if (detailsPage.items.length > 0)
                detailsPage.remove(me.detailsForm, false);
            detailsPanel.doSetHidden(false); // show
            // attach it to details panel if there is selected item in task list
            var record = this.getSelectedRecord();
            if (record != undefined) {
                detailsPanel.add(me.detailsForm);
                this.onPageBack();
            }
        }
        else {
            // detach details form from details panel
            if (detailsPanel.items.length > 0)
                detailsPanel.remove(me.detailsForm, false);
            detailsPanel.doSetHidden(true); // hide
            // and attach it to details page
            detailsPage.add(me.detailsForm);
        }
    },


    // --------------------------------------------------------

    // open SETTING window
    showSettings: function() {
        var settingsView = new AlarmClock.view.Settings();
        settingsView = Ext.Viewport.add(settingsView)
        commonFuncs.animateActiveItem(settingsView);
    },

    // open PLAY window for selected task
    playTask: function() {
        if (this.playPage == undefined) {
            this.playPage = new AlarmClock.view.Play();
        }

        var record = this.getSelectedRecord();

        if (record == undefined) {
            Ext.Msg.alert('Error launch play', "Select task to play");
            return;
        }
        if (record.dirty) {
            Ext.Msg.alert('Error launch play', "Save task before play");
            return;
        }

        this.playPage = Ext.Viewport.add(this.playPage);
        commonFuncs.animateActiveItem(this.playPage);
        this.playPage.play(record);
    },


    // --------------------------------------------------------
    // license information

    loadWarnings: function() {
        console.log("check account & license information");

        Ext.Ajax.request({
            url: globalVars.baseURL + "?action=get_account",
            method: 'GET',
            async: true,
            headers: { "Content-Type": "text/plain" }, // trick to disable OPTIONS request
            useDefaultXhrHeader: false,                // trick to disable OPTIONS request
            success: function(response, options){
                var account_data = Ext.util.JSON.decode(response.responseText);
                this.parseAccountData(account_data, false);
            },
            failure: function(response, options){
                console.log(response.statusText + ": " + response.responseText);
            },
            scope: this
        });
    },

    parseAccountData: function(account_data, showOnly) {
        try {
            if (account_data.status == 'OK') {
                // account errors
                if (account_data.data.login_failed == -2) {
                    this.showWarning(account_data.data.login_error + "<br><br>Check additional AlarmClock account settings here", "#WarningLicense");
                    return;
                } else

                    if ((account_data.data.login_failed == -1) || (account_data.data.login_failed == -4)) {
                        this.showWarning("Invalid account settings.<br>Setup AlarmClock account and license here", "#WarningLicense");

                        if (showOnly) return;

                        // special processing for empty login.
                        // preset if with account information from login window
                        if ((account_data.data.login_failed == -4) && (globalVars.login != "")) {
                            console.log("special processing for empty login");
                            var newAccData = {"login": globalVars.login, "password": globalVars.password, "license": account_data.data.license};
                            this.saveInitialAccount(newAccData);
                        } else {
                            // open settings page
                            this.showSettings();
                        }
                        return;
                    }

                // license errors
                var license_details = account_data.data.license_details;
                console.log(license_details);
                var msg = "";

                if (license_details == 0) {
                    msg = "License not found. Restrictions on playing time - 10 seconds.";
                    msg += "<br>Open \"Settings\" to manage your licenses.";

                    // if we in mode initializing settings, then obtain and save trial license from site
                    if (this.initializeSettings) {
                        var serial = account_data.data.dsid;
                        this.saveInitialLicense(serial);
                    }
                } else
                    if (license_details == -2) {
                        msg = "30-day trial license is expired. Restrictions on playing time - 10 seconds.";
                        msg += "<br>Open \"Settings\" to manage your licenses.";
                    } else
                        if (license_details == -3) {
                            msg = "Invalid license. Restrictions on playing time - 10 seconds.";
                            msg += "<br>Open \"Settings\" to manage your licenses.";
                        } else
                            if (license_details == 2) {
                                msg = "30-day trial license.";
                            }

                this.showWarning(msg, "#WarningLicense");
            }
            //this.doLayout();
        } catch (ex) { 
            console.log(ex.message);
        }
    },

    showWarning: function(message, elementId) {
        var WarningBar = Ext.ComponentQuery.query(elementId)[0];
        if (message != "") {
            WarningBar.setHtml(message);
            WarningBar.doSetHidden(false);
        } else {
            WarningBar.setHtml("");
            WarningBar.doSetHidden(true);
        }
    },

    // for first run, when account login is emply,
    // save predifined account settings
    // received from login window
    saveInitialAccount: function(data) {
        console.log("save initial account data");
        this.initializeSettings = true;

        var me = this;
        me.setMasked({
            xtype: 'loadmask',
            message: 'Prepare initial account data ...'
        });

        Ext.Ajax.request({
            method: 'POST',
            url: globalVars.baseURL,
            jsonData: {
                action: 'set_account',
                data: data
            },
            headers: {
                "Content-Type": "text/plain" // trick to disable OPTIONS request
            },
            useDefaultXhrHeader: false,
            success: function(response, options){
                //console.log(response.statusText + ": " + response.responseText);
                var jsonResponse = Ext.JSON.decode(response.responseText);
                if (jsonResponse.status == 'ERROR')
                {
                    this.setMasked(false);
                    Ext.Msg.alert('Error saving account', jsonResponse.data + "<br>See details in log file");
                }
                else
                {
                    this.setMasked(false);
                    console.log("initial account data are saved");

                    // update local license info
                    this.loadWarnings();
                    this.Reset();
                }
            },
            failure: function(response, options){
                this.setMasked(false);

                Ext.Msg.alert('Error saving account', response.responseText);
            },
            scope: this
        });
    },

    // for first run, when license is emply,
    // get trial license from NasAlarmClock server ans save it to settings
    saveInitialLicense: function(serial) {
        console.log("save initial license");

        Ext.Ajax.request({
            url: "http://www.nasalarmclock.com/api/gettrial.php?serial=" + serial,
            method: 'GET',
            async: true,
            headers: { "Content-Type": "text/plain" }, // trick to disable OPTIONS request
            useDefaultXhrHeader: false,                // trick to disable OPTIONS request
            success: function(response, options) {
                var errmsg = "";
                try {
                    var lic_data = Ext.util.JSON.decode(response.responseText);
                    if (lic_data.code == 0) {
                        var license = lic_data.data;

                        var newAccData = {"login": globalVars.login, "password": globalVars.password, "license": license};
                        this.saveInitialAccount(newAccData);

                        return;
                    } else {
                        errmsg = lic_data.error
                    }
                } catch (ex) {
                    errmsg = ex.message;
                }
                console.log("Can't obtain trial license from server: " + errmsg);
                //Ext.Msg.alert("Can't obtain trial license from server: " + errmsg + addmgs);
            },
            failure: function(response, options){
                console.log(response);
                //Ext.Msg.alert("Can't obtain trial license from server: " + response.statusText + ": " + response.responseText + addmgs);
            },
            scope: this
        });
    },


    // --------------------------------------------------------
    // check package version on NAS and latest available in nasalarmclock site
    checkPackageVersion: function() {
        console.log("save initial license");

        Ext.Ajax.request({
            url: "http://www.nasalarmclock.com/api/checkversion.php?nas=" + globals.nasType,
            method: 'GET',
            async: true,
            headers: { "Content-Type": "text/plain" }, // trick to disable OPTIONS request
            useDefaultXhrHeader: false,                // trick to disable OPTIONS request
            success: function(response, options) {
                var errmsg = "";
                try {
                    var ver_data = Ext.util.JSON.decode(response.responseText);
                    if (ver_data.nas == globals.nasType) {
                        var version = ver_data.version;
                        console.log("Current NAS package version = " + globalVars.currentPackageVersion + ". Latest available package version = " + version);

                        if (globalVars.currentPackageVersion < version) {
                            msg = 'New package version is available. <a target="_system" href="http://www.nasalarmclock.com/downloads/' + globals.nasType + '/">Download</a>';
                            this.showWarning(msg, "#WarningVersion");
                        }
                    }
                } catch (ex) { }
            },
            failure: function(response, options) { },
            scope: this
        });

    },

});
