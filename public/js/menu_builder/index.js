'use strict';

var Immutable = require('Immutable');

function MenuBuilder() {
    if(!(this instanceof MenuBuilder)) {
        throw new Error("Accessing MenuBuilder as a generic method.");
    }
}

MenuBuilder.prototype = {
    createSidebarEntry: function() {
        var menu = document.createElement('div');

        menu.button = function(text, callback) {
            var button = document.createElement('button');
            button.addEventListener('click', callback);
            button.appendChild(document.createTextNode(text));
            
            return button;
        };

        

        menu.input = function(key, value, callback) {
            var input = document.createElement('input');
            input.addEventListener('change', function(event) {callback(input.value, input.name);});
            //input.addEventListener('keydown', function(event) {callback(input.value, input.name);});
            input.name = key;
            input.value = value;
            
            return input;
        };
        
        menu.label = function(key) {
            var label = document.createElement('label');
            label.appendChild(document.createTextNode(key));
            label.htmlFor = key;
            
            return label;
        };

        menu.p = function() {
            var p = document.createElement('p');
            menu.appendChild(p);

            return p;
        }

        return menu;
    },

    createMenuEntry: function() {
        var menu = document.createElement('div');
        
        menu.menu = function(text, callback) {
            var button = document.createElement('input');
            button.setAttribute("type", "button");
            button.setAttribute("value", text);
            button.addEventListener('click', callback);
            button.className = "button";
            
            return button;
        };

        menu.h2 = function(text) {
            var e = document.createElement("h2");
            e.innerHTML = text;

            return e;
        }

        return menu;
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