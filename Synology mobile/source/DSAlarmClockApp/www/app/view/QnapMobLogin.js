Ext.define('AlarmClock.view.QnapMobLogin', {
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
							    xtype: 'label',
							    html: 'QNAP&#160;NAS&#160;IP&#160;address&#160;and&#160;port<br/><i>(for&#160;example:&#160;192.168.1.40:8080)</i>',
							    cls: 'bubble',
							},
							{
							    xtype: 'textfield',
							    label: "Address",
							    placeHolder: 'NAS address',
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
							    name: 'rememberField',
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
					    html: 'Download QNAP package from <a href="http://www.nasalarmclock.com/downloads/qnap/" target="_blank">www.nasalarmclock.com</a>',
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

			{ flex: 1, }
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