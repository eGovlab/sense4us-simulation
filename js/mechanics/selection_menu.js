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
		evt.stopPropagation();
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

				if (object.id == container.id || object.id == sense4us.selected_object.graphics.id) {
					continue;
				}

				colliding_object = object;
				break;
			}

			if (colliding_object) {
				var line2 = new createjs.Shape();
				line2.graphics.clear();
				line2.graphics.setStrokeStyle(5);
				line2.graphics.beginStroke("green");
				line2.graphics.moveTo(container.parent.x, container.parent.y);
				line2.graphics.lineTo(colliding_object.x, colliding_object.y);
				line2.graphics.endStroke();
				sense4us.stage.addChild(line2);
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



