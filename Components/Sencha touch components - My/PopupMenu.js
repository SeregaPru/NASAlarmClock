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
