'use strict';

var Immutable   = require('Immutable'),
    menuBuilder = require('./../menu_builder');

/*var SelectMenu = require('./select_menu.js'),
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
}*/

function createMenu(map, onChangeCallback) {
    var menu = Immutable.Map({
        element: menuBuilder.div()
    });

    menu.get('element').className = 'menu';

    map.forEach(function(value, key) {
        var containerDiv = menuBuilder.div(),
            labelDiv     = menuBuilder.div(),
            inputDiv     = menuBuilder.div();

        labelDiv.appendChild(menuBuilder.label(key));
        inputDiv.appendChild(menuBuilder.input(key, value, function(inputValue, inputKey) {
            onChangeCallback(map.set(inputKey, inputValue));
        }));

        containerDiv.appendChild(labelDiv);
        containerDiv.appendChild(inputDiv);

        menu.get('element').appendChild(containerDiv);
    });

    return menu;
}

module.exports = function drawSelectedMenu(container, menu, map, changeCallback) {
    if (map === null || map === undefined) {
        if (menu !== null) {
            container.removeChild(menu.get('element'));
        }

        return null;
    }

    if (menu === null || menu.get('element') === undefined) {
        menu = createMenu(map, changeCallback);
        menu = menu.set('map_obj', map);

        container.appendChild(menu.get('element'));

        return menu;
    } else if (menu.get('map_obj') !== map) {
        try {
            container.removeChild(menu.get('element'));
        } catch(err) {
            /* Node not found -- continuing. */
        }

        menu = createMenu(map, changeCallback);
        container.appendChild(menu.get('element'));
        menu = menu.set('map_obj', map);

        return menu;
    }

    return menu;
};