Ext.define('AlarmClock.view.Settings', {
    extend: 'Ext.Panel',
    xtype: 'settingsview',

    login: '',
    password: '',
    serial: '',
    license: '',
    licenseStatus: 0,
    licenseStatusText: '',
    loginErrorText: '',

    constructor: function() {
        var content = this.fillConfig();
        this.callParent([content]);

        this.loadData();
    },

    fillConfig: function() {
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
                            tap: function() { this.onPageBack(); },
                            scope:this,
                        }
                    },
                    {
                        xtype: 'spacer',
                    },
                    {
                        html: globals.AppTitle + ' - Settings',
                        cls: 'titlebar',
                    },
                    {
                        xtype: 'spacer',
                    },
                    ]
                },

                {
                    docked: 'top',
                    cls: 'settingstoolbar',
                    items: [
                        // save button
                        {
                            cls: 'contextbutton bluebutton',
                            xtype: 'button',
                            text: "Save",
                            margin: "5px 10px 5px 10px",
                            width: 200,
                            listeners: {
                                tap: function () { this.saveAccount(); },
                                scope: this,
                            },
                        },
                    ]
                },

                {
                    xtype: 'panel',
                    layout: 'card',
                    flex: 1,
                    items: [

        {
            cls: 'settingsform',
            xtype: 'panel',
            scrollable: {
                direction: 'vertical',
                indicators: {
                    y: {
                        autoHide: true,
                    }
                }
            },
            items: [

                // account fields
                {
                    xtype: 'fieldset',
                    title: 'ACCOUNT SETTINGS',
                    defaults: {
                        labelWidth: 100,
                    },
                    items: [
                        {
                            xtype: 'textfield',
                            name: 'login',
                            label: "Login",
                            placeHolder: 'Enter login here',
                            value: this.login,
                            itemId: 'userNameTextField',
                            listeners: {
                                change: function () {
                                    this.login = arguments[1]
                                },
                                scope: this,
                            },
                        },
                        {
                            xtype: 'passwordfield',
                            name: 'password',
                            label: "Password",
                            placeHolder: 'Enter password here',
                            itemId: 'passwordTextField',
                            value: this.password,
                            listeners: {
                                change: function () {
                                    this.password = arguments[1]
                                },
                                scope: this,
                            },
                        },
                    ]
                },
                {
                    cls: 'warningbar licwarning ls_0',
                    html: '',
                    itemId: 'accountWarning',
                    hidden: true,
                },
                {
                    cls: 'customtext',
                    html: commonFuncs.toStaticHtml("You should enter here login and password for any existing account in your NAS.<br><br>" +
                          "This info is used to call Web API, that requires authentication. <a href='http://www.nasalarmclock.com/qnap/description/mainsettings/' target=_new>(See details)</a>"),
                },

                // license fields
                {
                    xtype: 'fieldset',
                    title: 'LICENSE INFORMATION',
                    defaults: {
                        labelWidth: 100,
                    },
                    items: [
                        {
                            xtype: 'textfield',
                            name: 'serial',
                            label: "Serial",
                            placeHolder: 'Serial',
                            value: this.serial,
                            itemId: 'serialTextField',
                            readOnly: true,
                            cls: 'readOnly',
                        },
                        {
                            xtype: 'textfield',
                            name: 'license',
                            label: "License",
                            placeHolder: 'Enter license here',
                            value: this.license,
                            itemId: 'licenseTextField',
                            listeners: {
                                change: function () {
                                    this.license = arguments[1]
                                },
                                scope: this,
                            },
                        },
                    ]
                },
                {
                    cls: 'warningbar licwarning ls_' + (this.licenseStatus + 3),
                    margin: '-1px 0px 15px 0px',
                    html: '',
                    itemId: 'licWarning',
                },
                {
                    cls: 'contextbutton buybutton',
                    xtype: 'button',
                    text: "Get trial license",
                    //hidden: (this.licenseStatus > 0),
                    hidden: true,
                    itemId: 'trialButton',
                    listeners: {
                        tap: function () { this.getTrialLicense(); },
                        scope: this,
                    },
                },
                {
                    cls: 'contextbutton buybutton',
                    xtype: 'button',
                    text: "Purchase full version",
                    icon: 'resources/icons/buy.png',
                    //hidden: (this.licenseStatus == 1),
                    hidden: true,
                    itemId: 'buyButton',
                    listeners: {
                        tap: function () { this.purchaseFullLicense(); },
                        scope: this,
                    },
                },

                // log file section
                {
                    xtype: 'fieldset',
                    title: 'LOG FILE',
                    defaults: {
                        labelWidth: 100,
                    },
                    items: [
                        {
                            cls: 'contextbutton bluebutton',
                            xtype: 'button',
                            text: "Get log file",
                            margin: "10px 10px 10px 10px",
                            listeners: {
                                tap: function () { this.getLogFile(); },
                                scope: this,
                            },
                        },
                        {
                            cls: 'contextbutton buybutton',
                            xtype: 'button',
                            text: "Clear log file",
                            margin: "10px 0px 10px 10px",
                            listeners: {
                                tap: function () { this.clearLogFile(); },
                                scope: this,
                            },
                        },
                    ]
                },
            ]
        }

                    ]
                },
            ]
        }

        return panelContent;
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

    // requst for all necessary data from server
    loadData: function() {
        console.log("getAccountData");
        var me = this;

        me.setMasked({
            xtype   : 'loadmask',
            message : "Loading account information ..."
        });

        var account_data;
        Ext.Ajax.request({
            url: globalVars.baseURL + "?action=get_account",
            method : 'GET',
            async: false,
            headers: { "Content-Type": "text/plain" }, // trick to disable OPTIONS request
            useDefaultXhrHeader: false,                // trick to disable OPTIONS request
            success: function(response) {
                me.setMasked(false);

                console.log(response);
                account_data = Ext.util.JSON.decode(response.responseText);
                if (account_data.status != "OK")
                    Ext.Msg.alert('Error receiving data', response.responseText);

                me.parseAccountData(account_data);
            },
            failure: function (response) {
                me.setMasked(false);
                Ext.Msg.alert('Error receiving data', response.responseText);
            }
        });
        return account_data;
    },

    // parse account information to single fields
    parseAccountData: function(accountData) {
        this.login = accountData.data.login;
        this.password = accountData.data.password;
        this.serial = accountData.data.dsid;
        this.license = accountData.data.license;

        this.loginErrorText = accountData.data.login_error;

        this.licenseStatus = accountData.data.license_details;
        var licenseStatuses = {
            '0' : "License not found",
            '-1': "Can't check license information due to incorrect account settings",
            '-2': "Trial license expired",
            '-3': "License is invalid",
            '1' : "Commercial",
            '2' : "Trial"
        };
        this.licenseStatusText = licenseStatuses[this.licenseStatus];


        var loginField = this.down("#userNameTextField")
        loginField.setValue(this.login);

        var passwordField = this.down("#passwordTextField")
        passwordField.setValue(this.password);

        var serialField = this.down("#serialTextField")
        serialField.setValue(this.serial);

        var licenseField = this.down("#licenseTextField")
        licenseField.setValue(this.license);

        var accountWarningField = this.down("#accountWarning");
        accountWarningField.setHtml("Incorrect account settings: " + this.loginErrorText);
        accountWarningField.setHidden(this.loginErrorText == "");

        var licWarningField = this.down("#licWarning");
        licWarningField.setHtml("License status: " + this.licenseStatusText);
        licWarningField.setCls('warningbar licwarning ls_' + (this.licenseStatus + 3));

        var trialButton = this.down("#trialButton");
        trialButton.setHidden(this.licenseStatus > 0);

        var buyButton = this.down("#buyButton");
        buyButton.setHidden(this.licenseStatus == 1);
    },


    // save account information to server
    saveAccount: function() {
        console.log("save account");

        var oldStatus = this.licenseStatus;

        var me = this;
        me.setMasked({
            xtype: 'loadmask',
            message: 'Saving ...'
        });

        Ext.Ajax.request({
            method: 'POST',
            url: globalVars.baseURL,
            jsonData: {
                action: 'set_account',
                data: this.getDataForSave()
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
                    // update local license info
                    account_data = this.loadData();

                    // update license info on main page
                    items = Ext.Viewport.getItems();
                    mainview = items.get('ext-mainview-1');
                    mainview.parseAccountData(account_data, true);

                    var newStatus = this.licenseStatus;
                    //console.log(oldStatus);
                    //console.log(newStatus);
                    if ((newStatus != -1) && (oldStatus == -1))
                    {
                        // update players and playlist info on main page, if account info was corrected
                        mainview.Reset();
                    }

                    //Ext.Msg.alert('OK', jsonResponse.data);
                    this.setMasked(false);
                }
            },
            failure: function(response, options){
                this.setMasked(false);
                //console.log(response.statusText + ": " + response.responseText);
                Ext.Msg.alert('Error saving account', response.responseText);
            },
            scope: this
        });
    },

    getDataForSave: function() {
        var data = {"login": this.login, "password": this.password, "license": this.license};
        console.log(data);
        return data;
    },

    purchaseFullLicense: function() {
        window.open('http://www.nasalarmclock.com/api/order.php?serial=' + this.serial, '_system');
    },

    getLogFile: function() {
        window.open(globalVars.baseURL + "?action=get_log", '_system');
    },

    clearLogFile: function() {
        window.open(globalVars.baseURL + "?action=clear_log", '_system');
    },

    // get trial license from web method on NasAlarmClock site
    // and set it into field
    // and save automatically
    getTrialLicense: function() {
        //window.open('http://www.nasalarmclock.com/my-account/#trial', '_blank');
        console.log("get trial licanse");

        var addmgs = "<hr/>You could get trial license from site <a href='http://www.nasalarmclock.com/my-account/#trial' target='_system'>www.nasalarmclock.com</a>";

        Ext.Ajax.request({
            url: "http://www.nasalarmclock.com/api/gettrial.php?serial=" + this.serial,
            method: 'GET',
            async: true,
            headers: { "Content-Type": "text/plain" }, // trick to disable OPTIONS request
            useDefaultXhrHeader: false,                // trick to disable OPTIONS request
            success: function(response, options) {
                var errmsg = "";
                try {
                    var lic_data = Ext.util.JSON.decode(response.responseText);
                    if (lic_data.code == 0) {
                        this.license = lic_data.data;

                        var licenseField = this.down("#licenseTextField")
                        licenseField.setValue(this.license);

                        this.saveAccount();

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
                    message: commonFuncs.toStaticHtml("Can't obtain trial license from server: " + errmsg + addmgs),
                    width: 300,
                    buttons: Ext.MessageBox.OK
                });
            },
            failure: function(response, options){
                console.log(response);
                Ext.Msg.show(
                {
                    title: '',
                    message: commonFuncs.toStaticHtml("Can't obtain trial license from server: " + response.statusText + ": " + response.responseText + addmgs),
                    width: 300,
                    buttons: Ext.MessageBox.OK
                });
            },
            scope: this
        });
    },

});
