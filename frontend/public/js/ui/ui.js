'use strict';

/*
** Author:      Robin Swenson
** Description: Namespace to setup the interface.
*/

/*
** Dependencies
*/

/* The CONFIG object has its config loaded in main.js */
var CONFIG       = require('rh_config-parser'),
    menuBuilder  = require('./../menu_builder'),
    selectedMenu = require('./../selected_menu/selected_menu'),
    Immutable    = require('Immutable');

function createDropdown(element, select, refresh, updateCallback, changeCallbacks) {
    var dropdownElement = document.createElement('select');
    var values = element.get('values');

    var selected = select(changeCallbacks.get('loadedModel')(), element.get('values'));

    values.forEach(function(value, index) {
        var option = document.createElement('option');
        option.innerHTML = value;
        option.value     = value;

        if(selected === index) {
            option.selected = true;
        }

        dropdownElement.appendChild(option);
    });

    dropdownElement.addEventListener('change', function(e) {
        updateCallback(element.get('callback')(changeCallbacks.get('loadedModel')(), null, dropdownElement.value));
    });

    return dropdownElement;
}

function createButton(element, refresh, updateCallback, changeCallbacks) {
    var buttonElement;
    if(element.get('ajax') === true) {
        buttonElement = menuBuilder.button(element.get('header'), function() {
            element.get('callback')(refresh, changeCallbacks);
        });
    } else {
        buttonElement = menuBuilder.button(element.get('header'), function() {
            updateCallback(element.get('callback')(changeCallbacks.get('loadedModel')()));
        });
    }

    return buttonElement;
}

var sidebarRefresh = function(UIData, container, refresh, changeCallbacks, updateCallback) {
    var sidebarMenu = document.createElement('div');
    sidebarMenu.className = 'menu';
    container.appendChild(sidebarMenu);

    UIData.get('sidebar').forEach(function(element) {
        if (element.get('images')) {
            (function() {
                var avatarsElement = selectedMenu.createAvatarButtons('avatar', null, function(key, value) {
                    updateCallback(
                        element.get('callback')(
                            changeCallbacks.get('loadedModel')(),
                            null, 
                            Immutable.Map({avatar: value})
                        )
                    );
                },
                element.get('images'));
                
                var labelElement = menuBuilder.label(element.get('header'));

                sidebarMenu.appendChild(labelElement);
                sidebarMenu.appendChild(avatarsElement);
            }());
        } else if (element.get('header') !== undefined && element.get('callback') !== undefined) {
            var buttonElement;
            switch(element.get('type')) {
                case 'DROPDOWN':
                    buttonElement = createDropdown(element, element.get('select'), refresh, updateCallback, changeCallbacks);
                    break;
                default:
                    buttonElement = createButton(element, refresh, updateCallback, changeCallbacks);
            }

            sidebarMenu.appendChild(buttonElement);
        } else {
            var labelElement = menuBuilder.label(element.get('header'));
            sidebarMenu.appendChild(labelElement);
        }
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

    while(sidebarContainer.firstChild) {
        sidebarContainer.removeChild(sidebarContainer.firstChild);
    }

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