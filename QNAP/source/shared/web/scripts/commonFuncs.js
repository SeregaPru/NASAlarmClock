console.log("[commonFuncs loaded]");

Ext.define("commonFuncs", {
    singleton: true,
	

// wrapper for ...
toStaticHtml: function (html) {
    if (window.toStaticHTML == null)
        return html;
    else
        return window.toStaticHTML(html);
},


// ..... ??????
animateActiveItem: function (activeItem, animation, removeold, delay, callback) {
	removeold = removeold || false;
	delay = delay || 100;
	animation = animation || {type: 'slide', direction: 'left'};
	
	Ext.defer(function () {
		Ext.Viewport.animateActiveItem(activeItem, animation, function () {
			if (removeold) {
				var items = Ext.Viewport.getItems();
				
				for (i = items.length - 1; i >= 0; i--) {
					current = items.get(i);
					if (current != activeItem)
						Ext.Viewport.remove(current, false);
				}
			}
			
			if (callback)
				callback();
		});
	}, delay);
},


});