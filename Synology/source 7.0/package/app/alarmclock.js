Ext.define("Parfenov.AlarmClock.Application", {
    extend: "SYNO.SDS.AppInstance",
    appWindowName: "Parfenov.AlarmClock.MainWindow"
});

Ext.define("Parfenov.AlarmClock.MainWindow", {
    extend: "SYNO.SDS.AppWindow",

    constructor: function(a) {
        var b = this;

        this.baseURL = this.jsConfig.jsBaseURL;
		this.accountPanel = this.createAccountPanel(this);
		this.trialPanel = this.createTrialPanel(this);
        this.tbar = this.initToolBar();

        this.deviceStore = this.createDeviceStore();
        this.playListStore = this.createPlaylistStore();

        this.detailsForm = this.createDetailsForm();
        this.taskList = this.createTaskList();

        b.callParent([b.fillConfig(a)]);
		this.detailsForm.disable();
		this.loadWarnings();
    },

    fillConfig: function(a) {
        var b = {
           minWidth: 900, minHeight: 450,
            width: 900, height: 450,
			padding: 0,
			margin: 0,
            layout: { type: 'vbox', align: 'stretch'  },
            items: [
				this.accountPanel,
				this.trialPanel,
                this.taskList,
                this.detailsForm
            ]
        };
        Ext.apply(b, a);
        return b;
    },

	createTrialPanel: function(wnd) {
        var panel = new Ext.Panel(
		{
            name: 'trialPanel',
            id: 'trialPanel',
			hidden: true,
			border: false,
			items: [ {
				xtype: "syno_panel",
				id: 'trialPanelInternal',
				html: " ",
			} ]
		}
		);
		return panel;
	},

	createAccountPanel: function(wnd) {
        var panel = new Ext.Panel(
		{
            name: 'accountPanel',
            id: 'accountPanel',
			hidden: true,
			border: false,
			items: [ {
				id: 'accountPanelInternal',
				xtype: "syno_panel",
				html: _TT("Parfenov.AlarmClock.Application", "common", "login_error") +
					  " >> <a href='http://www.nasalarmclock.com/synologydescription/account_tips/' target=_new>" +
					  _TT("Parfenov.AlarmClock.Application", "common", "account_setup") +
					  "</a>",
			} ]
		}
		);
		return panel;
	},

	showLicError: function(message) {
		this.trialPanel.items.items[0].update(message + ". " + _TT("Parfenov.AlarmClock.Application", "common", "open_settings") );
		this.trialPanel.show();
	},

	loadWarnings: function() {
        Ext.Ajax.request({
			url: this.baseURL + "/cgi/api.cgi?action=check_auth",
			method: 'GET',
			success: function(response, options){
				var jsonResponse = Ext.util.JSON.decode(response.responseText);
				if ((jsonResponse.status == 'ERROR') && (jsonResponse.data == -1))
					this.accountPanel.show();
				else
				{
					if (this.accountPanel.hidden == false) {
						this.accountPanel.hide();
						this.refreshStores();
					}
				}

				if (jsonResponse.status == 'OK') {
					if (jsonResponse.data == 0) {
						this.showLicError(
							_TT("Parfenov.AlarmClock.Application", "common", "license_not_found") +	". " +
							_TT("Parfenov.AlarmClock.Application", "common", "license_playback_limit"));
					} else
					if (jsonResponse.data == -2) {
						this.showLicError(
							_TT("Parfenov.AlarmClock.Application", "common", "trial_expired") + ". " +
							_TT("Parfenov.AlarmClock.Application", "common", "license_playback_limit"));
					} else
					if (jsonResponse.data == -3) {
						this.showLicError(
							_TT("Parfenov.AlarmClock.Application", "common", "license_invalid") + ". " +
							_TT("Parfenov.AlarmClock.Application", "common", "license_playback_limit"));
					} else
					if (jsonResponse.data == 2) {
						this.showLicError(
							_TT("Parfenov.AlarmClock.Application", "common", "license_trial")
						);
					} else
						this.trialPanel.hide();
				}
				this.doLayout();
			},
			failure: function(response, options){
				console.log(response.statusText + ": " + response.responseText);
				(new SYNO.SDS.MessageBoxV5({})).showMsg({title: ' ', msg: response.responseText,
					buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.WARNING});
			},
			scope: this
        });
	},

	refreshStores: function() {
		console.log("refresh all after enter correct account");

        this.playListStore = this.createPlaylistStore();
		this.detailsplaylist.bindStore(this.playListStore, true);

        this.deviceStore = this.createDeviceStore();
		this.devicelist.bindStore(this.deviceStore, true);

        this.taskList.store.load();
	},


    createDetailsForm: function() {
		var wnd = this;

		this.detailsplaylist = new SYNO.ux.ComboBox(
		{
			name: "playlist",
			xtype: "syno_combobox",
			store: wnd.playListStore,
			fieldLabel: _T("mediaservice", "class_music_playlist"),
			displayField: "display",
			valueField: "id",
			width: 315,
			listeners: {
				select: {
					fn: function() {
						wnd.onApply();
					},
				}
			}
		} );

		this.devicelist = new SYNO.ux.ComboBox(
		{
			name: "device",
			xtype: "syno_combobox",
			store: wnd.deviceStore,
			fieldLabel: _T("mediaservice", "device"),
			displayField: "display",
			valueField: "display",
			width: 315,
			listeners: {
				select: {
					fn: function() {
						wnd.onApply();
					},
				}
			}
		} );

        var detailsForm = new Ext.form.FormPanel(
        {
            name: 'detailsForm',
			border: false,
            height: 245,
            layout: { type: 'vbox', align: 'stretch'  },
            items: [
			{
				xtype: "syno_panel",
				layout: { type: 'hbox', align: 'begin' },
				height: 15,
				items: [
				{
					xtype: "syno_panel",
					style: 'margin-left: 20px; width: 0; height: 0; border-left: 20px solid transparent; border-right: 20px solid transparent; border-bottom: 15px solid rgb(230, 245, 255);',
				}
				]
			},

			{
				xtype: "syno_panel",
				layout: { type: 'hbox', align: 'begin' },
				style: 'background-color: rgb(230, 245, 255);',
				items: [
                {
                    xtype: "syno_fieldset",
                    title: " ",
                    width: 10
                },

                // schedule settings
                {
                    xtype: "syno_fieldset",
                    title: _T("time", "time_time"),
                    labelWidth: 80,
                    items: [
					{
						name: "schedule",
						xtype: "syno_schedulefield2",
						fieldLabel: _T("time", "time_day"),
						allowBlank: false,
						editable: false,
						width: 155,
						onItemClick2: function() {
							wnd.onApply();
						},
					},
					{
						xtype: "syno_compositefield",
						fieldLabel: _T("schedule", "schedule_time"),
						items: [
						{
							xtype: "syno_combobox",
							store: this.createTimeItemStore(24, 1),
							name: "hour",
							displayField: "display",
							valueField: "value",
							width: 70,
							listeners: {
								select: {
									fn: function() {
										wnd.onApply();
									},
								}
							}
						},
						{
							xtype: "syno_displayfield",
							value: ":"
						},
						{
							xtype: "syno_combobox",
							store: this.createTimeItemStore(60, 1),
							name: "minute",
							displayField: "display",
							valueField: "value",
							width: 70,
							listeners: {
								select: {
									fn: function() {
										wnd.onApply();
									},
								}
							}
						}
						]
					},
					{
						xtype: "syno_textfield",
						name: "id",
						width: 10,
						hidden: true
					},
					{
						xtype: "syno_textfield",
						name: "on",
						width: 10,
						hidden: true
					},
                    ]
                },

                {
                    xtype: "syno_fieldset",
                    title: " ",
                    width: 50
                },

                // panel play settings
                {
                    xtype: "syno_fieldset",
                    title: _T("common", "common_settings"),
                    labelWidth: 180,
					flex: 1,
                    items: [
					this.detailsplaylist,
					this.devicelist,
					// play duration
					{
						xtype: "syno_compositefield",
						layout: 'hbox',
						fieldLabel: _TT("Parfenov.AlarmClock.Application", "common", "Play_duration"),
						items: [
						{
							name: "duration",
							xtype: "syno_numberfield",
							width: 70,
							decimalPrecision: 1,
							minValue: 0,
							maxValue: 65535,
							allowNegative: false,
							allowDecimals: true,
							allowBlank: false,
							enableKeyEvents: true,
							listeners: {
								keyup: {
									buffer: 300,
									fn: function(edit) {
										var a = edit.getRawValue();
										if (!Ext.isEmpty(a)) { edit.setValue(a) } else { edit.setValue(0) }
										wnd.onApply();
									},
								}
							}
						},
						{
							xtype: "syno_displayfield",
							value: _T("status", "status_minute")
						}
						]
					},
					// volumes
					{
						xtype: "syno_compositefield",
						layout: 'hbox',
						fieldLabel: _TT("Parfenov.AlarmClock.Application", "common", "Increase_volume"),
						items: [
						{
							name: "volumetime",
							xtype: "syno_numberfield",
							width: 70,
							decimalPrecision: 1,
							minValue: 0,
							maxValue: 65535,
							allowNegative: false,
							allowDecimals: true,
							allowBlank: false,
							enableKeyEvents: true,
							listeners: {
								keyup: {
									buffer: 300,
									fn: function(edit) {
										var a = edit.getRawValue();
										if (!Ext.isEmpty(a)) { edit.setValue(a) } else { edit.setValue(0) }
										wnd.onApply();
									},
								}
							}
						},
						{
							xtype: "syno_displayfield",
							value: _T("status", "status_minute")
						},
						{
							xtype: "syno_displayfield",
							value: "",
							width: 20
						},
						{
							xtype: "syno_displayfield",
							value: _TT("Parfenov.AlarmClock.Application", "common", "from")
						},
						{
							name: "volume1",
							xtype: "syno_combobox",
							store: this.createTimeItemStore(101, 5),
							displayField: "display",
							valueField: "value",
							width: 70,
							listeners: {
								select: {
									fn: function() {
										wnd.onApply();
									},
								}
							}
						},
						{
							xtype: "syno_displayfield",
							value: _TT("Parfenov.AlarmClock.Application", "common", "to")
						},
						{
							name: "volume2",
							xtype: "syno_combobox",
							store: this.createTimeItemStore(101, 5),
							displayField: "display",
							valueField: "value",
							width: 70,
							listeners: {
								select: {
									fn: function() {
										wnd.onApply();
									},
								}
							}
						},
						{
							xtype: "syno_displayfield",
							value: "%"
						}
						]
					},
					// shuffle
					{
						xtype: "syno_compositefield",
						layout: 'hbox',
						fieldLabel: "",
						items: [
						{
							name: "shuffle",
							xtype: "syno_checkbox",
							boxLabel: _TT("Parfenov.AlarmClock.Application", "common", "shuffle"),
							listeners: {
								check: {
									fn: function() {
										wnd.onApply();
									},
								}
							},
						}
						]
					},
					// player wakeup
					{
						xtype: "syno_combobox",
						store: this.createPlayerWakeupStore(),
						name: "wakeup",
						fieldLabel: _TT("Parfenov.AlarmClock.Application", "common", "playerwakeup"),
						displayField: "display",
						valueField: "value",
						width: 315,
						listeners: {
							select: {
								fn: function() {
									wnd.onApply();
								},
							}
						}
					},

                    ]
                }
				]
			}
			]
        });

        return detailsForm;
    },

    // fill store for wakeup
    createPlayerWakeupStore: function() {
        var wakeups = [];
        wakeups.push(["no", "No"]);
        wakeups.push(["wait", "Play & wait"]);
        wakeups.push(["yamaha", "Yamaha receiver"]);
        var b = new Ext.data.SimpleStore({
            id: 0,
            fields: ["value", "display"],
            data: wakeups,
        });
        return b;
    },

    // fill store for numeric fields
    createTimeItemStore: function(max, step) {
        var a = [];
        for (var d = 0; d < max; d += step) {
            a.push([d, String.leftPad(String(d), 2, "0")])
        }
        var b = new Ext.data.SimpleStore({
            id: 0,
            fields: ["value", "display"],
            data: a
        });
        return b;
    },

    // fill device list store
    createDeviceStore: function() {
        var store = new Ext.data.SimpleStore({
            fields: ["display"]
        });
        Ext.Ajax.request({
			url: this.baseURL + "/cgi/api.cgi?action=get_devices",
			method : 'GET',
			async: false,
            success: function(response){
                var obj = Ext.util.JSON.decode(response.responseText);
				if (obj.status != 'OK') {
					console.log('error loading devices');
					return;
				}
                var players = [];
                obj.data.players.forEach(function(player) {
                    players.push([player.name]);
                });
                store.loadData(players, false);
            }
        });
        return store;
    },

    // fill Playlist store
    createPlaylistStore: function() {
        var store = new Ext.data.SimpleStore({
            fields: ["id", "display"]
        });

        Ext.Ajax.request({
			url: this.baseURL + "/cgi/api.cgi?action=get_playlists",
			method : 'GET',
			async: false,
            success: function(response){
                var obj = Ext.util.JSON.decode(response.responseText);
				if (obj.status != 'OK') {
					console.log('error loading playlists');
					return;
				}
                var playlists = [];
                obj.data.playlists.forEach(function(playlist) {
                    playlists.push([playlist.id, playlist.name]);
                });
                store.loadData(playlists, false);
            }
        });
        return store;
    },

    initToolBar: function() {
        this.buttonTaskCreate = new SYNO.ux.Button({
            itemId: "btnTaskCreate",
            text: _T("common", "create"),
            scope: this,
            handler: function() { this.onTaskCreate(); }
        });
        this.buttonTaskDelete = new SYNO.ux.Button({
            itemId: "btnTaskDelete",
            text: _T("common", "delete"),
            scope: this,
            handler: function() { this.onTaskDelete(); }
        });
        this.buttonSave = new SYNO.ux.Button({
            itemId: "btnSave",
            text: _T("common", "save"),
            scope: this,
            handler: function() { this.onSave(); }
        });
        this.buttonReset = new SYNO.ux.Button({
            itemId: "btnReset",
            text: _T("common", "reset"),
            scope: this,
            handler: function() { this.onReset(); }
        });
        this.buttonTest = new SYNO.ux.Button({
            itemId: "btnTest",
            text: _T("common", "run"),
			btnStyle: "green",
            scope: this,
			style: "margin-left: 10px;",
            handler: function() { this.onTest(); }
        });
        this.buttonSettings = new SYNO.ux.Button({
            itemId: "btnSettings",
            text: _T("common", "common_settings"),
            scope: this,
            handler: function() { this.onSettings(); }
        });
        var tb = new Ext.Toolbar({
			style: "padding-left: 25px;",
		});
        tb.add(this.buttonTaskCreate, this.buttonTaskDelete, this.buttonSave, this.buttonReset, this.buttonTest, '->', this.buttonSettings);
        return tb;
    },

    createTaskList: function() {
		var wnd = this;
        var columnModel = new Ext.grid.ColumnModel({
            columns: [
				{
					header: "",
                    name: "on",
                    dataIndex: "on",
					fixed: true,
					width: 45,
                    menuDisabled: true,
                    sortable: false,
					align: "right",
                    xtype: 'templatecolumn',
                    tpl: new Ext.Template('{on:this.formatOn}',
                        {
                            formatOn: function(value) {
								return String.format('<div class="syno-ux-grid-enable-column-{0}">&nbsp;</div>', ((value == "1") ? "checked" : "unchecked"));
							},
                        } ),
				},
                {
                    header: _T("common", "schedule"),
                    name: "schedule",
                    dataIndex: "schedule",
                    xtype: 'templatecolumn',
                    tpl: new Ext.Template('{hour:this.formatTime}:{minute:this.formatTime} {schedule:this.formatSchedule}',
                        {
                            formatTime: function(value) { return (value < 10 ? '0' : '') + value; },
                            formatSchedule: function(value) {
                                var f = new SYNO.ux.ScheduleField();
                                f.setValue(value);
                                return f.getRawValue();
                            }
                        } ),
                    menuDisabled: true,
                    sortable: true,
                    align: "left"
                },
                {
                    header: _T("mediaservice", "device"),
                    name: "device",
                    dataIndex: "device",
                    menuDisabled: true,
                    sortable: true,
                    align: "left"
                },
                {
                    header: _T("mediaservice", "class_music_playlist"),
                    name: "playlist",
                    dataIndex: "playlist",
                    xtype: 'templatecolumn',
                    tpl: new Ext.Template('{playlist:this.formatPlaylist}',
                        {
                            formatPlaylist: function(value) {
                                var item = wnd.playListStore.getAt(wnd.playListStore.findExact('id', value));
                                return (item == undefined) ? value : item.data.display;
                            },
                        }),
                    menuDisabled: true,
                    sortable: true,
                    align: "left"
                }
            ]
        });

        var taskListStore = new Ext.data.JsonStore({
			url: this.baseURL + "/cgi/api.cgi?action=get_tasks",
			method : 'GET',
            autoLoad: true,
            fields: ["id", "on", "schedule", "hour", "minute", "device", "playlist", "duration", "volume1", "volume2", "volumetime", "shuffle", "wakeup"],
            idProperty: "id",
            root: "data",
            listeners: {
				scope: this,
				'load': function() {
					// convert from old format
					// if field "on" was not set at all, then set it by default = true
					var changed = false;
					this.taskList.store.data.items.forEach(function(item, i, arr) {
						if ((item.data.on !== "0") && (item.data.on !== "1")) {
							item.data.on = "1";
							changed = true;
						}
					});
					if (changed)
						this.taskList.getView().refresh();
				},
                exception: function(ex) {
                    console.log('Error: ');
                    console.log(ex);
                }
            }
        });

        var grid = new SYNO.ux.GridPanel({
            store: taskListStore,
            colModel: columnModel,
            autoSizeColumns: true,
            header: true,
            selType: 'rowmodel',
			selModel: new Ext.grid.RowSelectionModel({singleSelect:true}),
			padding: "10px 10px 0px 10px",
            width: "100%",
            flex: 1,
            listeners: {
				scope: this,
				rowclick: function(grid, row, col, eOpts) { this.onRowClick(); },

                cellclick:function(cell, row, col) {
					if (col == 0) {
						// first select record for selected row
						//this.taskList.getSelectionModel().selectRow(row);
						// get selected record
						var record = this.taskList.getSelectionModel().getSelected();
						console.log(this.taskList.getSelectionModel());
						if (record.data.on == "1")
							record.data.on = "0";
						else
							record.data.on = "1";
						console.log(this.taskList.getSelectionModel());
						record.markDirty();
						console.log(this.taskList.getSelectionModel());
						this.taskList.getView().refresh();
					}
				},

            },
			cls: 'custom-dirty',
        });

        return grid;
    },

	// tasklist row (task) click handler
	// populates details form with values and makes it enabled for edit
	onRowClick: function() {
		var record = this.taskList.getSelectionModel().getSelected();
		if (record != undefined) {
			var detailsform = this.detailsForm.getForm();
			
			cb_shuffle = detailsform.findField("shuffle");			
			cb_shuffle.suspendEvents();
			
			this.detailsForm.getForm().loadRecord(record);
			
			cb_shuffle.resumeEvents(); 
			this.detailsForm.enable();
		} else {
			this.detailsForm.getForm().reset();
			this.detailsForm.disable();
		}
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

    // create new blank task
    onTaskCreate: function() {
        console.log("create1");
        // create a Record constructor from a description of the fields
        var baseRecord = Ext.data.Record.create([ // creates a subclass of Ext.data.Record
            {name: 'id'},
            {name: 'on'},
            {name: 'schedule'},
            {name: 'hour'},
            {name: 'minute'},
            {name: 'device'},
            {name: 'playlist'},
            {name: 'duration'},
            {name: 'volume1'},
            {name: 'volume2'},
            {name: 'volumetime'},
            {name: 'shuffle'},
            {name: 'wakeup'}
        ]);
        var task = new baseRecord({
            id: this.generateGUID(),
            on: "1",
            schedule: "0,1,2,3,4,5,6",
            hour: "7",
            minute: "0",
            device: "[select device]",
            playlist: "[select playlist]",
            duration: "1",
            volume1: "10",
            volume2: "25",
            volumetime: "1",
            shuffle: "false",
            shuffle: "no"
        });
        this.taskList.store.add(task);
        this.taskList.store.commitChanges();

		task.markDirty();
		this.taskList.getView().refresh();

		var row = this.taskList.store.data.length-1;
		this.taskList.getSelectionModel().selectRow(row);

		this.onRowClick();
    },


    // delete selected task
    onTaskDelete: function() {
        console.log("delete");
        var idx = this.taskList.getSelectionModel().last;
        this.taskList.store.removeAt(idx);
        this.taskList.store.commitChanges();
		this.detailsForm.getForm().reset();
		this.detailsForm.disable();
    },

    // reset unsaved changes
    onReset: function() {
        console.log("reset");
        this.taskList.store.load();
    },

    // saves current tasklist to file
    onSave: function() {
        console.log("save");
        this.getEl().mask(_T("common", "saving"), "x-mask-loading");

        Ext.Ajax.request({
			url: this.baseURL + "/cgi/api.cgi",
            jsonData: {
                action: 'save_tasks',
                data: this.getDataForSave()
            },
			success: function(response, options){
				this.getEl().unmask();
				console.log(response.statusText + ": " + response.responseText);
				var jsonResponse = Ext.util.JSON.decode(response.responseText);
				if (jsonResponse.status == 'ERROR')
					//if (jsonResponse.data == '0x154')
					//	(new SYNO.SDS.MessageBoxV5({})).showMsg({msg: "Trial license restrictions.<br>Only one alarm clock may be saved.<br>Go to <a href=http://www.nasalarmclock.com/synologypurchase/ target=new>http://www.nasalarmclock.com</a> to purchase license.", buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.WARNING});
					//else
					if (jsonResponse.data == '-1')
						(new SYNO.SDS.MessageBoxV5({})).showMsg({msg: _TT("Parfenov.AlarmClock.Application", "common", "login_error") +
							"<br><a href='" + this.baseURL + "/cgi/api.cgi?action=get_log' target=_new>" +
							_TT("Parfenov.AlarmClock.Application", "common", "see_log_file") +
							"</a>.",
							buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.WARNING});
					else
						(new SYNO.SDS.MessageBoxV5({})).showMsg({msg: jsonResponse.data +
							"<br><a href='" + this.baseURL + "/cgi/api.cgi?action=get_log' target=_new>" +
							_TT("Parfenov.AlarmClock.Application", "common", "see_log_file") +
							"</a>.",
							buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.WARNING});
				else
				{
					// if success save, clear dirty marks
					this.taskList.store.each(function(record){
						record.dirty = false;
					});
					this.taskList.getView().refresh();
				}
			},
			failure: function(response, options){
				this.getEl().unmask();
				console.log(response.statusText + ": " + response.responseText);
				(new SYNO.SDS.MessageBoxV5({})).showMsg({title: 'Error saving tasks', msg: response.responseText, buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.WARNING});
			},
			scope: this
        });
    },

	getDataForSave: function() {
		return Ext.pluck(this.taskList.store.getRange(), 'data');
	},

    onApply: function() {
        console.log("apply");
        var detailsform = this.detailsForm.getForm();
        var formValues = detailsform.getValues();
        formValues.schedule = detailsform.findField("schedule").getValue();

        var record = this.taskList.getSelectionModel().getSelected();
        record.beginEdit();
        record.data = formValues;
        record.endEdit();
        record.commit();

		record.markDirty();
		this.taskList.getView().refresh();
    },

    onTest: function() {
		var record = this.taskList.getSelectionModel().getSelected();
		if (record == undefined) {
			(new SYNO.SDS.MessageBoxV5({})).showMsg({title: _TT("Parfenov.AlarmClock.Application", "common", "Error_launch_task"),
				msg: _TT("Parfenov.AlarmClock.Application", "common", "Select_row_to_play"),
				buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.WARNING});
			return;
		}
		if (record.dirty) {
			(new SYNO.SDS.MessageBoxV5({})).showMsg({title: _TT("Parfenov.AlarmClock.Application", "common", "Error_launch_task"),
				msg: _TT("Parfenov.AlarmClock.Application", "common", "Save_task_before_play"),
				buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.WARNING});
			return;
		}

		// show modal lpay window
		var win = new Parfenov.AlarmClock.Play(this.baseURL);
		win.show();
		win.play(record);
    },

	onSettings: function() {
		var win = new Parfenov.AlarmClock.Settings(this.baseURL, this);
		win.show();
		win.loadData();
	}

});


SYNO.ux.ScheduleField2 = Ext.extend(SYNO.ux.ScheduleField, {
	onItemClick2: function() {
	},

    onItemClick: function(g, c, d) {
		SYNO.ux.ScheduleField2.superclass.onItemClick.call(this, g, c, d);
		this.onItemClick2();
	}
});
Ext.reg("syno_schedulefield2", SYNO.ux.ScheduleField2);



//--------------------------------
// Settings window
//--------------------------------
Ext.define("Parfenov.AlarmClock.Settings", {
    extend: "SYNO.SDS.ModalWindow",

    constructor: function(baseURL, parentWindow) {
		this.baseURL = baseURL;
		this.parentWindow = parentWindow;
        var b = this.fillConfig();
        this.callParent([b]);
    },

    fillConfig: function() {
        var b = {
			title: 'Alarm Clock - ' + _T("common", "common_settings"),
			closable: true,
			closeAction: 'hide',
			width: 435,	minWidth: 435,
			height: 370, minHeight: 370,
            layout: "fit",
            buttons: [{
                xtype: "syno_button",
                btnStyle: "grey",
                text: _T("common", "close"),
                scope: this,
                handler: this.onBtnClose
            }],

			// tabs
			items: [
			{
				xtype: "syno_tabpanel",
                activeTab: 0,
				items: [
				// tab - account
				{
					xtype: "syno_formpanel",
					title: "Account",
					itemId: "account_form",
					items: [
					{
						xtype: "syno_displayfield",
						value: "You should enter here login and password of any account on your NAS."
					},
					{
						xtype: "syno_displayfield",
						html: "This info is used to call Synology Web API, that requires authentication. <a href='http://www.nasalarmclock.com/synologydescription/account_tips/' target=_new>(See details)</a>"
					},
					{
						xtype: "syno_fieldset",
						labelWidth: 90,
						items: [
						{
							xtype: "syno_textfield",
							fieldLabel: _T("common", "owner"),
							name: "login"
						},
						{
							xtype: "syno_textfield",
							textType: "password",
							fieldLabel: _T("common", "password"),
							name: "password"
						},
						{
							xtype: "syno_button",
							btnStyle: "blue",
							style: "padding: 0px 30px; margin:5px 0px 0px 0px;",
							name: "saveacc",
							text: _T("common", "save"),
							scope: this,
							handler: this.onSaveAccount
						},
						{
							xtype: "syno_displayfield",
							fieldLabel: "",
							style: "color:red;",
							hidden: true,
							name: "login_details",
							value: _TT("Parfenov.AlarmClock.Application", "common", "login_error"),
							width: 300,
						},
						]
					}
					]
				}, // tab - account - end

				// tab - registration
				{
					xtype: "syno_formpanel",
					title: _TT("Parfenov.AlarmClock.Application", "common", "license"),
					itemId: "reg_form",
					labelWidth: 100,
					items: [
					{
						xtype: "syno_textfield",
						fieldLabel: _T("common", "ds_serial"),
						name: "serial",
						labelStyle: "line-height: 1.5em;",
						disabled: true,
						width: 280,
					},
					{
						xtype: "syno_textfield",
						fieldLabel: _TT("Parfenov.AlarmClock.Application", "common", "license"),
						name: "license",
						width: 280,
					},
					{
						xtype: "syno_button",
						btnStyle: "blue",
						style: "padding: 0px 30px; margin:5px 0px 0px 0px;",
						name: "savelic",
						text: _T("common", "save"),
						scope: this,
						handler: this.onSaveAccount
					},
					{
						xtype: "syno_displayfield",
						fieldLabel: "",
						style: "margin:20px 0px 0px 0px;",
						name: "license_details",
						width: 400,
					},
					{
						xtype: "syno_button",
						fieldLabel: "",
						style: "padding: 0px 30px; margin: 10px 0px",
						name: "gettrial",
						text: _TT("Parfenov.AlarmClock.Application", "common", "get_trial_license"),
						hidden: true,
						scope: this,
						handler: this.getTrialLicense, 
					},
					{
						xtype: "syno_button",
						fieldLabel: "",
						btnStyle: "green",
						style: "padding: 0px 30px;",
						name: "purchase",
						text: _TT("Parfenov.AlarmClock.Application", "common", "purchase_full_version") + "  ($5)",
						hidden: true,
						scope: this,
						handler: this.purchaseFullLicense,
					},
					]
				}, // tab - registration - end

				// tab - log file
				{
					xtype: "syno_formpanel",
					title: _T("mediaservice", "debuglog_label"),
					itemId: "debug_form",
					labelWidth: 80,
					items: [
					{
						xtype: "syno_button",
						fieldLabel: "",
						style: "padding: 0px 30px;",
						name: "getlog",
						text: "Get log file",
						scope: this,
						handler: function() { window.open(this.baseURL + '/cgi/api.cgi?action=get_log', '_blank'); }
					},
					{
						xtype: "syno_button",
						fieldLabel: "",
						style: "padding: 0px 30px; margin-left: 20px;",
						name: "getlog",
						text: "Clear log file",
						scope: this,
						handler: this.clearLog,
					},
					]
				}
				]
			}
			] // tabs
        };
        return b;
    },

	loadData: function() {
		Ext.Ajax.request({
			url: this.baseURL + '/cgi/api.cgi?action=get_account',
			method: 'GET',
			failure: function() {
				console.log(response.statusText + ": " + response.responseText);
				(new SYNO.SDS.MessageBoxV5({})).showMsg({title: '',
					msg: _TT("Parfenov.AlarmClock.Application", "common", "login_error"),
					buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.WARNING});
				return;
			},
			success: function(response) {
				var jsonResponse = Ext.util.JSON.decode(response.responseText);
				if (jsonResponse.status == 'OK') {
					var account_form = this.items.items[0].get("account_form").form;
					account_form.findField("login").setValue(jsonResponse.data.login);
					account_form.findField("password").setValue(jsonResponse.data.password);
					if (jsonResponse.data.login_failed == -1)
						account_form.findField("login_details").show();
					else
						account_form.findField("login_details").hide();

					var reg_form = this.items.items[0].get("reg_form").form;
					reg_form.findField("serial").setValue(jsonResponse.data.dsid);
					reg_form.findField("license").setValue(jsonResponse.data.license);
					var licres = {
						'0' : _TT("Parfenov.AlarmClock.Application", "common", "license_not_found"),
						'-1': _TT("Parfenov.AlarmClock.Application", "common", "login_error"),
						'-2': _TT("Parfenov.AlarmClock.Application", "common", "trial_expired"),
						'-3': _TT("Parfenov.AlarmClock.Application", "common", "license_invalid"),
						'1' : _TT("Parfenov.AlarmClock.Application", "common", "license_OK"),
						'2' : _TT("Parfenov.AlarmClock.Application", "common", "license_trial")
					};
					reg_form.findField("license_details").setValue(
						_TT("Parfenov.AlarmClock.Application", "common", "license_status") + ": " +
						licres[jsonResponse.data.license_details]);
					var purchaseBtn = this.items.items[0].get("reg_form").items.items[5];
					var trialBtn = this.items.items[0].get("reg_form").items.items[4];
					purchaseBtn.hide();
					trialBtn.hide();
					if ((jsonResponse.data.license_details != 1) && ((jsonResponse.data.license_details != -1))) {
						purchaseBtn.show();
						if (jsonResponse.data.license_details != 2)
							trialBtn.show();
					}
					return true;
				} else {
					console.log(response.statusText + ": " + response.responseText);
					(new SYNO.SDS.MessageBoxV5({})).showMsg({title: '',
						msg: _TT("Parfenov.AlarmClock.Application", "common", "login_error"),
						buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.WARNING});
					return false;
				}
			},
			scope: this
		});
	},

    onBtnClose: function() {
        this.close();
		this.parentWindow.loadWarnings();
    },

    onSaveAccount: function() {
        console.log("save account");
        Ext.Ajax.request({
			url: this.baseURL + "/cgi/api.cgi",
            jsonData: {
                action: 'set_account',
                data: this.getDataForSave()
            },
			success: function(response, options) {
				console.log(response.statusText + ": " + response.responseText);
				this.loadData();
				this.parentWindow.loadWarnings();
			},
			failure: function(response, options) {
				console.log(response.statusText + ": " + response.responseText);
				(new SYNO.SDS.MessageBoxV5({})).showMsg({title: _TT("Parfenov.AlarmClock.Application", "common", "error_saving_settings"),
					msg: response.responseText,
					buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.WARNING});
			},
			scope: this
        });
    },

	getDataForSave: function() {
		var account_form = this.items.items[0].get("account_form").form;
		var login = account_form.findField("login").getValue();
		var passwd = account_form.findField("password").getValue();
		var reg_form = this.items.items[0].get("reg_form").form;
		var license = reg_form.findField("license").getValue();
		var data = {"login": login, "password": passwd, "license": license};
		return data;
	},

    clearLog: function() {
        console.log("clear log");
        Ext.Ajax.request({
			url: this.baseURL + "/cgi/api.cgi",
            jsonData: {
                action: 'clear_log',
            },
			success: function(response, options) {
				console.log(response.statusText + ": " + response.responseText);
				var jsonResponse = Ext.util.JSON.decode(response.responseText);
				if (jsonResponse.status == 'OK') {
					(new SYNO.SDS.MessageBoxV5({})).showMsg({title: ' ',
						msg: _T("mediaservice", "log_is_clear"),
						buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.WARNING});
				} else {
					(new SYNO.SDS.MessageBoxV5({})).showMsg({title: '',
						msg: _T("error", "error_error") + ': ' + jsonResponse.data,
						buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.WARNING});
				}
			},
			failure: function(response, options) {
				console.log(response.statusText + ": " + response.responseText);
				(new SYNO.SDS.MessageBoxV5({})).showMsg({title: '',
					msg: _T("error", "error_error") + ': ' + response.responseText,
					buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.WARNING});
			},
			scope: this
        });
	},
	
    // get trial license from web method on NasAlarmClock site
    // and set it into field
    // and save automatically
    getTrialLicense: function() {
        //window.open('http://www.nasalarmclock.com/my-account/#trial', '_blank');
        console.log("get trial licanse");

        var addmgs = "<hr/>You could get trial license from site <a href='http://www.nasalarmclock.com/my-account/#trial' target='_system'>www.nasalarmclock.com</a>";
		
		var reg_form = this.items.items[0].get("reg_form").form;
		var serial = reg_form.findField("serial").getValue();
		
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
                        license = lic_data.data;
						
						var reg_form = this.items.items[0].get("reg_form").form;
						reg_form.findField("license").setValue(license);

                        this.onSaveAccount();

                        return;
                    } else {
                        errmsg = lic_data.error
                    }
                } catch (ex) {
                    errmsg = ex.message;
                }
                console.log("Can't obtain trial license from server: " + errmsg);
                Ext.Msg.show(
                {
                    title: '',
                    message: toStaticHtml("Can't obtain trial license from server: " + errmsg + addmgs),
                    width: 300,
                    buttons: Ext.MessageBox.OK
                });
            },
            failure: function(response, options){
                console.log(response);
                Ext.Msg.show(
                {
                    title: '',
                    message: toStaticHtml("Can't obtain trial license from server: " + response.statusText + ": " + response.responseText + addmgs),
                    width: 300,
                    buttons: Ext.MessageBox.OK
                });
            },
            scope: this
        });
    },
	
    purchaseFullLicense: function() {
		var reg_form = this.items.items[0].get("reg_form").form;
		var serial = reg_form.findField("serial").getValue();

        window.open('http://www.nasalarmclock.com/api/order.php?serial=' + serial, '_system');
    },

});


//--------------------------------
// Play window
//--------------------------------
Ext.define("Parfenov.AlarmClock.Play", {
    extend: "SYNO.SDS.ModalWindow",

    constructor: function(baseURL) {
		this.baseURL = baseURL;
		this.timer = undefined;
		this.playerid = -1;
		this.state = -1;
		this.substate = 1;

        var b = this.fillConfig();
        this.callParent([b]);
    },

    fillConfig: function() {
        var b = {
			title: 'Alarm Clock - ' + 'Play',
			id: 'acPlayWindow',
			closable: false,
			width: 400,	minWidth: 400,
			height: 180, minHeight: 180,
			padding: 20,
            layout: "vbox",
            buttons: [{
                xtype: "syno_button",
                btnStyle: "grey",
                text: "STOP",
                scope: this,
                handler: this.onBtnStop
            }],

			items: [
			{
				xtype: "container",
				layout: "hbox",
				items: [
					{
						xtype: "displayfield",
						id: "status",
						html: "<img src=" + this.baseURL + "/images/setup.png>",
						width: 62,
						height: 42,
						style: "margin-right:20px;",
					},
					{
						xtype: "syno_displayfield",
						id: "curtime",
						value: "00:00",
						height: 42,
						style: "font-size:2em; font-weight:bold; color:#0086E5;  line-height:42px; vertical-align:middle;",
					},
					{
						xtype: "displayfield",
						value: "&nbsp;/&nbsp;",
						height: 42,
						style: "font-size:2em;  line-height:42px; vertical-align:middle;",
					},
					{
						xtype: "syno_displayfield",
						id: "totaltime",
						value: "00:00",
						height: 42,
						style: "font-size:2em; font-weight:bold; color:#0086E5;  line-height:42px; vertical-align:middle;",
					},
					{
						xtype: "displayfield",
						html: "<img src=" + this.baseURL + "/images/volume.png>",
						width: 72,
						height: 42,
						style: "margin-left:20px; margin-right:10px;",
					},
					{
						xtype: "syno_displayfield",
						id: "volume",
						height: 42,
						width: 70,
						value: "",
						style: "font-size:2em; font-weight:bold; color:#0086E5;  line-height:42px; vertical-align:middle;",
					},
				],
			},
			{
				xtype: "syno_displayfield",
				id: "playlist",
				value: "",
				width: 400,
				style: "padding: 10px 0px; font-size:1.3em; font-weight:bold;",
			},
			],
		};
        return b;
	},

	// stop playing and close window
    onBtnStop: function() {
		clearInterval(this.timer);

		// if status is not stopped then send stop signal to player
		if (this.status != 4)
			Ext.Ajax.request({
				url: this.baseURL + "/cgi/api.cgi?action=stopplay&playerid=" + this.playerid,
			});

        this.close();
    },

	// starts playing, call server and starts timer to update playing status
	play: function(record) {
        Ext.Ajax.request({
			url: this.baseURL + "/cgi/api.cgi?action=startplay&guid=" + record.get('id'),

			success: function(response, options) {
				console.log(response.statusText + ": " + response.responseText);
				var jsonResponse = Ext.util.JSON.decode(response.responseText);
				if (jsonResponse.status == 'ERROR') {
					this.close();
					this.displayError(jsonResponse.data);
				} else {
					this.traceStatus(record.get('id'));
				}
			},

			failure: function(response, options) {
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

	// periodically update playing status
	traceStatus: function(guid) {
		var i = 0;

		var win = Ext.getCmp('acPlayWindow');
		var time1 = win.items.items[0].items.items[1];
		var time2 = win.items.items[0].items.items[3];
		var song = win.items.items[1];
		var status = win.items.items[0].items.items[0];
		var volume = win.items.items[0].items.items[5];
		var Url = this.baseURL + "/cgi/api.cgi?action=playstatus&guid=" + guid;
		var me = this;

		this.timer = setInterval(
			function() {
				Ext.Ajax.request({
					url: Url,

					success: function(response, options) {
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
							status.setValue(me.getStatusHtml(data.status));
							if (data.status == 4)
								clearInterval(me.timer);

							time1.setValue(data.time1);
							time2.setValue(data.time2);
							volume.setValue(data.volume + "%");
							song.setValue(data.song);
						}
					},

					failure: function(response, options) {
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

	displayError: function(message) {
		(new SYNO.SDS.MessageBoxV5({})).showMsg({msg: _TT("Parfenov.AlarmClock.Application", "common", "Error_launch_task") +
			":<br>" + message +
			"<br><a href='" + this.baseURL + "/cgi/api.cgi?action=get_log' target=_new>" +
			_TT("Parfenov.AlarmClock.Application", "common", "see_log_file") +
			"</a>.",
			buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.WARNING});
	},

	getStatusHtml: function(status) {
		var img = "";
		if (status == 1) img = "setup";
		if (status == 3) img = "wait";
		if (status == 4) img = "finish";

		if (status == 2) {
			img = "notes" + this.substate;
			this.substate = (this.substate == 3) ? 1 : this.substate + 1;
		}

		return "<img src=" + this.baseURL + "/images/" + img + ".png>";
	},

});
