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
    this.header.root.style['font-weight'] = '700';

    this.select.root.style.padding = '4px 0px';
    this.select.setBackground(Colors.buttonBackground);
    this.select.root.style.color   = Colors.buttonFontColor;
    this.select.root.style.border  = 'none';

    this.values = [];

    if(values && values.forEach) {
        values.forEach(function(v){this.addValue(v)}, this);
    }

    this.changes = [];
    if(callback && typeof callback === 'function') {
        this.onChange(callback);
    }

    this.appendChild(this.header);
    this.appendChild(this.select);
}

Dropdown.prototype = {
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
        });
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
        var index = this.values.indexOf(value);
        if(index === -1) {
            return;
        }

        this.select.root.selectedIndex = index;
    },

    getValue: function() {
        return this.select.root.value;
    },

    getIndex: function() {
        return this.select.root.selectedIndex;
    },

    addValue: function(header, value) {
        var option = new Element('option');
        this.values.push(option);

        option.setLabel(header);

        if(!value) {
            value = header;
        }

        option.root.value = value;

        this.select.appendChild(option);
    },

    __proto__: Element.prototype
};

module.exports = Dropdown;