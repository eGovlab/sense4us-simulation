'use strict';

var menu_builder = require('./menu_builder');

var draw_selected_menu = function(container, menu, map, changeCallback) {
	var create_menu = function(map) {
		var menu = menu_builder.create_menu();
		menu.className = 'menu';

		map.forEach(function(value, key) {
			var p = menu.p();
			p.appendChild(menu.label(key + ': '));
			var input = menu.input(key, value, function(value, key) {
				changeCallback(map.set(key, value));
			});

			p.appendChild(input);
			menu.appendChild(p);
		});

		return menu;
	};

	if (map === null || map === undefined) {
		if (menu !== null) {
			container.removeChild(menu);
		}

		return null;
	}

	if (menu === null) {
		menu = create_menu(map);
		menu.map_obj = map;

		container.appendChild(menu);

		return menu;
	}

	if (menu.map_obj !== map) {
		container.removeChild(menu);
		menu = create_menu(map);
		container.appendChild(menu);
		menu.map_obj = map;

		return menu;
	}

	return menu;
};

module.exports = draw_selected_menu;