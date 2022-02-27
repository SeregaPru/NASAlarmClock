Ext.define('Ext.field.InlineTimePicker', {
    extend:  'Ext.picker.Picker',
    xtype: 'inlinetimepicker',

    /**
     * Set to `true` on all Ext.field.Field subclasses. This is used by {@link Ext.form.Panel#getValues} to determine which
     * components inside a form are fields.
     * @property isField
     * @type Boolean
     */
    isField : true,

    editing: false,

    config: {
        internalEvent: false,

        cls: "inlinetimepicker",

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
        prevValue: null,

        /**
         * @cfg {Array} slotOrder
         * An array of strings that specifies the order of the slots.
         * @accessor
         */
        slotOrder: ['hour', 'minute'],

        doneButton: false,
        cancelButton: false,

        toolbar: false,
        modal: false,
        //!!scrollable: false,

        top: null,
        left: null,
        right: null,
        bottom: null,

        floatingCls: true,
    },

   // @private
    constructor: function() {
        this.callParent(arguments);
        this.createSlots();
    },

    initialize: function() {
        this.callParent();

        this.element.on({
            scope: this,
            dragend: 'onScroll',
            dragstart: 'onScroll',
        });

    },

    // disable scroll of parent element
    onScroll: function(e) {
        e.event.stopPropagation();
        e.stopEvent();
    },

    setValue: function(value) {
        var newValue = {
            hour: parseInt(value[0]),
            minute: parseInt(value[1]),
        };

        var me = this;

        me.setInternalEvent(true);

        this.callParent([newValue, true]);
        me.prevValue = value;

        me.setInternalEvent(false);
    },

    getValue: function() {
        var values = {},
            items = this.getItems().items,
            minute, hour, item, i;

        for (i = 0; i < items.length; i++) {
            item = items[i];
            if (item instanceof Ext.picker.Slot) {
                values[item.getName()] = item.getValue(true);
            }
        }

        //if all the slots return null, we should not return a date
        if (values.hour === null && values.minute === null) {
            console.log("time getvalue ALL NULL ");
            return null;
        }

        hour = Ext.isNumber(values.hour) ? values.hour : 0;
        hour = Math.min(hour, 23);
        minute = Ext.isNumber(values.minute) ? values.minute : 0;
        minute = Math.min(minute, 59);

        var res = [hour, minute];
        return res;
    },

    /**
     * Generates all slots for all years specified by this component, and then sets them on the component
     * @private
     */
    createSlots: function() {
        var me = this,
            hours = [],
            mins = [],
            i;

        for (i = 0; i <= 23; i++) {
            hours.push({
                text  : i,
                value : i
            });
        }

        for (i = 0; i <= 59; i++) {
            mins.push({
                text  : i,
                value : i
            });
        }

        var slots = [];

        me.getSlotOrder().forEach(function (item) {
            slots.push(me.createSlot(item, hours, mins));
        });

        me.setSlots(slots);
    },

    /**
     * Returns a slot config
     * @private
     */
    createSlot: function(name, hours, mins) {
        switch (name) {
            case 'hour':
                return {
                    name: 'hour',
                    align: 'center',
                    data: hours,
                    title: 'Hours',
                    flex: 0,
                    width: 150,
                };
            case 'minute':
                return {
                    name: 'minute',
                    align: 'center',
                    data: mins,
                    title: 'Mins',
                    flex: 0,
                    width: 150,
                };
        }
    },

    onSlotPick: function() {
        var value = this.getValue(true),
            me = this,
            days = [],
            minsInHour, i;

        if (!value) {
            return;
        }

        this.callParent(arguments);

        var innerItems = this.getInnerItems(),
            slot;

        for (i = 0; i < innerItems.length; i++) {
            slot = innerItems[i];
            if (slot.isSlot) {
                slot.setValue(slot.getValue(true));
            }
        }

        // dont trigger if this is internal call from setvalue
        if (me.getInternalEvent()) return;

        var changed = false;
        for (i = 0; i < 2; i++) {
            if (this.prevValue[i] != value[i])
                changed = true;
        }
        if (changed) {
            Ext.defer(function () {
                me.fireEvent('change', me);
            }, 50);
        }
    },

});
