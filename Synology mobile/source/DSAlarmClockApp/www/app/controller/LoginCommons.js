Ext.define('AlarmClock.controller.LoginCommons', {
    extend: 'Ext.app.Controller',

    config: {
        refs: {
            loginView: 'loginview'
        },
        control: {
            loginView: {
                signInCommand: 'onSignInCommand'
            }
        }
    },

    authStore: null,

    login: "",
    password: "",
    host: "",
    remember: "",
    message: "",

    Ports: [],
    step: 0,


    constructor: function () {
        this.callParent(arguments);
        this.authStore = this.createAuthStore();
    },


    createAuthStore: function() {
        Ext.define('auth', {
            extend: 'Ext.data.Model',
            config: {
                fields: ['host', 'login', 'password'],
                identifier: 'uuid',
                proxy: {
                    type: 'localstorage',
					id: 'authproxy-' + globals.loginFileName
                }
            }
        });

        var store = Ext.create('Ext.data.Store', {
            model: "auth"
        });

        return store;
    },

    //
    // store auth info to session storage
    // or clear if flag is unchecked
    //
    saveAuthInfo: function (host, login, password, remember) {
        console.log('saveAuthInfo');
        var store = this.authStore;

        store.removeAll();

        if (remember) {
            var authRec = { host: host, login: login, password: password };
            store.add(authRec);
        }

        store.sync();
    },

    getStoredAuthInfo: function () {
        console.log('getStoredAuthInfo');
        var store = this.authStore;
        store.load();
        if (store.data.length > 0) {
            var authRec = store.first().data;
            return {
                host: authRec.host,
                login: authRec.login,
                password: authRec.password
            };
        } else {
            console.log('StoredAuthInfo empty');
            return false;
        }
    },


    //--- sign in procedures ---

    onSignInCommand: function (login, password, host, remember) {
        console.log('onSignInCommand');

        this.login = login;
        this.password = password;
        this.host = host;
        this.remember = remember;

        this.step = 0;
        this.message = "";

        this.saveAuthInfo(this.host, this.login, this.password, this.remember);

        if (! this.checkFields(login, password, host))
            return;

        this.startSignIn();
    },


    checkFields: function (login, password, host) {
        return false;
    },

    startSignIn: function () {
    },

    // add step to the end of steps
    addStep: function (host, port, type) {
        console.log('add step: ' + host + ' : ' + port + ' / ' + type);
        this.Ports[this.Ports.length] = [host, port, type];
    },

    // insert step into the current position
    insertStep: function (host, port, type) {
        console.log('insert step: ' + host + ' : ' + port + ' / ' + type);
        this.Ports.splice(this.step, 0, [host, port, type]);
    },

    clearSteps: function () {
        this.step = 0;
        this.Ports = [];
    },


    // when login is success
    // open main window
    signInSuccess: function (host) {
        console.log('signInSuccess: ' + host);
        this.hideConnectWindow();

        globalVars.baseURL = host;
        globalVars.login = this.login;
        globalVars.password = this.password;

        // create main view
        var mainView = new AlarmClock.view.Main();

        // show main view
        Ext.Viewport.add(mainView);
        Ext.Viewport.animateActiveItem(mainView, { type: 'slide', direction: 'left' });
    },


    // show progress window when connecting to NAS
    showConnectWindow: function (host) {
        this.hideConnectWindow();
        Ext.Viewport.setMasked({
            xtype: 'loadmask',
            message: 'Connect to <br>' + host
        });
    },

    // hide progress window
    hideConnectWindow: function () {
        Ext.Viewport.setMasked(false);
    },

    // show window with error message
    signInFailure: function (message, finish) {
        console.log('signInFailure: ' + message);
        this.hideConnectWindow();

        //--// add message to summ log
        //--if (this.message != "")
        //--    this.message += '<br/><br/>';
        //--this.message += message;

        var loginView = this.getLoginView();

        // when connected - show only message
        if (finish)
            loginView.showLoginFailedMessage(message);
        else
            // check if this step is the last one
            if (!this.stepSignIn()) {
                // show extended error message
                var msg = message + '<hr> Please check NAS address. <br><br> Also check if you have properly installed and configured <b>QNAP&nbsp;Alarm&nbsp;Clock</b> package on your QNAP NAS.';
                loginView.showConnectFailedMessage(msg);
            }
    },


    // check minimal required version of server package
    // if package version is lower than required, login fails
    checkNASPackageVersion: function () {
        var me = this;
        console.log('checkNASPackageVersion.');

        Ext.Ajax.request({
            url: this.apiURL + '?action=check_version',
            method: 'GET',
            headers: { "Content-Type": "text/plain" }, // trick to disable OPTIONS request
            useDefaultXhrHeader: false,                // trick to disable OPTIONS request
            success: function (response) {
                console.log("checkVersion request success");
                var loginResponse = Ext.JSON.decode(response.responseText);

                if (loginResponse.status === "OK") {
                    var currentPackageVersion = 0;
                    try {
                        currentPackageVersion = loginResponse.data;
                        globalVars.currentPackageVersion = currentPackageVersion;
                        console.log("Current NAS package version = " + currentPackageVersion + ". Minimal required package version = " + globals.minPackageVersion);
                    } catch (err) {
                        console.log("error parse NAS package version: " + loginResponse.data);
                    }
                    if (currentPackageVersion >= globals.minPackageVersion) {
                        me.signInSuccess(me.apiURL);
                        return;
                    }
                }

                console.log("Current NAS package version is lower than required");
                me.signInFailure('You should update your "Alarm Clock" package for QNAP NAS.<br>Minimum supported version is: <b>' + globals.minAppVersion + '</b><br/><br/><a target="_system" href="http://www.nasalarmclock.com/downloads/' + globals.nasType + '/">Download</a>', true);
            },
            failure: function (response) {
                me.signInFailure('You should update your "Alarm Clock" package for QNAP NAS.<br>Minimum supported version is: <b>' + globals.minAppVersion + '</b><br/><br/><a target="_system" href="http://www.nasalarmclock.com/downloads/' + globals.nasType + '/">Download</a>', true);
            }
        });
    },


    //////////////// the following functions are encode related START
    ezEncodeChars: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",

    encodePwd: function (pwd) {
        return this.ezEncode(this.utf16to8(pwd));
    },

    utf16to8: function (str) {
        var out, i, len, c;
        out = "";
        len = str.length;
        for (i = 0; i < len; i++) {
            c = str.charCodeAt(i);
            if ((c >= 0x0001) && (c <= 0x007F)) {
                out += str.charAt(i);
            }
            else if (c > 0x07FF) {
                out += String.fromCharCode(0xE0 | ((c >> 12) & 0x0F));
                out += String.fromCharCode(0x80 | ((c >> 6) & 0x3F));
                out += String.fromCharCode(0x80 | ((c >> 0) & 0x3F));

            }
            else {
                out += String.fromCharCode(0xC0 | ((c >> 6) & 0x1F));
                out += String.fromCharCode(0x80 | ((c >> 0) & 0x3F));
            }
        }
        return out;
    },

    ezEncode: function (str) {
        var out, i, len;
        var c1, c2, c3;

        len = str.length;
        i = 0;
        out = "";
        while (i < len) {
            c1 = str.charCodeAt(i++) & 0xff;
            if (i === len) {
                out += this.ezEncodeChars.charAt(c1 >> 2);
                out += this.ezEncodeChars.charAt((c1 & 0x3) << 4);
                out += "==";
                break;
            }
            c2 = str.charCodeAt(i++);
            if (i === len) {
                out += this.ezEncodeChars.charAt(c1 >> 2);
                out += this.ezEncodeChars.charAt(((c1 & 0x3) << 4) | ((c2 & 0xF0) >> 4));
                out += this.ezEncodeChars.charAt((c2 & 0xF) << 2);
                out += "=";
                break;
            }
            c3 = str.charCodeAt(i++);
            out += this.ezEncodeChars.charAt(c1 >> 2);
            out += this.ezEncodeChars.charAt(((c1 & 0x3) << 4) | ((c2 & 0xF0) >> 4));
            out += this.ezEncodeChars.charAt(((c2 & 0xF) << 2) | ((c3 & 0xC0) >> 6));
            out += this.ezEncodeChars.charAt(c3 & 0x3F);
        }
        return out;
    }


    /*
    ezDecodeChars : new Array(
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 62, -1, -1, -1, 63,
        52, 53, 54, 55, 56, 57, 58, 59, 60, 61, -1, -1, -1, -1, -1, -1,
        -1,  0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14,
        15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, -1, -1, -1, -1, -1,
        -1, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
        41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, -1, -1, -1, -1, -1),

    utf8to16: function(str) {
        var out, i, len, c;
        var char2, char3;

        out = "";
        len = str.length;
        i = 0;
        while(i < len) {
            c = str.charCodeAt(i++);
            switch(c >> 4)
            {
            case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
            // 0xxxxxxx
                out += str.charAt(i-1);
                break;
            case 12: case 13:
            // 110x xxxx 10xx xxxx
                char2 = str.charCodeAt(i++);
                out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
                break;
            case 14:
            // 1110 xxxx10xx xxxx10xx xxxx
                char2 = str.charCodeAt(i++);
                char3 = str.charCodeAt(i++);
                out += String.fromCharCode(((c & 0x0F) << 12) |
                ((char2 & 0x3F) << 6) |
                ((char3 & 0x3F) << 0));
            }
        }
        return out;
    },

    ezDecode: function (str)
    {
      var c1, c2, c3, c4;
      var i, len, out;

      len = str.length;
      i = 0;
      out = "";
      while(i < len) {
            //* c1
            do {
                c1 = this.ezDecodeChars[str.charCodeAt(i++) & 0xff];
            } while(i < len && c1 == -1);
            if(c1 == -1)
            break;

            //* c2
            do {
            c2 = this.ezDecodeChars[str.charCodeAt(i++) & 0xff];
            } while(i < len && c2 == -1);
            if(c2 == -1)
            break;

            out += String.fromCharCode((c1 << 2) | ((c2 & 0x30) >> 4));

            //* c3
            do {
            c3 = str.charCodeAt(i++) & 0xff;
            if(c3 == 61)
                    return out;
            c3 = this.ezDecodeChars[c3];
            } while(i < len && c3 == -1);
            if(c3 == -1)
            break;

            out += String.fromCharCode(((c2 & 0XF) << 4) | ((c3 & 0x3C) >> 2));

            //* c4 *
            do {
            c4 = str.charCodeAt(i++) & 0xff;
            if(c4 == 61)
                    return out;
              c4 = this.ezDecodeChars[c4];
            } while(i < len && c4 == -1);
            if(c4 == -1)
              break;
            out += String.fromCharCode(((c3 & 0x03) << 6) | c4);
      }
      return out;
    },
    */

    //////////////// the following functions are encode related END

});