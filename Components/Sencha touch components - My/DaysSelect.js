Ext.define('Ext.field.DaysSelect', {
    extend: 'Ext.SegmentedButton',
    xtype: 'daysselect',

    /**
     * Set to `true` on all Ext.field.Field subclasses. This is used by {@link Ext.form.Panel#getValues} to determine which
     * components inside a form are fields.
     * @property isField
     * @type Boolean
     */
    isField : true,

    config: {
        internalEvent: false,

        /**
         * @cfg {String} name The field's HTML name attribute.
         *
         * __Note:__ this property must be set if this field is to be automatically included with.
         * {@link Ext.form.Panel#method-submit form submit()}.
         * @accessor
         */
        name: null,

        /**
         * @cfg {Mixed} value A value to initialize this field with.
         * @accessor
         */
        value: null,

        allowMultiple: true,
        items : [
            {
                text : "Mon",
                value: 1,
                flex:1,
            },
            {
                text : "Tue",
                value: 2,
                flex:1,
            },
            {
                text : "Wed",
                value: 3,
                flex:1,
            },
            {
                text : "Thu",
                value: 4,
                flex:1,
            },
            {
                text : "Fri",
                value: 5,
                flex:1,
            },
            {
                text : "Sat",
                value: 6,
                flex:1,
            },
            {
                text : "Sun",
                value: 0,
                flex:1,
            },
        ],

    },

    constructor: function(config) {
        this.callParent([config]);
    },

    initialize: function() {
        this.callParent();
    },

    setValue: function(value) {
        var me = this,
            days = [],
            i;
        for (i = 0; i < 7; i++) {
            if ((" " + value).indexOf(i) > 0)
                days.push(i == 0 ? 6 : i - 1);
        }
        me.setInternalEvent(true);
        me.setPressedButtons(days);
        me.setInternalEvent(false);
    },

    getValue: function() {
        var pressedBtns = this.getPressedButtons(),
            value = "";
        for (var i = 0; i < pressedBtns.length; i++) {
            if (value != "")
                value += ",";
            value += pressedBtns[i].config.value;
        }

        return value;
    },


    /**
     * Updates the pressed buttons.
     * @private
     * override
     * fires also one common "change" event when some of button toggle
     */
    updatePressedButtons: function (newButtons, oldButtons) {
        this.callParent(arguments);

        var me = this;
        // dont trigger if this is internal call from setvalue
        if (me.getInternalEvent()) return;

        if (oldButtons == undefined) return;

        Ext.defer(function () {
            me.fireEvent('change', me);
        }, 50);
    }
});
