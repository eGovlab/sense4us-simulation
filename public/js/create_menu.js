'use strict';

var menuBuilder = require('./menu_builder');

function CreateMenu() {
    if(!(this instanceof CreateMenu)) {
        throw new Error("Trying to access CreateMenu as a generic method.");
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
        menu.className = "menu";

        this.sidebars[name].forEach(function(obj) {
            menu.appendChild(menuBuilder.button(obj.header, obj.callback));
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
            if(index === 0) {
                return false;
            }

            return true;
        });
        
        this.sidebars[sidebar] = headers;
    },

    createMenu: function() {
        var args = Array.prototype.slice.call(arguments);
        var menu = menuBuilder.div();
        menu.className = "menu";

        args.forEach(function(obj) {
            if(obj.callback && obj.type) {
                var type = obj.type.toUpperCase();
                switch(type) {
                    case "SCROLLDOWN":
                        menu.appendChild(menuBuilder.dropdown(obj.header, obj.callback, obj.update));
                        break;
                    case "BUTTON":
                        menu.appendChild(menuBuilder.menu(obj.header, obj.callback));
                        break;
                }
            } else if(obj.callback) {
                menu.appendChild(menuBuilder.menu(obj.header, obj.callback));
            } else {
                menu.appendChild(menuBuilder.h2(obj.header));
            }
        });

        this.menuContainer.appendChild(menu);
    }
};

function create_menu(container, addNode, addOrigin, addActor, sendData) {
    var menu = menuBuilder.create_menu();
    menu.className = 'menu';
    
    menu.appendChild(menu.button('Create node', function() {
        addNode();
    }));
    
    menu.appendChild(menu.button('Create origin', function() {
        addOrigin();
    }));
    
    menu.appendChild(menu.button('Create actor', function() {
        addActor();
    }));
    
    menu.appendChild(menu.button('Send data', function() {
        sendData();
    }));

    container.appendChild(menu);
}

module.exports = new CreateMenu();