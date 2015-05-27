'use strict';

var menuBuilder = require('./../menu_builder');

function CreateMenu() {
    if (!(this instanceof CreateMenu)) {
        throw new Error('Trying to access CreateMenu as a generic method.');
    }

    this.sidebarContainer = null;
    this.sidebars         = {};
    this.menuContaier     = null;
}

CreateMenu.prototype = {
    setSidebarContainer: function(givenContainer) {
        this.sidebarContainer = givenContainer;
    },

    setMenuContainer: function(givenContainer) {
        this.menuContainer = givenContainer;
    },

    activateSidebar: function(name) {
        var menu = menuBuilder.div();
        menu.className = 'menu';

        name = name.toUpperCase();

        this.sidebars[name].forEach(function(obj) {
            if (!obj.type) {
                obj.type = '';
            }
            switch(obj.type.toUpperCase()) {
                case 'INPUT':
                    var c = menuBuilder.div();
                    var label = document.createElement('label');
                    label.innerHTML = obj.header;
                    var input = document.createElement('input');
                    input.id = obj.id;
                    input.value = obj.default;

                    c.appendChild(label);
                    c.appendChild(input);
                    menu.appendChild(c);
                    break;
                default:
                    menu.appendChild(menuBuilder.button(obj.header, obj.callback));
            }
        });

        while(this.sidebarContainer.firstChild) {
            this.sidebarContainer.removeChild(this.sidebarContainer.firstChild);
        }

        this.sidebarContainer.appendChild(menu);
    },

    createSidebar: function() {
        var args = Array.prototype.slice.call(arguments);

        var sidebar = args[0];
        var headers = args.filter(function(e, index) {
            if (index === 0) {
                return false;
            }

            return true;
        });
        
        this.sidebars[sidebar] = headers;
    },

    createMenu: function() {
        var args = Array.prototype.slice.call(arguments);
        var menu = menuBuilder.div();
        menu.className = 'menu';

        args.forEach(function(obj) {
            if (obj.callback && obj.type) {
                var type = obj.type.toUpperCase();
                switch(type) {
                    case 'DROPDOWN':
                        menu.appendChild(menuBuilder.dropdown(obj.header, obj.callback, obj.update));
                        break;
                    case 'BUTTON':
                        menu.appendChild(menuBuilder.menu(obj.header, obj.callback));
                        break;
                }
            } else if (obj.callback) {
                menu.appendChild(menuBuilder.menu(obj.header, obj.callback));
            } else {
                menu.appendChild(menuBuilder.h2(obj.header));
            }
        });

        this.menuContainer.appendChild(menu);
    }
};

module.exports = new CreateMenu();