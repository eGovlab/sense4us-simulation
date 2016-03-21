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
        var container = this.div("sidebar-slider");

        var minSpan = this.div("value");
        minSpan.innerHTML = defaultValue;
        var maxSpan = this.div("max-value");
        maxSpan.innerHTML = max;

        var input = document.createElement('input');
        
        input.type = 'range';
        input.min = min;
        input.max = max;
        input.value = defaultValue;

        input.addEventListener('change', function(){callback(parseInt(input.value))});
        var onSlide = function(val) {
            minSpan.innerHTML = input.value;
            if(onSlideCallback) {
                onSlideCallback(parseInt(input.value));
            }
        };

        input.addEventListener('input', onSlide);

        input.deleteCallbacks = function() {
            input.removeEventListener('change', callback);
            input.removeEventListener('input',  onSlide);
        }

        container.appendChild(minSpan);
        container.appendChild(input);
        container.appendChild(maxSpan);

        return container;
    },

    div: function(className) {
        var div = document.createElement('div');
        if(className) {
            div.className = className;
        }

        return div;
    },

    button: function(text, callback) {
        var button = document.createElement('button');
        button.addEventListener('click', callback);
        button.deleteEvents = function() {
            button.removeEventListener('click', callback);
        };
        button.appendChild(document.createTextNode(text));
        
        return button;        
    },

    dropdown: function(text, callback, update) {
        var select = new Dropdown(text, callback, update);
        this.refreshable.push(select);
        return select;
    },

    select: function(name, callback) {
        var select = document.createElement('select');

        select.name = name;

        select.addEventListener('change', callback);
        select.deleteEvents = function() {
            select.removeEventListener('click', callback);
        };

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
        element.deleteEvents = function() {
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
        button.deleteEvents = function() {
            button.removeEventListener('click', callback);
        };
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
