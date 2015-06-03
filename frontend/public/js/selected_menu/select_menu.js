'use strict';

var SelectButton = require('./select_button.js'),
    menuBuilder  = require('./../menu_builder'),
    settings     = require('./../settings');

function SelectMenu() {
    if (!(this instanceof SelectMenu)) {
        throw new Error('SelectMenu called as a generic method.');
    }

    this.element = menuBuilder.div();
    this.element.className = 'menu';

    this.buttons = [];
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
            this.element.appendChild(b.element);
            this.buttons.push(b);

        }, this);
    },

    addInput: function(header, value, callback) {
        var containerDiv = menuBuilder.div(),
            labelDiv     = menuBuilder.div(),
            inputDiv     = menuBuilder.div();

        labelDiv.appendChild(menuBuilder.label(header));
        inputDiv.appendChild(menuBuilder.input(header, value, callback));

        containerDiv.appendChild(labelDiv);
        containerDiv.appendChild(inputDiv);

        this.element.appendChild(containerDiv);
    },

    addAvatarSelector: function(header, value, callback) {
        var containerDiv = menuBuilder.div(),
            labelDiv     = menuBuilder.div(),
            avatarsDiv   = menuBuilder.div();
        
        avatarsDiv.className = 'avatars';

        labelDiv.appendChild(menuBuilder.label(header));
        
        settings.avatars.forEach(function(avatar) {
            var avatarDiv = menuBuilder.div();
            var img = menuBuilder.img();
            
            avatarDiv.className = 'avatarPreview';
            
            if (value === avatar.src) {
                avatarDiv.className += ' selected';
            }
        
            img.src = avatar.src;
            avatarDiv.value = avatar.src;
            avatarDiv.name = header;
            
            menuBuilder.addValueCallback(avatarDiv, callback, 'click');
            
            avatarDiv.appendChild(img);
            avatarsDiv.appendChild(avatarDiv);
        });

        containerDiv.appendChild(labelDiv);
        containerDiv.appendChild(avatarsDiv);

        this.element.appendChild(containerDiv);
    },

    reset: function() {
        this.buttons.forEach(function(button) {
            button.element.removeEventListener('click', button.callback);
        });

        this.buttons = [];

        while(this.element.firstChild) {
            this.element.removeChild(this.element.firstChild);
        }
    },
};

module.exports = SelectMenu;