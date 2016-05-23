'use strict';

var Element = require('./element.js');

function Button() {
    Element.call(this, 'div');

    this.root.style.cursor = 'pointer';
    this.label = new Element('div');

    this.appendChild(this.label);

    this.clicks = [];
}

Button.prototype = {
    setLabel: function(label) {
        this.label.setLabel(label);
    },

    click: function(callback) {
        if(!callback || typeof callback !== 'function') {
            return;
        }
        
        this.clicks.push(callback);
        this.root.addEventListener('click', callback);
    },

    removeClick: function(callback) {
        var index = this.clicks.indexOf(callback);
        this.clicks.splice(index, 1);

        this.root.removeEventListener('click', callback);
    },

    removeEvents: function() {
        this.clicks.forEach(function(callback) {
            this.root.removeEventListener('click', callback);
        }, this);

        this.clicks = [];
    },

    replaceClick: function(callback, newCallback) {
        var index = this.clicks.indexOf(callback);
        if(index !== -1) {
            this.root.removeEventListener('click', this.clicks[index]);
            this.clicks[index] = newCallback;
        } else {
            this.clicks.push(newCallback);
        }

        this.root.addEventListener('click', newCallback);
    },

    __proto__: Element.prototype
};

module.exports = Button;