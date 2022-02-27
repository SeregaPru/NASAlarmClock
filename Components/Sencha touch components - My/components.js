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
Ext.define('Ext.field.SelectExt', {
    extend:  Ext.field.Select ,
    xtype: 'selectfieldext',

    onListSelect: function(item, record) {
        var me = this;
        if (record) {
            var valueField = me.getValueField();
            var oldValue = me.getValue();
            var newValue = record.get(valueField);

            me.setValue(record);

            me.fireEvent('selected', me, newValue, oldValue);
        }
    },
});
Ext.define('Ext.slider.SliderWrapper', {
    extend  : 'Ext.slider.Slider',
    requires: [
        'Ext.slider.Slider'
    ],

    setValue: function(val,take) {
        var me = this;
        me.callParent(arguments);

        Ext.defer(function () {
            me.fireEvent.apply(me, [].concat('internalchange', me, Array.prototype.slice.call([null,val,val])));
        }, 50);

        return me;
    },
});


Ext.define('Ext.field.SliderExtended', {
  extend  : 'Ext.field.Field',
  xtype   : 'sliderfieldextended',
  requires: [
    'Ext.slider.SliderWrapper'
  ],

  isField : true,

  config: {
    name: null,
    value: null,

    allowMultiple: false,

    cls: Ext.baseCSSPrefix + 'slider-field-extended',
    tabIndex: -1,
    helperPosition: 'right'
  },

  proxyConfig: {
    value: 0,
    minValue: 0,
    maxValue: 100,
    increment: 1
  },

  constructor: function(config) {
    config = config || {};

    if (config.hasOwnProperty('values')) {
      config.value = config.values;
    }

    this.callParent([config]);
  },

  initialize: function() {
    this.callParent();

    this.getComponent().on({
      scope: this,
      change: 'onSliderChange',
      internalchange: 'onSliderChangeInternal',
      dragstart: 'onSliderDragStart',
      drag: 'onSliderDrag',
      dragend: 'onSliderDragEnd'
    });
  },

  getElementConfig: function() {
    var self = this;
    var originalConfig = self.callParent();

    originalConfig.children[1].children = [{
      reference: 'helper',
      tag: 'div',
      cls: Ext.baseCSSPrefix + 'slider-helper',
      children: [
      {
        reference: 'helperInput',
        tag: 'div',
        cls: Ext.baseCSSPrefix + 'slider-helper-input'
      }
      ]
    }];

    return originalConfig;
  },

  setHelperValue: function(value) {
    var value = value;
    this.helperInput.dom.innerHTML = value;
  },

  // @private
  applyComponent: function(config) {
    var self = this;
    self.helper.setStyle('float', self.config.helperPosition);
    self.setHelperValue(self.config.value);
    return Ext.factory(config, Ext.slider.SliderWrapper);
  },

  onSliderChange: function(me, thumb, newValue, oldValue) {
    this.setHelperValue(newValue);
    this.fireEvent('change', this, thumb, newValue, oldValue);
  },

  onSliderChangeInternal: function(me, thumb, newValue, oldValue) {
    this.setHelperValue(newValue);
  },

  onSliderDragStart: function(me, thumb, newValue, oldValue) {
    this.fireEvent('dragstart', this, thumb, newValue, oldValue);
  },

  onSliderDrag: function(me, thumb, newValue, oldValue) {
    this.setHelperValue(newValue);
    this.fireEvent('drag', this, thumb, newValue, oldValue);
  },

  onSliderDragEnd: function(me, thumb, newValue, oldValue) {
    this.fireEvent('dragend', this, thumb, newValue, oldValue);
  },

  /**
   * Convience method. Calls {@link #setValue}
   */
  setValues: function(value) {
    this.setValue(value);
    this.setHelperValue(value);
    //this.updateMultipleState();
  },

  /**
   * Convience method. Calls {@link #getValue}
   */
  getValues: function() {
    return this.getValue();
  },

  reset: function() {
    var config = this.config,
      initialValue = (this.config.hasOwnProperty('values')) ? config.values : config.value;

    this.setValue(initialValue);
  },

  doSetDisabled: function(disabled) {
    this.callParent(arguments);

    this.getComponent().setDisabled(disabled);
  },
});
Ext.define('Ext.field.Toggle', {
    extend:  Ext.field.Slider ,
    xtype : 'togglefieldext',
    alternateClassName: 'Ext.form.Toggle',


    config: {
        /**
         * @cfg
         * @inheritdoc
         */
        cls: 'x-toggle-field',

        /* @cfg {String} labelAlign The position to render the label relative to the field input.
         * Available options are: 'top', 'left', 'bottom' and 'right'
         * @accessor
         */
        labelAlign: 'left',

        /**
         * @cfg {String} activeLabel The label to add to the toggle field when it is toggled on.
         * Only available in the Blackberry theme.
         * @accessor
         */
        activeLabel: null,

        /**
         * @cfg {String} inactiveLabel The label to add to the toggle field when it is toggled off.
         * Only available in the Blackberry theme.
         * @accessor
         */
        inactiveLabel: null
    },

    platformConfig: [{
        theme: ['Windows'],
        labelAlign: 'left'
    }, {
        theme: ['Blackberry', 'Blackberry103', 'MountainView'],
        activeLabel: 'On',
        inactiveLabel: 'Off'
    }],

    /**
     * @event change
     * Fires when an option selection has changed.
     *
     *     Ext.Viewport.add({
     *         xtype: 'togglefield',
     *         label: 'Event Example',
     *         listeners: {
     *             change: function(field, newValue, oldValue) {
     *                 console.log('Value of this toggle has changed:', (newValue) ? 'ON' : 'OFF');
     *             }
     *         }
     *     });
     *
     * @param {Ext.field.Toggle} this
     * @param {Number} newValue the new value of this thumb
     * @param {Number} oldValue the old value of this thumb
     */

    /**
    * @event dragstart
    * @hide
    */

    /**
    * @event drag
    * @hide
    */

    /**
    * @event dragend
    * @hide
    */

    proxyConfig: {
        /**
         * @cfg {String} minValueCls See {@link Ext.slider.Toggle#minValueCls}
         * @accessor
         */
        minValueCls: 'x-toggle-off',

        /**
         * @cfg {String} maxValueCls  See {@link Ext.slider.Toggle#maxValueCls}
         * @accessor
         */
        maxValueCls: 'x-toggle-on'
    },

    // @private
    applyComponent: function(config) {
        return Ext.factory(config, Ext.slider.Toggle);
    },

    // @private
    updateActiveLabel: function(newActiveLabel, oldActiveLabel) {
        if (newActiveLabel != oldActiveLabel) {
            this.getComponent().element.dom.setAttribute('data-activelabel', newActiveLabel);
        }
    },

    // @private
    updateInactiveLabel: function(newInactiveLabel, oldInactiveLabel) {
        if (newInactiveLabel != oldInactiveLabel) {
            this.getComponent().element.dom.setAttribute('data-inactivelabel', newInactiveLabel);
        }
    },

    /**
     * Sets the value of the toggle.
     * @param {Number} newValue **1** for toggled, **0** for untoggled.
     * @return {Object} this
     */
    setValue: function(newValue) {
        if (newValue === true) {
            newValue = 1;
        }

        var oldValue = this.getValue();
        if (oldValue != newValue) {
            this.getComponent().setValue(newValue);

            this.fireEvent('change', this, newValue, oldValue);
        }

        return this;
    },

    getValue: function() {
        return (this.getComponent().getValue() == 1) ? 1 : 0;
    },

    onSliderChange: function(component, thumb, newValue, oldValue) {
        this.fireEvent.call(this, 'changeAction', this, newValue, oldValue);
    },

    /**
     * Toggles the value of this toggle field.
     * @return {Object} this
     */
    toggle: function() {
        // We call setValue directly so the change event can be fired
        var value = this.getValue();
        this.setValue((value == 1) ? 0 : 1);

        return this;
    },

    onChange: function(){
        this.setLabel((this.getValue() == 1) ? this.toggleOnLabel : this.toggleOffLabel);
    }
});
// context menu
Ext.define('Ext.ux.menu.Menu', {
  extend:   'Ext.ActionSheet',
  xtype:    'menu',
  requires: [
    'Ext.ActionSheet'
  ],

  statics: {
    open: function(owner, items, callback) {
      var menu = Ext.Viewport.add({
        xtype:     'menu',
        defaults:  {
          xtype:   'button',
          ui:      'plain',
          handler: function(button) {
            menu.hide();
            callback(button.config.value);
          }
        },
        items:     items,
        listeners: {
          hide: function() {
            Ext.Viewport.remove(menu);
            callback(null);
          }
        }
      });
      menu.prepare();
      menu.showBy(owner);
    }
  },

  config: {
    cls:           Ext.baseCSSPrefix + 'popup-menu',
    hideOnMaskTap: true,
    showAnimation: {
      type:     'fadeIn',
      duration: 200,
      easing:   'ease-out'
    },
    hideAnimation: {
      type:     'fadeOut',
      duration: 200,
      easing:   'ease-out'
    },
    extraSidePadding: 50
  },

  prepare: function() {
    var me = this;
    var buttons = this.query('button');
    var sidePadding = this.element.getWidth() - buttons[0].element.getWidth();
    var maxWidth = 0;
    buttons.forEach(function(button) {
      var width = me.getTextWidth(button.textElement);
      if (width > maxWidth)
        maxWidth = width;
    });
    this.setWidth(maxWidth + sidePadding + this.config.extraSidePadding);

    // The height of the panel is enough to show all contents by defaylt.
    // Before it is expanded automatically, I save the calculated height.
    this.setHeight(this.element.getHeight());
  },

  // Text labels in buttons are defined as <span style="display:block">text</span>
  // so I have to calculate actual width of the text with inserted elements.
  getTextWidth: function(span) {
    var leftAnchor = Ext.dom.Element.create({
      tag:   'span',
      style: 'display: inline !important;',
      html:  '!'
    });
    span.insertFirst(leftAnchor);
    var rightAnchor = Ext.dom.Element.create({
      tag:   'span',
      style: 'display: inline !important;',
      html:  '!'
    });
    span.append(rightAnchor);
    var left = leftAnchor.getX();
    var right = rightAnchor.getX();
    span.removeChild(leftAnchor);
    span.removeChild(rightAnchor);
    return Math.abs(right - left);
  }
});
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
