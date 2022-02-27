Ext.application({
    name: 'AlarmClock',

    requires: [
        'Ext.MessageBox',
    ],

    views: [
        globals.loginFileName,
        'Main',
        'Settings',
        'Play',
    ],

    controllers: [
        globals.loginFileName,
    ],

    icon: {
        '57': 'resources/icons/Icon.png',
        '72': 'resources/icons/Icon~ipad.png',
        '114': 'resources/icons/Icon@2x.png',
        '144': 'resources/icons/Icon~ipad@2x.png'
    },

    isIconPrecomposed: true,

    startupImage: {
        '320x460': 'resources/startup/320x460.jpg',
        '640x920': 'resources/startup/640x920.png',
        '768x1004': 'resources/startup/768x1004.png',
        '748x1024': 'resources/startup/748x1024.png',
        '1536x2008': 'resources/startup/1536x2008.png',
        '1496x2048': 'resources/startup/1496x2048.png'
    },


    "css": [
        {
            "path": "resources/css/sencha-touch.css",
            "platform": ["ios"],
            "Theme": "Cupertino"
        },
    ],


    launch: function () {
        console.log('main app launch');
        // We can't get the device details until the device is ready, so lets wait.
        /*
        if (Ext.isReady) {
            this.onDeviceReady();
        } else {
            Ext.onReady(this.onDeviceReady, this, { single: true });
        }
        */

        if (Ext.Viewport.isReady) {
            this.onDeviceReady();
        } else {
            Ext.Viewport.on('ready', this.onDeviceReady, this, { single: true });
        }
    },

    onDeviceReady: function () {
        this.prepare();

        if (globals.selectView)
            globals.selectView(this.OpenView);
        else
            this.OpenView('loginview');
    },

    prepare: function () {
        // enabling cross domain requests
        Ext.Ajax.cors = true;
        Ext.Ajax.useDefaultXhrHeader = false;

        // show blue statusbar for login screen
		
        try {
			StatusBar.show();
			StatusBar.styleLightContent();
			StatusBar.backgroundColorByHexString("#15336F");
        } catch (err) {
        }
    },

    OpenView: function(view) {
        // Destroy the #appLoadingIndicator element
        var appLoadingIndicator = Ext.fly('appLoadingIndicator');
        if (appLoadingIndicator)
            appLoadingIndicator.destroy();

        // Initialize the main view
        Ext.Viewport.add([
            { xtype: view }
        ]);

        if (window.WinJS && window.WinJS.Application) {
            var me = this;
            // Get the back button working in WP8.1
            window.WinJS.Application.onbackclick = function () {
                me.onBackKeyDown();
                return true; // This line is important, without it the app closes.
            }
        }
        else {
            document.addEventListener("backbutton", this.onBackKeyDown, false);
        }

        //!!!
        Ext.override(Ext.Container, {
            animateActiveItem: function (activeItem, animation, callback) {
                var layout = this.getLayout(),
                    defaultAnimation;

                if (this.activeItemAnimation) {
                    this.activeItemAnimation.destroy();
                }
                this.activeItemAnimation = animation = new Ext.fx.layout.Card(animation);
                if (animation && layout.isCard) {
                    animation.setLayout(layout);
                    defaultAnimation = layout.getAnimation();
                    if (defaultAnimation) {
                        defaultAnimation.disable();
                        animation.on('animationend', function () {
                            defaultAnimation.enable();
                            animation.destroy();

                            if (callback) {
                                callback();
                            }
                        }, this);
                    } else {
                        animation.on('animationend', function () {
                            animation.destroy();
                            if (callback) {
                                callback();
                            }
                        }, this);
                    }
                }
                return this.setActiveItem(activeItem);
            }
        });

    },


    onBackKeyDown: function () {
        console.log("back");

        var items = Ext.Viewport.getItems(),
        mainview = items.get('ext-mainview-1'),
        loginview = items.get('ext-loginview-1'),
        current = Ext.Viewport.getActiveItem();

        if ((items.length <= 1) || (current == mainview) || (current == loginview)) // first screen - exit app;
        {
            if (window.WinJS && window.WinJS.Application) {
                MSApp.terminateApp(null);
            } else {
                navigator.app.exitApp();
            }
            return;
        }

        Ext.defer(function () {
            Ext.Viewport.animateActiveItem(mainview, { type: 'slide', direction: 'right' }, function () {
                for (i = items.length - 1; i >= 0; i--) {
                    current = items.get(i);
                    if (current != mainview)
                        Ext.Viewport.remove(current, false);
                }
            });
        }, 100);
    },

});