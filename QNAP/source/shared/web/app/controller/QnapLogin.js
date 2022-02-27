Ext.define('AlarmClock.controller.QnapLogin', {
    extend: 'AlarmClock.controller.LoginCommons',

	checkFields: function (login, password, host) {
        if (login.length === 0 || password.length === 0) {
            this.signInFailure('Please enter your username and password.', true);
            return false;
        }
		return true;
	},	
	
	startSignIn: function () {
        console.log('startSignIn');
		
        var me = this;

        this.showConnectWindow('QNAP server');

        console.log("signing in to: " + globalVars.baseURL);

		Ext.Ajax.request({
			method: 'POST',
			url: globalVars.baseURL,
			jsonData: {
				action: 'login',
				login: this.login,
                password: this.encodePwd(this.password),
			},
			headers: { "Content-Type": "text/plain" }, // trick to disable OPTIONS request
			useDefaultXhrHeader: false,
			success: function (response) {
				//console.log(response);
				var loginResponse = Ext.JSON.decode(response.responseText);

				if (loginResponse.status === "OK") {
					// The server will send a token that can be used throughout the app to confirm that the user is authenticated.
					me.signInSuccess(globalVars.baseURL);
				} else {
					me.signInFailure(loginResponse.data + '<br/>Please check your login and password');
				}
			},
			failure: function (response) {
				console.log(response);
				me.signInFailure('Connect failed.');
			},
		});
    },
	
});