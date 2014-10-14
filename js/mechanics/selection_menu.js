/**
* @namespace sense4us.mechanics
*/

var sense4us = sense4us || {};
sense4us.mechanics = sense4us.mechanics || {};


sense4us.mechanics.selection_menu = function(graphic_object) {
	var startX = 0;
	var startY = 0;
	var mouseX = 0;
	var mouseY = 0;
	var moved = false;

	var container = graphic_object.container;

	container.on("mousedown", function(evt) {
		moved = false;
		startX = evt.currentTarget.x;
		startY = evt.currentTarget.y;
		mouseX = evt.stageX - evt.currentTarget.x;
		mouseY = evt.stageY - evt.currentTarget.y;
	});

	container.on("pressup", function(evt) {
		evt.stopPropagation();

		graphic_object.clear_line();
		if (moved) {
			console.log();
			var objects = sense4us.stage.getObjectsUnderPoint(evt.stageX, evt.stageY);

			var colliding_object = null;
			for (var pos in objects) {
				var object = objects[pos];
				while (object.parent != null && object.parent != sense4us.stage) {
					object = object.parent;
				}

				if (object.type != "node") {
					continue;
				}

				if (object.id == container.circle.id || object.id == sense4us.selected_object.graphics.container.id) {
					continue;
				}

				colliding_object = object;
				break;
			}

			if (colliding_object) {
				create_link(sense4us.selected_object, colliding_object.graphic_object.entity);
			}

			container.x = startX;
			container.y = startY;

			// @TODO: Fix this ugly shit
			sense4us.stage.update();
		}

		moved = false;
	});

	container.on("pressmove", function(evt) {
		evt.stopPropagation();

		var new_x = evt.stageX - mouseX;
		var new_y = evt.stageY - mouseY;

		var difference_x = new_x - evt.currentTarget.x;
		var difference_y = new_y - evt.currentTarget.y;

		if (difference_x > 5 || difference_x < -5 || difference_y > 5 || difference_y < -5) {
			evt.currentTarget.x = new_x;
			evt.currentTarget.y = new_y;
			moved = true;

			graphic_object.update_line(new_x, new_y);

			// @TODO: Fix this ugly shit
			sense4us.stage.update();
		}
	});
}



