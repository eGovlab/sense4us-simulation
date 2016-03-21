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
    Immutable    = null;

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

    var clearer         = menuBuilder.div();
    clearer.style.clear = "right";

    container.appendChild(clearer);
    container.appendChild(inputElement);

    return container;
}

function MenuItem(data, loadedModel, savedModels) {
    this.data = data;

    this.header   = data.header;
    this.type     = data.type;
    this.callback = data.callback;

    if(data.update) {
        this.update = data.update;
    }

    this.container = menuBuilder.div();
    this.refresh(loadedModel, savedModels);
}

MenuItem.prototype = {
    deleteEvents: function() {
        if(!this.button) {
            return;
        }

        this.button.deleteEvents();
    },

    refresh: function(loadedModel, savedModels) {
        this.deleteEvents();
        while(this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }

        this.generateItem(loadedModel, savedModels);
    },

    generateItem: function(loadedModel, savedModels) {
        this.deleteEvents();
        var button;

        var that = this;
        if(this.callback !== undefined && this.update !== undefined) {
            var dd = menuBuilder.dropdown(
                this.header,
                function onClick() {
                    that.callback.call(
                        this,
                        loadedModel,
                        savedModels
                    );
                },
                
                function update() {
                    that.update.call(
                        this,
                        loadedModel,
                        savedModels
                    );
                }
            );

            button              = dd.element;
            button.deleteEvents = dd.deleteEvents;
        } else if (this.callback !== undefined) {
            button = menuBuilder.button(this.header, function(evt) {
                console.log(evt);
                that.callback();
                //updateModelCallback(menu.callback(UIData));
            });
        }

        if(button === null) {
            throw new Error("Invalid button type.");
            return;
        }

        this.button = button;
        this.container.appendChild(button);
    }
};

function Menu(container, data) {
    this.container = menuBuilder.div("menu");
    container.appendChild(this.container);
    this.data      = data;

    this.menuItems = [];
}

Menu.prototype = {
    deleteEvents: function() {
        this.menuItems.forEach(function(item) {
            item.deleteEvents();
        });
    },

    resetMenu: function(loadedModel, savedModels) {
        this.deleteEvents();
        while(this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }

        this.createMenu(loadedModel, savedModels);
    },

    createMenu: function(loadedModel, savedModels) {
        this.data.forEach(function(menuItem) {
            var item = new MenuItem(menuItem, loadedModel, savedModels);
            this.menuItems.push(item);

            this.container.appendChild(item.container);
        }, this);
    }
};

module.exports = {
    Sidebar:        require("./sidebar"),
    SidebarManager: require("./sidebar_manager"),
    Menu:           Menu
    /*UIRefresh:      UIRefresh,
    menuRefresh:    menuRefresh,
    sidebarRefresh: sidebarRefresh*/
};
