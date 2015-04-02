'use strict';

module.exports = {
	create_menu: function() {
		var menu = document.createElement('div');
		
		menu.add_button = function(text, callback) {
			var button = document.createElement('button');
			button.addEventListener('click', callback);
			button.appendChild(document.createTextNode(text));
			menu.appendChild(button);
		}

		return menu;
	}
};

/*
	<form id='sense4us_import_json' action='/model'>
		<input type='file' />
		<input type='submit' class='button' value='Import (.json)' />
	</form>
	<input type='button' class='button' onclick='sense4us.ui.create_origin_node(null, 0, 0);' value='Create origin' />
	<input type='button' class='button' onclick='sense4us.ui.create_node(null, 0, 0);' value='Create node' />
*/