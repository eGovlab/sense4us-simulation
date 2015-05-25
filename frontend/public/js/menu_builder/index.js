'use strict';

var Immutable = require('Immutable'),
    Dropdown  = require('./dropdown.js');

function MenuBuilder() {
    if (!(this instanceof MenuBuilder)) {
        throw new Error('Accessing MenuBuilder as a generic method.');
    }

    this.refreshable = [];
}

MenuBuilder.prototype = {
    updateAll: function() {
        this.refreshable.forEach(function(ele) {
            if (ele.update) {
                ele.update();
            }
        });
    },

    div: function() {
        var div = document.createElement('div');

        return div;
    },

    button: function(text, callback) {
        var button = document.createElement('button');
        button.addEventListener('click', callback);
        button.appendChild(document.createTextNode(text));
        
        return button;        
    },

    dropdown: function(text, callback, update) {
        var select = new Dropdown(text, callback, update);
        this.refreshable.push(select);
        return select.element;
    },

    option: function(value, text) {
        var option = document.createElement('option');

        option.value     = value;
        option.innerHTML = text;

        return option;
    },

    input: function(key, value, callback) {
        var input = document.createElement('input');
        
        var cb = function(event) {callback(input.value, input.name);};
        input.addEventListener('change', cb);
        input.deleteEvent = function() {
            input.removeEventListener('change', cb);
        }

        //input.addEventListener('keydown', function(event) {callback(input.value, input.name);});
        input.name = key;
        input.value = value;
      
        return input;
    },
    
    label: function(key) {
        var label = document.createElement('label');
        label.appendChild(document.createTextNode(key));
        label.htmlFor = key;
      
        return label;  
    },

    p: function() {
        var p = document.createElement('p');

        return p;
    },

    menu: function(text, callback) {
        var button = document.createElement('input');
        button.setAttribute('type', 'button');
        button.setAttribute('value', text);
        button.addEventListener('click', callback);
        button.className = 'button';
        
        return button;
    },

    h2: function(text) {
        var e = document.createElement('h2');
        e.innerHTML = text;

        return e;
    }
};

module.exports = new MenuBuilder();