'use strict';

module.exports = {
	create_menu: function() {
		var menu = document.createElement('div');

		menu.button = function(text, callback) {
			var button = document.createElement('button');
			button.addEventListener('click', callback);
			button.appendChild(document.createTextNode(text));
			
			return button;
		};
		
		menu.input = function(key, value, callback) {
			var input = document.createElement('input');
			input.addEventListener('change', function(event) {callback(input.value, input.name);});
			input.name = key;
			input.value = value;
			
			return input;
		};
		
		menu.label = function(key) {
			var label = document.createElement('label');
			label.appendChild(document.createTextNode(key));
			label.htmlFor = key;
			
			return label;
		};

		menu.p = function() {
			var p = document.createElement('p');
			menu.appendChild(p);

			return p;
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