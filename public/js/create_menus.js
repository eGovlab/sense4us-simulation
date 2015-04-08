var menu_builder = require('./menu_builder');

function create_menu(container, addNode) {
	var menu = menu_builder.create_menu();
	menu.className = 'menu';
	menu.appendChild(menu.button('Create node', function() {
		addNode();
	}));

	container.appendChild(menu);
}

module.exports = create_menu;