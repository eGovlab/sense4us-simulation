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

function createDropdown(element, select, refresh, changeCallbacks, updateModelCallback) {
    var dropdownElement = document.createElement('select');
    var values = element.values;

    var selected = select(changeCallbacks.loadedModel(), element.values);

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
        updateModelCallback(element.callback(changeCallbacks.loadedModel(), null, dropdownElement.value));
    });

    return dropdownElement;
}

function createButton(element, refresh, changeCallbacks, updateModelCallback) {
    var buttonElement;
    if(element.ajax === true) {
        buttonElement = menuBuilder.button(element.header, function() {
            element.callback(refresh, changeCallbacks);
        });
    } else {
        buttonElement = menuBuilder.button(element.header, function() {
            updateModelCallback(element.callback(changeCallbacks.loadedModel()));
        });
    }

    return buttonElement;
}

function createSlider(element, changeCallbacks, updateModelCallback) {
    var inputElement;
    var setupModel = changeCallbacks.loadedModel();
    var defaultValue = element.defaultValue(setupModel);
    var ranges = element.range(setupModel);

    var container = menuBuilder.div();
    container.className = "sidebar-slider";

    var valueSpan = menuBuilder.span();
    valueSpan.innerHTML = defaultValue;
    valueSpan.className = "value";

    var maxValueSpan = menuBuilder.span();
    maxValueSpan.innerHTML = ranges[1];
    maxValueSpan.className = "max-value";

    if(element.ajax === true) {
        inputElement = menuBuilder.slider(defaultValue, ranges[0], ranges[1], function(value) {
            element.callback(parseInt(this.value), changeCallbacks);
        });
    } else {
        inputElement = menuBuilder.slider(defaultValue, ranges[0], ranges[1], function(value) {
            var model = changeCallbacks.loadedModel();
            valueSpan.innerHTML = this.value;
            updateModelCallback(element.callback(parseInt(this.value), model));
        }, function(value) {
            valueSpan.innerHTML = this.value;
        });
    }

    container.appendChild(valueSpan);
    container.appendChild(maxValueSpan);

    var clearer = menuBuilder.div();
    clearer.style.clear = "right";

    container.appendChild(clearer);
    container.appendChild(inputElement);

    return container;
}

var sidebarRefresh = function(UIData, container, refresh, changeCallbacks, updateModelCallback) {
    var sidebarMenu = document.createElement('div');
    sidebarMenu.className = 'menu';
    container.appendChild(sidebarMenu);

    UIData.sidebar.forEach(function(element) {
        if (element.images) {
            (function() {
                var avatarsElement = selectedMenu.createAvatarButtons('avatar', null, function(key, value) {
                    console.log("CREATED NODE?");
                    updateModelCallback(
                        element.callback(
                            changeCallbacks.loadedModel(),
                            {name:   key}, 
                            {avatar: value}
                        )
                    );
                }, element.images);
                
                var labelElement = menuBuilder.label(element.header);

                sidebarMenu.appendChild(labelElement);
                sidebarMenu.appendChild(avatarsElement);
            }());
        } else if (element.header !== undefined && element.callback !== undefined) {
            var buttonElement;
            switch(element.type) {
                case 'DROPDOWN':
                    sidebarMenu.appendChild(menuBuilder.label(element.header));
                    buttonElement = createDropdown(element, element.select, refresh, changeCallbacks, updateModelCallback);
                    break;
                case 'BUTTON':
                    buttonElement = createButton(element, refresh, changeCallbacks, updateModelCallback);
                    break;
                case 'SLIDER':
                    sidebarMenu.appendChild(menuBuilder.label(element.header));
                    buttonElement = createSlider(element, changeCallbacks, updateModelCallback);
                    break;
                default:
                    throw new Error("Type does not exist.");
            }

            sidebarMenu.appendChild(buttonElement);
        } else {
            var labelElement = menuBuilder.label(element.header);
            sidebarMenu.appendChild(labelElement);
        }
    });
};

var menuRefresh = function(UIData, container, refresh, UIRefresh, changeCallbacks, updateModelCallback) {
    var menuBar = document.createElement('div');
    menuBar.className = 'menu';
    container.appendChild(menuBar);

    UIData.menu.forEach(function(menu) {
        var button = null;

        if(menu.callback !== undefined && menu.update !== undefined) {
            var dd = menuBuilder.dropdown(
                menu.header,
                function onClick() {
                    menu.callback.call(
                        this,
                        refresh,
                        function() {
                            UIRefresh(refresh, changeCallbacks);
                        },
                        changeCallbacks
                    );
                },
                
                function update() {
                    menu.update.call(
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
        } else if (menu.callback !== undefined) {
            button = menuBuilder.button(menu.header, function() {
                updateModelCallback(menu.callback(UIData));
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

    var _UIData      = changeCallbacks.UIData,
        _loadedModel = changeCallbacks.loadedModel,
        UIData       = _UIData(),
        that         = this;

    /*
     * This resets the selected menu to force the refresh to create a new one.
     * This way there won't be any hiccups after the above loops removing everything.
     */
    changeCallbacks.selectedMenu({});

    console.log(UIData)
    /* The sidebar may only update the model as of right now. */
    sidebarRefresh(UIData, sidebarContainer, refresh, changeCallbacks, function(updatedModel) {
        console.log("CREATED NEW NODE?");
        console.log(updatedModel);
        _loadedModel(updatedModel);

        var _selectedMenu = changeCallbacks.selectedMenu;
        var __ = {
            element: _selectedMenu().element
        };
        _selectedMenu(__);

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
