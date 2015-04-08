/**
* @namespace sense4us.mechanics
*/

var sense4us = sense4us || {};
sense4us.mechanics = sense4us.mechanics || {};

/**
* A class to make objects selectable
* @class selectable
*/
sense4us.mechanics.selectable = function(graphic_object) {
	var select = false;

	var container = graphic_object.container;

	container.on("mousedown", function(evt) {
		select = true;
	});

	container.on("pressup", function(evt) {
		if (select) {
			sense4us.select_object(graphic_object.entity);
		}
	});
}