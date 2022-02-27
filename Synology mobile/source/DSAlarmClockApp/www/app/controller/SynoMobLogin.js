Ext.define('AlarmClock.controller.SynoMobLogin', {
    extend: 'AlarmClock.controller.LoginCommons',

    // 		var apiURL = host + '/webman/3rdparty/AlarmClock';

    // Session token
    sessionToken: null,

    step: 0,
    message: "",


    onSignInCommand: function (login, password, host, remember) {
        console.log('onSignInCommand');

        this.login = login;
        this.password = password;
        this.host = host;
        this.remember = remember;

        this.step = 0;
        this.message = "";

        this.qcstep = 0;
        this.qcHosts = [];

        this.saveAuthInfo(this.host, this.login, this.password, this.remember);

        if (login.length === 0 || password.length === 0 || host.length === 0) {
            this.signInFailure('Please enter your username and password, and diskstation host.', true);
            return;
        }

        this.selectSignIn();
    },

    selectSignIn: function () {
        this.step++;
        console.log('selectSignIn step=' + this.step);

        if (this.step === 1) {
            // step 1: user host and port
            this.doSignIn('http://' + this.host);
            return true;
        }
        if (this.step === 2) {
            // step 2 maybe missing port?
            // try to add port :5000 to host
            // if host already contains port - skip this step
            if (this.host.indexOf(':') === -1) {
                this.doSignIn('http://' + this.host + ':5000');
                return true;
            }
        }

        // for quickconnect you should not enter port
        // if port is entered - no quickconnect!
        if (this.host.indexOf(':') !== -1)
            return false;

        if (this.step === 3) {
            // step 3:
            // get quickconnect address
            this.qcstep = 0;
            this.getQuickConnect(this.host);
            return true;
        }

        //!!console.log(this.qcHosts);
        //!!console.log(this.qcstep);

        // step 4:
        // try to use one of quickconnect host
        if (this.qcstep >= this.qcHosts.length)
            return false;
        var host = this.qcHosts[this.qcstep];
        this.qcstep++;
        this.doSignIn(host);
        return true;
    },

    doSignIn: function (host) {
        var me = this;

        this.showConnectWindow(host);

        this.apiURL = host + '/webman/3rdparty/AlarmClock/api.cgi';
        console.log("signing in to: " + this.apiURL);

        Ext.Ajax.request({
            method: 'POST',
            url: this.apiURL,
            jsonData: {
                action: 'login',
                login: this.login,
                password: this.password
            },
            headers: { "Content-Type": "text/plain" },  // trick to disable OPTIONS request
            useDefaultXhrHeader: false,                 // trick to disable OPTIONS request
            success: function (response) {
                console.log("Login request success");
                console.log(response);
                var loginResponse = Ext.JSON.decode(response.responseText);

                if (loginResponse.status === "OK") {
                    me.checkNASPackageVersion(loginResponse.data);
                } else {
                    me.signInFailure(loginResponse.data + '<br/>Please check your login and password', true);
                }
            },
            failure: function (response, options) {
                console.log(response);
                if (response.status === 404) {
                    console.log("Login request success, app not found");
                    me.signInFailure('It seems that you have not installed <b>Alarm&nbsp;Clock</b> package to your NAS.<br><br>See <a href="http://www.nasalarmclock.com/downloads/synology/">how to download and install the package</a>', true);
                }
                else {
                    console.log("Connect to [" + host + "] failed");
                    me.signInFailure("Connect failed.", false);
                }
            }
        });

    },


    signInFailure: function (message, connected) {
        console.log('signInFailure: ' + message);
        this.hideConnectWindow();

        var loginView = this.getLoginView();

        // add message to summ log
        if (this.message !== "")
            this.message += '<br/><br/>';
        this.message += message;

        // when connected show only last message
        if (connected)
            loginView.showLoginFailedMessage(message);
        else
            // show all connect messages
            if (!this.selectSignIn()) {
                var msg = this.message + '<hr> Please check diskstation address. <br><br> Also check if you have properly installed and configured Synology Alarm Clock package on your Synology NAS.';
                loginView.showConnectFailedMessage(msg);
            }
    },



    //
    //
    getQuickConnect: function (quickConnectId) {
        var quickConnectURL = 'http://global.quickconnect.to/Serv.php';
        var quickConnectData = '[' +
            '{"version":1, "command":"get_server_info", "stop_when_error":"false", "stop_when_success":"false", "id":"dsm_portal_https", "serverID":"' + quickConnectId + '"},' +
            '{"version":1, "command":"get_server_info", "stop_when_error":"false", "stop_when_success":"false", "id":"dsm_portal",       "serverID":"' + quickConnectId + '"} ' +
            ']';

        Ext.Ajax.request({
            method: 'POST',
            url: quickConnectURL,
            data: quickConnectData,
            headers: { "Content-Type": "text/plain" }, // trick to disable OPTIONS request
            useDefaultXhrHeader: false,
            success: function (response) {
                //!!console.log(response);
                var jsonResponse = Ext.JSON.decode(response.responseText);
                //!!console.log(jsonResponse);
                this.parseQuickConnect(jsonResponse);

                if (this.qcHosts.length === 0)
                    this.signInFailure("QuickConnect record not found for <b>" + quickConnectId + "</b>", false);
                else
                    this.signInFailure("Connecting to QuickConnect:", false);
            },
            failure: function (response) {
                console.log("getQuickConnect fail!");
                this.signInFailure('Can\'t connect to quickconnect host', false);
            },
            scope: this
        });

        //return '192.168.1.60';
    },

    parseQuickConnect: function (qcres) {
        var LAN_IPV4_PREFIX = "lan_ipv4";
        var LAN_IPV6_PREFIX = "lan_ipv6";
        var WAN_IPV4_PREFIX = "wan_ipv4";
        var WAN_IPV6_PREFIX = "wan_ipv6";
        var FQDN_PREFIX = "fqdn";
        var DDNS_PREFIX = "ddns";

        for (var i in qcres) {
            var qcObj = qcres[i];

            if (!this.is_valid_server_info(qcObj))
                continue;

            var protocol = (i === "0") ? "https:" : "http:";

            var port;
            if (qcObj.service.ext_port === 0 || qcObj.service.ext_port === "0" || qcObj.service.ext_port === qcObj.service.port) {
                port = false;
            } else {
                port = qcObj.service.ext_port;
            }

            for (var n in qcObj.server["interface"]) {
                var h = qcObj.server["interface"][n];
                if (undefined !== h.ipv6) {
                    for (var t in h.ipv6) {
                        if (undefined !== h.ipv6[t].address) {
                            if (h.ipv6[t].scope === "link") {
                                this.verify(h.ipv6[t].address, qcObj.service.port, protocol, LAN_IPV6_PREFIX);
                            } else {
                                this.verify(h.ipv6[t].address, qcObj.service.port, protocol, WAN_IPV6_PREFIX);
                                if (port) {
                                    this.verify(h.ipv6[t].address, port, protocol, WAN_IPV6_PREFIX);
                                }
                            }
                        }
                    }
                }
                if (undefined !== h.ip && !this.is_loopback_ipv4(h.ip)) {
                    if (this.is_lan_ipv4(h.ip)) {
                        this.verify(h.ip, qcObj.service.port, protocol, LAN_IPV4_PREFIX);
                    } else {
                        this.verify(h.ip, qcObj.service.port, protocol, WAN_IPV4_PREFIX);
                        if (port) {
                            this.verify(h.ip, port, protocol, WAN_IPV4_PREFIX);
                        }
                    }
                }
            }

            if (qcObj.server.ddns !== undefined && qcObj.server.ddns !== "NULL") {
                this.verify(qcObj.server.ddns, qcObj.service.port, protocol, DDNS_PREFIX);
                if (port) {
                    this.verify(qcObj.server.ddns, port, protocol, DDNS_PREFIX);
                }
            }

            if (qcObj.server.fqdn !== undefined && qcObj.server.fqdn !== "NULL") {
                this.verify(qcObj.server.fqdn, qcObj.service.port, protocol, FQDN_PREFIX);
                if (port) {
                    this.verify(qcObj.server.fqdn, port, protocol, FQDN_PREFIX);
                }
            }

            this.verify(qcObj.server.external.ip, qcObj.service.port, protocol, WAN_IPV4_PREFIX);

            if (port) {
                this.verify(qcObj.server.external.ip, port, protocol, WAN_IPV4_PREFIX);
            }

        } // for
    },

    //...
    verify: function (addr, port, protocol, prefix) {
        var LAN_IPV6_PREFIX = "lan_ipv6";
        var WAN_IPV6_PREFIX = "wan_ipv6";

        //!!console.log(arguments);
        if ((prefix === WAN_IPV6_PREFIX) || (prefix === LAN_IPV6_PREFIX))
            addr = '[' + addr + ']';
        var host = protocol + '//' + addr + ':' + port;
        console.log("VERIFY: " + host);
        this.qcHosts[this.qcHosts.length] = host;
    },

    is_valid_server_info: function (a) {
        return !(a.errno === undefined || a.errno !== 0 || a.server === undefined || a.server["interface"] === undefined || a.server.external === undefined || a.server.external.ip === undefined || a.server.serverID === undefined || a.service === undefined || a.service.port === undefined || a.service.ext_port === undefined || a.env === undefined || a.env.control_host === undefined || a.env.relay_region === undefined);
    },

    is_loopback_ipv4: function (b) {
        var a = /(^127\.0\.0\.\d+$)/;
        return a.test(b);
    },

    is_lan_ipv4: function (b) {
        var a = this.ip_to_number(b);
        if ((a & this.mask_to_number(8)) === this.ip_to_number("10.0.0.0") ||
            (a & this.mask_to_number(12)) === this.ip_to_number("172.16.0.0") ||
            (a & this.mask_to_number(16)) === this.ip_to_number("192.168.0.0") ||
            (a & this.mask_to_number(16)) === this.ip_to_number("169.254.0.0")) {
            return true;
        }
        return false;
    },

    mask_to_number: function (a) {
        return -1 << (32 - a);
    },

    ip_to_number: function (b) {
        var a = b.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
        if (a) {
            return (+a[1] << 24) + (+a[2] << 16) + (+a[3] << 8) + (+a[4]);
        }
        return null;
    }

});