'use strict';

var SelectMenu = require('./select_menu.js'),
    buttons    = require('./buttons.js');

function createMenu(map, callback) {
    var menu = new SelectMenu();

    map.forEach(function(value, key) {
        if (key === 'avatar' || key === 'icon') {
            menu.addAvatarSelector(key, value, function(cbKey, cbValue){callback(map.set(cbKey, cbValue))});
            return;
        }
        
        menu.addInput(key, value, function(cbKey, cbValue){callback(map.set(cbKey, cbValue))});
    });

    var wrappedButtons = buttons.map(function(button) {
        if(button.onClick && typeof button.onClick === 'function') {
            var wrapper = button.onClick.bind(map);

            button.callback = function(e) {
                var r = wrapper();
                if(window.Immutable.Map.isMap(r)) {
                    callback(r);
                }
            };
        }

        return button;
    });

    menu.addButton(wrappedButtons);

    return menu;
}

module.exports = function drawSelectedMenu(container, menu, map, changeCallback) {
    if (map === null || map === undefined) {
        if (menu !== null) {
            menu.reset();
            container.removeChild(menu.element);
        }

        return null;
    }

    if (menu === null) {
        menu = createMenu(map, changeCallback);
        menu.map_obj = map;

        container.appendChild(menu.element);

        return menu;
    } else if (menu.map_obj !== map) {
        menu.reset();
        container.removeChild(menu.element);

        menu = createMenu(map, changeCallback);
        container.appendChild(menu.element);
        menu.map_obj = map;

        return menu;
    }

    return menu;
};