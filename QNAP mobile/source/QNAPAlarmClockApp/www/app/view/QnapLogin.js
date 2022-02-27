Ext.define('AlarmClock.view.QnapLogin', {
    extend: 'AlarmClock.view.LoginCommons',

    xtype: 'loginview',

    fillConfig: function () {
		var innerContent = {
			cls: 'loginform',
			xtype: 'formpanel',
			layout: 'hbox',
			padding: '20 10%',
			items: [
			{ flex: 1, },
			
			{
				flex: 0,
				cls: 'loginpanel',
				layout: {
					type: 'vbox',
					pack: 'center'
				},
				items: [
				{
					items: [
					{
						xtype: 'image',
						cls: 'img',
					},
					{
						xtype: 'label',
						cls: 'title',
					    html: '<nobr>QNAP Alarm Clock</nobr>',
					},
					{
						xtype: 'fieldset',
						defaults: {
							labelWidth: 80,
						},
						items: [
							{
								xtype: 'textfield',
								label: "Login",
								placeHolder: 'Username',
								itemId: 'userNameTextField',
								name: 'userNameTextField',
								value: this.login,
							},
							{
								xtype: 'passwordfield',
								label: "Password",
								placeHolder: 'Password',
								itemId: 'passwordTextField',
								name: 'passwordTextField',
								value: this.password,
							},
							{
								xtype: 'checkboxfield',
								label: "Remember",
								itemId: 'rememberField',
								name: 'rememberField',
								style: 'width: 115px;',
								checked: true,
							},
							
							{
							    itemId: 'hostTextField',
								name: 'hostTextField',
								xtype: 'hiddenfield',
								value: "",
							},							
						]
					},
					{
						xtype: 'button',
						itemId: 'logInButton',
						ui: 'action',
						text: 'Log In',
						cls: 'loginbutton',
					},
					{
						xtype: 'label',
						cls: 'version',
						html: 'ver. ' + globals.version,
					},
					],
				}
				],
			},

			{ flex:1, }
			],
			
			listeners: [{
				delegate: '#logInButton',
				event: 'tap',
				fn: 'onLogInButtonTap'
			}]
			
		}
		
        return innerContent;
	},


	// check if user is already authenticated
	checkSID: function() {
		console.log('checkSID');
		var controller = AlarmClock.app.application.getController(globals.loginFileName);
		controller.CheckSID();
	},
	
});
