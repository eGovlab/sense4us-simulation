'use strict';

var Immutable = require('Immutable');

var canvas = require('./canvas/');

canvas.init(document.getElementById('canvas'), document.getElementById('container'));

var menu_builder = require('./menu_builder/');
var menu = menu_builder.create_menu();
menu.className = 'menu';
menu.add_button('Create node', function(event) {
	console.log('hej', event);
});

document.getElementById('menu_container').appendChild(menu);

//var selection_menu = require('./selection_menu');

/*sense4us.selection_menu.graphics = sense4us.graphics.selection_menu(sense4us.selection_menu, sense4us.stage);
sense4us.mechanics.selection_menu(sense4us.selection_menu.graphics.dragging_thingy);
*/
/*

sense4us.events.bind('object_updated', function(object) {
	sense4us.stage.update();
});

sense4us.menu.open('edit');
*/