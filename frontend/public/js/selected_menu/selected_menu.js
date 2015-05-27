'use strict';

var menuBuilder = require('./menu_builder');

var createMenu = function(map, callback) {
	var menu = menuBuilder.div();
	menu.className = 'menu';

	map.forEach(function(value, key) {
		var p = menuBuilder.p(),
			labelDiv = menuBuilder.div(),
			inputDiv = menuBuilder.div();

		labelDiv.appendChild(menuBuilder.label(key));
		inputDiv.appendChild(menuBuilder.input(key, value, function(inputValue, inputKey) {
			callback(map.set(inputKey, inputValue));
		}));

		p.appendChild(labelDiv);
		p.appendChild(inputDiv);

		menu.appendChild(p);
	});

	return menu;
};

var drawSelectedMenu = function(container, menu, map, changeCallback) {
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

module.exports = drawSelectedMenu;