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
		mouseX = (evt.stageX / sense4us.stage.scaleX) - evt.currentTarget.x;
		mouseY = (evt.stageY / sense4us.stage.scaleY) - evt.currentTarget.y;
		sense4us.mechanics.is_dragging = true;
	});

	container.on("pressup", function(evt) {
		evt.stopPropagation();

		graphic_object.clear_line();
		if (moved) {
			var objects = sense4us.stage.getObjectsUnderPoint(((evt.stageX - sense4us.stage.x) / sense4us.stage.scaleX), ((evt.stageY - sense4us.stage.y) / sense4us.stage.scaleY));

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
				sense4us.ui.create_link(sense4us.selected_object, colliding_object.graphic_object.entity, 1, 0);
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

		var new_x = (evt.stageX / sense4us.stage.scaleX) - mouseX;
		var new_y = (evt.stageY / sense4us.stage.scaleY) - mouseY;

		var difference_x = new_x - evt.currentTarget.x;
		var difference_y = new_y - evt.currentTarget.y;

		if (moved || difference_x > 5 || difference_x < -5 || difference_y > 5 || difference_y < -5) {
			evt.currentTarget.x = new_x;
			evt.currentTarget.y = new_y;
			moved = true;

			graphic_object.update_line(new_x, new_y);

			// @TODO: Fix this ugly shit
			sense4us.stage.update();
		}
	});
}



