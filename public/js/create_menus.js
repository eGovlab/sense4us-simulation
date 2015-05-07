'use strict';

var menu_builder = require('./menu_builder');

function create_menu(container, addNode, addOrigin, addActor, sendData) {
	var menu = menu_builder.create_menu();
	menu.className = 'menu';
	
	menu.appendChild(menu.button('Create node', function() {
		addNode();
	}));
	
	menu.appendChild(menu.button('Create origin', function() {
		addOrigin();
	}));
	
	menu.appendChild(menu.button('Create actor', function() {
		addActor();
	}));
	
	menu.appendChild(menu.button('Send data', function() {
		sendData();
	}));

	container.appendChild(menu);
}

module.exports = create_menu;