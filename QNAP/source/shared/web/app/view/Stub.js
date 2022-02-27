Ext.define('AlarmClock.view.Stub', {
    extend: 'Ext.Panel',
    xtype: 'stub',

    constructor: function () {
        var content = this.fillConfig();
        this.callParent([content]);
    },

    fillConfig: function () {
        var panelContent = {
            xtype: 'panel',
			cls: 'loginform',
        }
        return panelContent;
    },
	
});
