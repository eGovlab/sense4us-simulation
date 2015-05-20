'use strict';

var menuLayer       = require('./menu-layer.js'),
    menus           = require('./menu.js'),
    sidebars        = require('./sidebar.js'),
    CONFIG          = require('rh_config-parser'),
    network         = require('./../network'),
    notificationBar = require('./../notification_bar');

function Settings() {
    if(!(this instanceof Settings)) {
        throw new Error('Accessing Settings as a generic method.');
    }
}

Settings.prototype = {
    initialize: function(sidebar, menu, state) {
        CONFIG.setConfig(require('./config.js'));
        network.setDomain(CONFIG.get('BACKEND_HOSTNAME'));

        notificationBar.setContainer(document.getElementById("notification-bar"));

        menuLayer.setSidebarContainer(sidebar);
        menuLayer.setMenuContainer(menu);

        state = state();

        sidebars.forEach(function(sidebar, index) {
            sidebar.menu = sidebar.menu.map(function(menu) {
                if(menu.callback && typeof menu.callback === 'function') {
                    var cbClone = menu.callback;
                    menu.callback = function(e) {
                        cbClone.call(this, state, e);
                    };
                }

                return menu;
            });

            sidebar.name = sidebar.name.toUpperCase();

            menuLayer.createSidebar.apply(menuLayer, [sidebar.name].concat(sidebar.menu));
            if(index === 0) {
                menuLayer.activateSidebar(sidebar.name);
            }
        });

        menus.forEach(function(menu) {
            menu = menu.map(function(button) {
                if(button.callback && typeof button.callback === 'function') {
                    var cbClone = button.callback;
                    button.callback = function(e) {
                        cbClone.call(this, state, e);
                    }
                }

                if(button.update && typeof button.update === 'function') {
                    var upClone = button.update;
                    button.update = function(e) {
                        upClone.call(this, state, e);
                    }
                }

                return button;
            });

            menuLayer.createMenu.apply(menuLayer, menu);
        });
    }
};

module.exports = new Settings();