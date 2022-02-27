Ext.define("globals", {
    singleton: true,


    // version of this client app, displayed in start screen
    version: '1.12',

    // minimal version of NAS app, required for this version of mobile app
    minPackageVersion: '1.12',

    // nas type
    nasType: 'qnap',

    loginFileName: 'QnapLogin',

    AppTitle: 'QNAP Alarm Clock',


    // ---------------------------------------------------------------------------------------

    // check previous login
    // if SessionID is present in cookies and is correct
    selectView: function (openViewFunc) {
        console.log("CheckSID");
        var me = this;

        globalVars.baseURL = 'cgi/api.cgi';
        // dont get current package version from server because we know it
        globalVars.currentPackageVersion = this.version;

        SID = this.getCookie("NAS_SID");
        if (SID == false) {
            console.log("SID not found");
            openViewFunc('loginview');
            return;
        }
        console.log("SID = " + SID);

        Ext.Ajax.request({
            method: 'GET',
            url: 'cgi/api.cgi?action=check_sid&sid=' + SID,
            success: function (response) {
                //console.log(response);
                var loginResponse = Ext.JSON.decode(response.responseText);

                if (loginResponse.status === "OK") {
                    // The server will send a token that can be used throughout the app to confirm that the user is authenticated.
                    openViewFunc('mainview', {type: 'slide', direction: 'left'}, true );
                } else {
                    openViewFunc('loginview');
                }
            },
            failure: function (response) {
                openViewFunc('loginview');
            },
        });
    },

    getCookie: function(name) {
        match = document.cookie.match(new RegExp(name + '=([^;]+)'));
        if (match) return match[1];
        return false;
    },

});