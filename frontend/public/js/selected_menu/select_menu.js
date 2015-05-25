'use strict';

var SelectButton = require('./select_button.js'),
    menuBuilder  = require('./../menu_builder');

function SelectMenu() {
    if (!(this instanceof SelectMenu)) {
        throw new Error('SelectMenu called as a generic method.');
    }

    this.buttons = [];
    this.element = menuBuilder.div();
    this.element.className = 'menu';
}

SelectMenu.prototype = {
    addButton: function() {
        var args;
        if(arguments.length > 1) {
            args = Array.prototype.slice.call(arguments);
        } else {
            if(arguments[0] && arguments[0].length !== undefined) {
                args = arguments[0];
            } else {
                args = [arguments[0]];
            }
        }

        args.forEach(function(button) {
            if(!button.header || !button.callback || typeof button.callback !== 'function') {
                return;
            }

            var b = new SelectButton(button.header, button.callback);

            this.buttons.push(b);
        }, this);
    },

    addInput: function(header, value, callback) {
        var containerDiv = menuBuilder.div(),
            labelDiv     = menuBuilder.div(),
            inputDiv     = menuBuilder.div();

        labelDiv.appendChild(menuBuilder.label(header));
        inputDiv.appendChild(menuBuilder.input(header, value, function(inputValue, inputKey) {
            callback(inputKey, inputValue);
        }));

        containerDiv.appendChild(labelDiv);
        containerDiv.appendChild(inputDiv);

        this.element.appendChild(containerDiv);
    },

    reset: function() {
        this.buttons.forEach(function(button) {
            button.element.removeEventListener('click', button.callback);
        });
    },
};

module.exports = SelectMenu;