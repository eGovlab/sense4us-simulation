'use strict';

var Immutable = null,
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

    slider: function(defaultValue, min, max, callback, onSlideCallback) {
        var input = document.createElement('input');
        
        input.type = 'range';
        input.min = min;
        input.max = max;
        input.value = defaultValue;

        input.addEventListener('change', callback);
        if(onSlideCallback) {
            input.addEventListener('input',  onSlideCallback);
        }

        input.deleteCallbacks = function() {
            input.removeEventListener('change', callback);
            if(onSlideCallback) {
                input.removeEventListener('input',  onSlideCallback);
            }
        }

        return input;
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

    select: function(name, callback) {
        var select = document.createElement('select');

        select.name = name;

        select.addEventListener('change', callback);

        return select;
    },

    option: function(value, text) {
        var option = document.createElement('option');

        option.value     = value;
        option.innerHTML = text;

        return option;
    },
    
    addValueCallback: function(element, callback, event) {
        event = event || 'change';
        
        var cb = function(event) {callback(element.name, element.value); };
        
        element.addEventListener(event, cb);
        element.deleteEvent = function() {
            element.removeEventListener(event, cb);
        };
    },

    input: function(key, value, callback) {
        var input = document.createElement('input');
        
        MenuBuilder.prototype.addValueCallback(input, callback);

        input.setAttribute('value', value);
        input.name  = key;
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

    img: function() {
        var img = document.createElement('img');

        return img;
    },

    span: function(key) {
        var span = document.createElement('span');
        if(key && typeof key === "string") {
            span.innerHTML = key;
        }

        return span;
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
