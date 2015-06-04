'use strict';

/*
** Author:      Robin Swenson
** Description: Namespace to setup the interface.
*/

/*
** Dependencies
*/

/* The CONFIG object has its config loaded in main.js */
var CONFIG      = require('rh_config-parser'),
    menuBuilder = require('./../menu_builder');

var sidebarRefresh = function(UIData, container, refresh, changeCallbacks, updateCallback) {
    var sidebarMenu = document.createElement('div');
    sidebarMenu.className = 'menu';
    container.appendChild(sidebarMenu);

    UIData.get('sidebar').forEach(function(button) {
        var buttonElement;
        if(button.get('ajax') === true) {
            buttonElement = menuBuilder.button(button.get('header'), function() {
                button.get('callback')(refresh, changeCallbacks);
            });
        } else {
            buttonElement = menuBuilder.button(button.get('header'), function() {
                updateCallback(button.get('callback')(changeCallbacks.get('loadedModel')()));
            });
        }
        

        sidebarMenu.appendChild(buttonElement);
    });
};

var menuRefresh = function(UIData, container, refresh, UIRefresh, changeCallbacks, updateCallback) {
    var menuBar = document.createElement('div');
    menuBar.className = 'menu';
    container.appendChild(menuBar);

    UIData.get('menu').forEach(function(menu) {
        var button = null;

        if(menu.get('callback') !== undefined && menu.get('update') !== undefined) {
            var dd = menuBuilder.dropdown(
                menu.get('header'),
                function onClick() {
                    menu.get('callback').call(
                        this,
                        refresh,
                        function() {
                            UIRefresh(refresh, changeCallbacks);
                        },
                        changeCallbacks
                    );
                },
                
                function update() {
                    menu.get('update').call(
                        this,
                        refresh,
                        function() {
                            UIRefresh(refresh, changeCallbacks);
                        },
                        changeCallbacks
                    );
                }
            );

            button = dd;
        } else if (menu.get('callback') !== undefined) {
            button = menuBuilder.button(menu.get('header'), function() {
                updateCallback(menu.get('callback')(UIData));
            });
        }

        if(button === null) {
            return;
        }

        menuBar.appendChild(button);
    });
};

var UIRefresh = function(refresh, changeCallbacks) {
    var sidebarContainer = CONFIG.get('SIDEBAR_CONTAINER'), //document.getElementById('sidebar'),
        menuContainer    = CONFIG.get('MENU_CONTAINER');    //document.getElementById('upper-menu');

   /* while(sidebarContainer.firstChild) {
        sidebarContainer.removeChild(sidebarContainer.firstChild);
    }*/

    while(menuContainer.firstChild) {
        menuContainer.removeChild(menuContainer.firstChild);
    }

    var _UIData      = changeCallbacks.get('UIData'),
        _loadedModel = changeCallbacks.get('loadedModel'),
        UIData       = _UIData(),
        that         = this;

    /* The sidebar may only update the model as of right now. */
    sidebarRefresh(UIData, sidebarContainer, refresh, changeCallbacks, function(updatedModel) {
        _loadedModel(updatedModel);
        refresh();
    });

    /* This callback is a bit redundant. I will remake this structure */
    /* TODO: Setup this in a relevant manner to the changeCallbacks object. */
    menuRefresh(UIData, menuContainer, refresh, UIRefresh, changeCallbacks, function(updatedUI) {
        _UIData(updatedUI);
        UIRefresh();
    });
};

module.exports = UIRefresh;