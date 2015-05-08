'use strict';

var menu_builder = require('./menu_builder');

function CreateMenu() {
	if(!(this instanceof CreateMenu)) {
		throw new Error("Trying to access CreateMenu as a generic method.");
	}

	this.container = null;
}

CreateMenu.prototype = {
	setContainer: function(givenContainer) {
		this.container = givenContainer;
	},

	createMenus: function() {
		var args = Array.prototype.slice.call(arguments);
		var menu = menu_builder.create_menu();
		menu.className = "menu";

		args.forEach(function(obj) {
			menu.appendChild(menu.button(obj.header, obj.callback));
		});

		this.container.appendChild(menu);
	}
};

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

module.exports = new CreateMenu();