'use strict';

var Element = require('./element.js');

function Button() {
    this.root = document.createElement('div');
    this.root.style.cursor = 'pointer';
    this.clicks = [];
}

Button.prototype = {
    click: function(callback) {
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