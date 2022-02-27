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
