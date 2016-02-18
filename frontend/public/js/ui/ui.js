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

    var clearer = menuBuilder.div();
    clearer.style.clear = "right";

    container.appendChild(clearer);
    container.appendChild(inputElement);

    return container;
}

function List() {

}

List.prototype = {

};

//var sidebarRefresh = function(UIData, container, refresh, changeCallbacks, updateModelCallback) {
//var manager = new SidebarManager(CONFIG.get("SIDEBAR_CONTAINER"));
var sidebarRefresh = function(refresh, loadedModel, savedModels, UIData, next) {
    //manager.addSidebar(UIData.sidebar, loadedModel);

    /*if(currentSidebar === UIData.sidebar) {
        return;
    }*/

    return;

    currentSidebar = UIData.sidebar;

    var container = CONFIG.get('SIDEBAR_CONTAINER');
    while(container.firstChild) {
        container.removeChild(container.firstChild);
    }

    var sidebarMenu = document.createElement('div');
    sidebarMenu.className = 'menu';
    container.appendChild(sidebarMenu);

    UIData.sidebar.forEach(function(element) {
        if (element.images) {
            (function() {
                var avatarsElement = selectedMenu.createAvatarButtons('avatar', null, function(key, value) {
                    element.callback(
                        loadedModel,
                        {name:   key}, 
                        {avatar: value}
                    );

                    refresh();
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

function MenuItem(data, loadedModel, savedModels) {
    this.data = data;

    this.header = data.header;
    this.type   = data.type;
    this.callback = data.callback;

    if(data.update) {
        this.update = data.update;
    }

    this.container = menuBuilder.div();
    this.refresh(loadedModel, savedModels);
}

MenuItem.prototype = {
    refresh: function(loadedModel, savedModels) {
        while(this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }

        this.generateItem(loadedModel, savedModels);
    },

    generateItem: function(loadedModel, savedModels) {
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

            button = dd;
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
    resetMenu: function(loadedModel, savedModels) {
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

//var menuRefresh = function(UIData, container, refresh, UIRefresh, changeCallbacks, updateModelCallback) {
var menuRefresh = function(refresh, loadedModel, savedModels, UIData, next) {
    var container = CONFIG.get('MENU_CONTAINER');
    while(container.firstChild) {
        container.removeChild(container.firstChild);
    }

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
                        loadedModel,
                        savedModels,
                        UIData
                    );
                },
                
                function update() {
                    menu.update.call(
                        this,
                        refresh,
                        loadedModel,
                        savedModels,
                        UIData
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

    //next();
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

    /* The sidebar may only update the model as of right now. */
    sidebarRefresh(UIData, sidebarContainer, refresh, changeCallbacks, function(updatedModel) {
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

module.exports = {
    Sidebar:        require("./sidebar"),
    SidebarManager: require("./sidebar_manager"),
    Menu:           Menu,
    UIRefresh:      UIRefresh,
    menuRefresh:    menuRefresh,
    sidebarRefresh: sidebarRefresh
};
