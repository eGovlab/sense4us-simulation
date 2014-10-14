/**
* @namespace sense4us.mechanics
*/

var sense4us = sense4us || {};
sense4us.mechanics = sense4us.mechanics || {};

/**
* A class to make objects draggable
* @class draggable
*/
sense4us.mechanics.draggable = function(graphic_object) {
	var mouseX = 0;
	var mouseY = 0;
	var show_menu = false;

	var container = graphic_object.container;

	container.on("mousedown", function(evt) {
		show_menu = true;
		// Set mouseX & mouseY to the mouse position relative to the clicked object
		mouseX = evt.stageX - evt.currentTarget.x;
		mouseY = evt.stageY - evt.currentTarget.y;
	});

	container.on("pressup", function(evt) {
		if (show_menu) {
			sense4us.select_object(graphic_object.entity);
		}
		show_menu = false;

		sense4us.events.trigger("object_released", graphic_object.entity);
	});

	container.on("pressmove", function(evt) {
		var new_x = evt.stageX - mouseX;
		var new_y = evt.stageY - mouseY;

		var difference_x = new_x - evt.currentTarget.x;
		var difference_y = new_y - evt.currentTarget.y;

		if (!show_menu || difference_x > 5 || difference_x < -5 || difference_y > 5 || difference_y < -5) {

			graphic_object.entity.set("x", new_x);
			graphic_object.entity.set("y", new_y);
			
			graphic_object.entity.events.trigger("update", graphic_object.entity);

			show_menu = false;
		}
	});
}

sense4us.events.bind("object_released", function(object)
{
	sense4us.inspector.inspect(object);
});