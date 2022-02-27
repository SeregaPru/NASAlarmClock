// button with hint
Ext.define('Ext.HintButton', {
    extend: Ext.Button,
    xtype: 'hintbutton',

    config: {
        hint: "",
    },

    constructor: function(config) {
        this.callParent([config]);

        var dom = this.element.dom;
        dom.setAttribute('title', this.config.hint);
    },
});
