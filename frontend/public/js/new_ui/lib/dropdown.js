'use strict';

var Element = require('./element.js'),
    Colors  = require('./colors.js');

function Dropdown(values, callback) {
    Element.call(this, 'div');
    this.header = new Element('div');
    this.select = new Element('select');

    this.root.style.padding = '0px 8px';

    this.select.setWidth('100%');
    this.header.root.style['margin-bottom'] = '8px';
    this.header.root.style['font-weight']   = '700';

    this.select.root.style.padding = '4px 0px';
    this.select.setBackground(Colors.buttonBackground);
    this.select.root.style.color   = Colors.buttonFontColor;
    this.select.root.style.border  = 'none';

    this.rawValues = [];
    this.values    = [];

    if(values && values.forEach) {
        values.forEach(function(v) {
            console.log('Adding value:', v);
            if(typeof v === 'object') {
                if(!v.label || !v.value) {
                    console.error('Invalid value given to dropdown');
                    return;
                } 

                this.addValue(v.label, v.value);
                return;
            }

            this.addValue(v);
        }, this);
    }

    this.changes = [];
    if(callback && typeof callback === 'function') {
        this.onChange(callback);
    }

    this.appendChild(this.header);
    this.appendChild(this.select);
}

Dropdown.prototype = {
    refresh: function() {
        if(!this.updateValue) {
            return;
        }
        
        this.updateValue();
    },

    defaultValue: function(callback) {
        if(!callback && typeof callback !== 'function') {
            throw new Error('Trying to set callback which is not a function');
        }

        var that = this;
        this.updateValue = function() {
            that.setSelectedByValue(callback());
        };

        this.updateValue();
    },

    onChange: function(callback) {
        this.select.root.addEventListener('change', callback);
        this.changes.push(callback);
    },

    removeChange: function(callback) {
        var index = this.changes.indexOf(callback);
        if(index === -1) {
            return;
        }

        this.select.root.removeEventListener('change', callback);
        this.changes.splice(index, 1);
    },

    removeEvents: function() {
        this.changes.forEach(function(callback) {
            this.select.root.removeEventListener('change', callback);
        }, this);
    },

    setLabel: function(label) {
        Element.prototype.setLabel.call(this.header, label);
    },

    setSelectedByIndex: function(index) {
        if(this.values.length <= index) {
            return;
        }

        this.select.root.selectedIndex = index;
    },

    setSelectedByValue: function(value) {
        var index = this.rawValues.indexOf(value);
        if(index === -1) {
            return;
        }

        this.select.root.selectedIndex = index;
    },

    setValue: this.setSelectedByValue,

    getValue: function() {
        return this.select.root.value;
    },

    getCurrentLabel: function() {
        var index = this.getIndex();
        if(index < 0) {
            return '';
        }

        return this.values[index].getLabel();
    },

    getIndex: function() {
        return this.select.root.selectedIndex;
    },

    deleteCurrent: function() {
        var index = this.getIndex();
        if(index < 0) {
            return;
        }

        this.select.removeChild(this.values[index]);

        this.values.splice(index,    1);
        this.rawValues.splice(index, 1);

        if(index >= this.values.length) {
            index = this.values.length - 1;
        }

        if(index < 0) {
            return;
        }

        this.setSelectedByIndex(index);
    },

    addValue: function(header, value) {
        var option = new Element('option');
        this.values.push(option);

        option.setLabel(header);

        if(!value) {
            value = header;
        }

        option.root.value = value;
        this.rawValues.push(value);

        this.select.appendChild(option);
    },

    changeValue: function(value, index) {
        if(!this.values[index]) {
            return;
        }

        this.values[index].root.value = value;
        this.values[index].setLabel(value);
        this.rawValues[index] = value;
    },

    replaceValues: function(values) {
        var selectedIndex = this.getIndex();
        while(this.select.root.firstChild) {
            this.select.root.removeChild(this.select.root.firstChild);
        }

        this.values    = [];
        this.rawValues = [];

        values.forEach(function(v) {
            if(typeof v === 'object') {
                if(!v.label || !v.value) {
                    console.error('Invalid value given to dropdown');
                    return;
                } 

                this.addValue(v.label, v.value);
                return;
            }

            this.addValue(v);
        }, this);

        if(selectedIndex >= this.values.length) {
            return;
        }

        this.setSelectedByIndex(selectedIndex);
    },

    __proto__: Element.prototype
};

module.exports = Dropdown;