Ext.define('AlarmClock.view.LoginCommons', {
    extend: 'Ext.Panel',

    login: "",
    password: "",
    host: "",

    constructor: function () {
        this.loadStoredAuthInfo();

        var content = this.fillConfig();
        this.callParent([content]);
    },


    loadStoredAuthInfo: function () {
        var controller = AlarmClock.app.application.getController(globals.loginFileName);
        var authRec = controller.getStoredAuthInfo();
        if (authRec) {
            this.host = authRec.host;
            this.login = authRec.login;
            this.password = authRec.password;
        };
    },


    // ...
    onLogInButtonTap: function () {
        var me = this,
			usernameField = me.down('#userNameTextField'),
			passwordField = me.down('#passwordTextField'),
			hostField = me.down('#hostTextField'),
			rememberField = me.down('#rememberField'),

			username = usernameField.getValue(),
			password = passwordField.getValue(),
			host = hostField.getValue(),
			remember = rememberField.isChecked();

        // Using a delayed task in order to give the hide animation above
        // time to finish before executing the next steps.
        var task = Ext.create('Ext.util.DelayedTask',
			function () {
			    task.cancel();
			    me.fireEvent('signInCommand', username, password, host, remember);
			}
		);
        task.delay(500);
    },


    // shows window with error - login failed
    showLoginFailedMessage: function (msg) {
        this.showConnectFailedMessage(msg);
    },

    // shows window with error - connect failed
    showConnectFailedMessage: function (msg) {
        Ext.Msg.show(
        {
            title: '',
            message: toStaticHtml(msg),
            width: 300,
            buttons: Ext.MessageBox.OK
        });
    }

});