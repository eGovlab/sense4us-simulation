'use strict';

var SelectMenu = require('./select_menu.js');

function createMenu(map, callback) {
    var menu = new SelectMenu();

    map.forEach(function(value, key) {
        menu.addInput(key, value, function(cbKey, cbValue){callback(map.set(cbKey, cbValue))});
    });

    return menu.element;
}

module.exports = function drawSelectedMenu(container, menu, map, changeCallback) {
    if (map === null || map === undefined) {
        if (menu !== null) {
            container.removeChild(menu);
        }

        return null;
    }

    if (menu === null) {
        menu = createMenu(map, changeCallback);
        menu.map_obj = map;

        container.appendChild(menu);

        return menu;
    }

    if (menu.map_obj !== map) {
        container.removeChild(menu);
        menu = createMenu(map, changeCallback);
        container.appendChild(menu);
        menu.map_obj = map;

        return menu;
    }

    return menu;
};