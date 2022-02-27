Ext.define('AlarmClock.controller.QnapMobLogin', {
    extend: 'AlarmClock.controller.LoginCommons',

    checkFields: function (login, password, host) {
        if (login.length === 0 || password.length === 0 || host.length === 0) {
            this.signInFailure('Please enter your username and password, and NAS address.', true);
            return false;
        }
        return true;
    },

    // determine port to connect
    // if port not empty - add only this port 
    // if port is empty, add default 80 port and default 8080 port
    startSignIn: function () {
        this.clearSteps();

        var host = this.host;

        var protocolIdx = host.indexOf('://');
        var protocol = host.substring(0, protocolIdx);
        if (protocol === "") {
            protocol = "http://";
        } else {
            protocol = protocol + "://";
            host = host.substring(protocolIdx + 3);
        }

        var portIdx = host.indexOf(':');
        if (portIdx !== -1) {
            var port = host.substring(portIdx + 1);
            host = host.substring(0, portIdx);
            this.addStep(protocol + host, port, 'main');
            this.addStep(protocol + host, port, 'sign');
        } else {
            // if port is empty, add 80 port and "/" path to main page
            // add default 8080 port + path to cgi
            this.addStep(protocol + host, 80, 'main');
            this.addStep(protocol + host, 8080, 'sign');
        }

        this.stepSignIn();
    },

    stepSignIn: function () {
        console.log('stepSignIn step=' + this.step);

        if (this.step >= this.Ports.length)
            return false;

        var rec = this.Ports[this.step];
        this.step++;

        var host = rec[0];
        var port = rec[1];
        var type = rec[2];
        var URL = host + ':' + port;

        if (type === 'main') {
            // step 1: user host and port
            this.doConnect(URL);
            return true;
        }

        if (type === 'sign') {
            this.doSignIn(URL);
            return true;
        }

        return false;
    },

    // checking connect to QNAP server
    // just GET to host:port /
    doConnect: function (host) {
        var me = this;

        this.showConnectWindow(host);

        console.log("connecting to: " + host);
        this.apiURL = host;

        Ext.Ajax.request({
            method: 'GET',
            url: this.apiURL,
            useDefaultXhrHeader: false,
            success: function (response) {
                console.log("Connect to [" + host + "] success");
                console.log(response);

                if (response.status === 200) {
                    // get redirect port
                    // search in  response.responseText  for   http://server:PORT
                    // location.href = 'http://x.x.x.xx:port/';
                    reg = /location.href = 'http[s]?:\/\/[^:]+:[^\/]+\//;
                    if (reg.test(response.responseText)) {
                        reg = /location.href = '(http[s]?:\/\/[^:]+):([^\/]+)\//;
                        regex = reg.exec(response.responseText);
                        newhost = regex[1];
                        newport = regex[2];

                        // add redirect port to step ports + /cgi
                        me.insertStep(newhost, newport, 'sign');
                        console.log("added redirect to: " + newhost + ":" + newport);
                    }
                }
                me.stepSignIn();
            },
            failure: function (response) {
                console.log("Connect to [" + host + "] failed");
                me.signInFailure("Connect failed.", false);
            }
        });
    },

    // try to sign in to host:port with login/password
    doSignIn: function (host) {
        var me = this;

        this.showConnectWindow(host);

        this.apiURL = host + '/apps/AlarmClock/cgi/api.cgi';
        console.log("signing in to: " + this.apiURL);

        Ext.Ajax.request({
            method: 'POST',
            url: this.apiURL,
            jsonData: {
                action: 'login',
                login: this.login,
                password: this.encodePwd(this.password)
            },
            headers: { "Content-Type": "text/plain" }, // trick to disable OPTIONS request
            useDefaultXhrHeader: false,				   // trick to disable OPTIONS request
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
            failure: function (response) {
                console.log(response);
                if (response.status === 404) {
                    console.log("Login request success, app not found");
                    me.signInFailure('It seems that you have not installed <b>Alarm&nbsp;Clock</b> package to your NAS.<br><br>See <a href="http://www.nasalarmclock.com/downloads/qnap/">how to download and install the package</a>', true);
                }
                else {
                    console.log("Connect to [" + host + "] failed");
                    me.signInFailure("Connect failed.", false);
                }
            }
        });
    }

});