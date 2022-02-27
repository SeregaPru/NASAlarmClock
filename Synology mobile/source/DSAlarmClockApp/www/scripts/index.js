// For an introduction to the Blank template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkID=397704
// To debug code on page load in Ripple or on Android devices/emulators: launch your app, set breakpoints, 
// and then run "window.location.reload()" in the JavaScript Console.

(function () {
    "use strict";


    // add mouse scroll support for desktop version
    var mouseWheelHandler = function (e) {
        var e = window.event || e,
            el = e.target,
            cmp,
            offset,
            scroller,
            deltaY,
            deltaX,
            _results = [];
        e.preventDefault(); // prevent scrolling when in iframe
        while (el !== document.body) {
            if (el && el.className && el.className.indexOf && el.className.indexOf('x-container') >= 0) {
                cmp = Ext.getCmp(el.id);
                if (cmp && typeof cmp.getScrollable == 'function' && cmp.getScrollable()) {
                    scroller = cmp.getScrollable().getScroller();
                    if (scroller) {
                        deltaY = e.detail ? e.detail * (-120) : e.hasOwnProperty('wheelDeltaY') ? e.wheelDeltaY : e.wheelDelta;
                        deltaX = e.detail ? e.detail * (-120) : e.hasOwnProperty('wheelDeltaX') ? e.wheelDeltaX : 0;
                        offset = { x: -deltaX * 0.5, y: -deltaY * 0.5 };
                        scroller.fireEvent('scrollstart', scroller, scroller.position.x, scroller.position.y, e);
                        scroller.scrollBy(offset.x, offset.y);
                        scroller.snapToBoundary();
                        scroller.fireEvent('scrollend', scroller, scroller.position.x + offset.x, scroller.position.y - offset.y);
                        break;
                    }
                }
            }
            _results.push(el = el.parentNode);
        }
        return _results;
    };

    if (document.addEventListener) {
        // IE9, Chrome, Safari, Opera
        document.addEventListener('mousewheel', mouseWheelHandler, false);
        // Firefox
        document.addEventListener('DOMMouseScroll', mouseWheelHandler, false);
    }
    else {
        // IE 6/7/8
        document.attachEvent('onmousewheel', mouseWheelHandler);
    }


    // Override standard error handling
    // prevent exceptional application exit
    window.onerror = function (msg, url, line, col, error) {
        // Note that col & error are new to the HTML 5 spec and may not be 
        // supported in every browser.  It worked for me in Chrome.
        var extra = !col ? '' : '\ncolumn: ' + col;
        extra += !error ? '' : '\nerror: ' + error;

        // You can view the information in an alert to see things working like this:
        //alert("Error: " + msg + "\nurl: " + url + "\nline: " + line + extra);

        var errmsg = "Please close and reopen this app to continue." +
                     "<br><br>" + msg + "<br>url: " + url + "<br>line: " + line + extra
        ;

        console.log(errmsg);

        if (navigator.notification)
            navigator.notification.alert(
                errmsg,
                undefined,
                "Unhandled error in application",
                'OK'
            );
        else
            Ext.Msg.show({
                title: "Unhandled error in application",
                message: toStaticHtml(errmsg),
                width: 300,
                buttons: Ext.MessageBox.OK
            });

        // If you return true, then error alerts (like in older versions of Internet Explorer) will be suppressed.
        return true;
    };



    document.addEventListener( 'deviceready', onDeviceReady.bind( this ), false );

    function onDeviceReady() {
        console.log("DeviceReady");

        // Handle the Cordova pause and resume events
        document.addEventListener( 'pause', onPause.bind( this ), false );
        document.addEventListener( 'resume', onResume.bind( this ), false );
    };

    function onPause() {
        // TODO: This application has been suspended. Save application state here.
    };

    function onResume() {
        // TODO: This application has been reactivated. Restore application state here.
    };

} )();