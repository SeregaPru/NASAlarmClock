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
