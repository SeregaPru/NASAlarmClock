Ext.define('AlarmClock.view.SynoMobLogin', {
    extend: 'AlarmClock.view.LoginCommons',

    xtype: 'loginview',

    fillConfig: function() {
		var innerContent = {
			cls: 'loginform',
			xtype: 'formpanel',
			layout: 'hbox',
			padding: '20 10%',
			items:	[
			{ flex:1, },
			
			{
				flex:0,
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
						html: 'Synology Alarm&#160;Clock',
					},
					{
						xtype: 'fieldset',
						defaults: {
							labelWidth: 80,
						},
						items: [
							{
								xtype: 'label',
								html: 'Diskstation QuickConnect ID or&#160;symbolic&#160;/&#160;IP&#160;address&#160;and&#160;port<br/><i>(for&#160;example:&#160;192.168.1.40:5000)</i>',
								cls: 'bubble',
							},
							{
								xtype: 'textfield',
								label: "Address",
								placeHolder: 'Diskstation address',
								itemId: 'hostTextField',
								name: 'hostTextField',
								value: this.host,
							},
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
								name: 'rememberTextField',
								style: 'width: 115px;',
								checked: true,
							}
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
						cls: 'download',
						html: 'Download Synology package from <a href="http://www.nasalarmclock.com" target="_blank">www.nasalarmclock.com</a>',
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

});
