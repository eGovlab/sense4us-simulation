'use strict';

var Element = require('./element.js'),
    Colors  = require('./colors.js');

function Input() {
    this.changes = [];
    this.inputs  = [];

    Element.call(this);

    this.input    = new Element('input');
    this.label    = new Element('div');

    this.inputDiv = new Element('div');
    this.inputDiv.appendChild(this.input);

    this.input.setWidth('100%');
    this.input.root.style.border = 'none';
    this.input.setBackground(Colors.inputBackground);
    this.input.root.style.color = Colors.inputFontColor;
    this.input.root.style['text-align'] = 'center';
    this.label.root.style['margin-bottom'] = '8px';

    var that = this;
    this.onChange(function() {
        that.input.root.blur()
    });

    this.appendChild(this.label);
    this.appendChild(this.inputDiv);
}

Input.prototype = {
    setLabel: function(label) {
        this.label.root.innerHTML = label;
    },

    setValue: function(value) {
        this.input.root.value = value;
    },

    onChange: function(callback) {
        this.changes.push(callback);
        this.input.root.addEventListener('change', callback);
    },

    onInput: function(callback) {
        this.inputs.push(callback);
        this.input.root.addEventListener('input', callback);
    },

    replaceChange: function(callback, newCallback) {
        var index = changes.indexOf(callback);
        this.input.root.removeEventListener('change', changes[index]);
        this.input.root.addEventListener('change', newCallback);

        changes[index] = newCallback;
    },

    replaceInput: function(callback, newCallback) {
        var index = inputs.indexOf(callback);
        this.input.root.removeEventListener('input', inputs[index]);
        this.input.root.addEventListener('input', newCallback);

        inputs[index] = newCallback;
    },

    removeEvents: function() {
        this.inputs.forEach(function(callback) {
            this.input.root.removeEventListener('input', callback);
        }, this);

        this.changes.forEach(function(callback) {
            this.input.root.removeEventListener('change', callback);
        }, this);
    },

    __proto__: Element.prototype
}

module.exports = Input;