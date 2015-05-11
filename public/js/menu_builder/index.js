'use strict';

var Immutable = require('Immutable'),
    Dropdown  = require("./dropdown.js");

function MenuBuilder() {
    if(!(this instanceof MenuBuilder)) {
        throw new Error("Accessing MenuBuilder as a generic method.");
    }

    this.refreshable = [];
}

MenuBuilder.prototype = {
    updateAll: function() {
        this.refreshable.forEach(function(ele) {
            if(ele.onUpdate && typeof ele.onUpdate === "function") {
                ele.onUpdate.call(ele);
            }
        });
    },

    div: function() {
        var div = document.createElement("div");

        return div;
    },

    button: function(text, callback) {
        var button = document.createElement('button');
        button.addEventListener('click', callback);
        button.appendChild(document.createTextNode(text));
        
        return button;        
    },

    dropdown: function(text, callback, update) {
        var select = new Dropdown(callback, update);
        this.refreshable.push(select);
        return select.element;

        var select = document.createElement("select");

        select.addEventListener("change", function(e) {
            this.update = update;
            callback.call(this, e);
        });

        select.onUpdate = update;
        select.onUpdate.call(select);
        
        this.refreshable.push(select);

        return select;
    },

    option: function(value, text) {
        var option = document.createElement("option");

        option.value     = value;
        option.innerHTML = text;

        return option;
    },

    input: function(key, value, callback) {
        var input = document.createElement('input');
        input.addEventListener('change', function(event) {callback(input.value, input.name);});
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
        button.setAttribute("type", "button");
        button.setAttribute("value", text);
        button.addEventListener('click', callback);
        button.className = "button";
        
        return button;
    },

    h2: function(text) {
        var e = document.createElement("h2");
        e.innerHTML = text;

        return e;
    }
};

module.exports = new MenuBuilder();

/*
    <form id='sense4us_import_json' action='/model'>
        <input type='file' />
        <input type='submit' class='button' value='Import (.json)' />
    </form>
    <input type='button' class='button' onclick='sense4us.ui.create_origin_node(null, 0, 0);' value='Create origin' />
    <input type='button' class='button' onclick='sense4us.ui.create_node(null, 0, 0);' value='Create node' />
*/