/**
* @namespace sense4us
*/

var sense4us = sense4us || {};

/**
* A class to create the graphic for different objects.
* @class graphics
*/
sense4us.graphics = sense4us.graphics || {};

/**
* A function to create the graphic for nodes.
* @method node
* @param node {Node} The node for which to add graphics
* @param stage {createjs.Stage} The stage that the graphic is displayed on.
*/
sense4us.graphics.node = function(node, stage) {
	var circle = new createjs.Shape();
	circle.graphics.beginFill("red").drawCircle(0, 0, 50);

	var label = new createjs.Text(node.id, "bold 14px Arial", "#FFFFFF");
	label.textAlign = "center";
	label.y = -7;

	var dragger = new createjs.Container();
	dragger.x = dragger.y = 100;
	dragger.addChild(circle, label);
	dragger.type = "node";

	node.graphic = dragger;

	stage.addChild(dragger);
	stage.update();

	var mouseX = 0;
	var mouseY = 0;
	var show_menu = false;
	dragger.on("mousedown", function(evt) {
		show_menu = true;
		// Set mouseX & mouseY to the mouse position relative to the clicked object
		mouseX = evt.stageX - evt.currentTarget.x;
		mouseY = evt.stageY - evt.currentTarget.y;

	});

	dragger.on("pressup", function(evt) {
		if (show_menu) {
			sense4us.select_object(node);
		}
		show_menu = false;
	});

	dragger.on("pressmove",function(evt) {
		var new_x = evt.stageX - mouseX;
		var new_y = evt.stageY - mouseY;

		var difference_x = new_x - evt.currentTarget.x;
		var difference_y = new_y - evt.currentTarget.y;

		if (!show_menu || difference_x > 5 || difference_x < -5 || difference_y > 5 || difference_y < -5) {
			evt.currentTarget.x = new_x;
			evt.currentTarget.y = new_y;

			stage.update();

			show_menu = false;
		}
	});
}

/**
* The graphic for the menu is stored in this attribute.
* @attribute menu {Object}
*/
sense4us.graphics.menu = function() {
	var line = new createjs.Shape();
	line.graphics.beginStroke("green");
	line.graphics.moveTo(0, 0);
	line.graphics.endStroke();

	var circle = new createjs.Shape();
	circle.graphics.beginFill("blue").drawCircle(0, 0, 20);

	var label = new createjs.Text("L", "bold 14px Arial", "#FFFFFF");
	label.textAlign = "center";
	label.y = -7;

	label.mouseEnabled = false;

	var menu = new createjs.Container();
	menu.addChild(line, circle, label);
	menu.set({x: 0, y: 50});

	var startX = 0;
	var startY = 0;
	var mouseX = 0;
	var mouseY = 0;
	var moved = false;

	menu.on("mousedown", function(evt) {
		evt.stopPropagation();
		moved = false;
		startX = evt.currentTarget.x;
		startY = evt.currentTarget.y;
		mouseX = evt.stageX - evt.currentTarget.x;
		mouseY = evt.stageY - evt.currentTarget.y;
	});

	menu.on("pressup", function(evt) {
		evt.stopPropagation();

			line.graphics.clear();
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

				if (object.id == menu.id || object.id == sense4us.selected_object.graphic.id) {
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
				line2.graphics.moveTo(menu.parent.x, menu.parent.y);
				line2.graphics.lineTo(colliding_object.x, colliding_object.y);
				line2.graphics.endStroke();
				sense4us.stage.addChild(line2);
			}

			menu.x = startX;
			menu.y = startY;

			// @TODO: Fix this ugly shit
			sense4us.stage.update();
		}

		moved = false;
	});

	menu.on("pressmove", function(evt) {
		evt.stopPropagation();

		var new_x = evt.stageX - mouseX;
		var new_y = evt.stageY - mouseY;

		var difference_x = new_x - evt.currentTarget.x;
		var difference_y = new_y - evt.currentTarget.y;

		if (difference_x > 5 || difference_x < -5 || difference_y > 5 || difference_y < -5) {
			evt.currentTarget.x = new_x;
			evt.currentTarget.y = new_y;
			moved = true;

			line.graphics.clear();
			line.graphics.setStrokeStyle(5);
			line.graphics.beginStroke("green");
			line.graphics.moveTo(0, 0);
			line.graphics.lineTo(-new_x, -new_y);
			line.graphics.endStroke();

			// @TODO: Fix this ugly shit
			sense4us.stage.update();
		}
	});

	var that = {
		update: function(parent, stage) {
			if (menu.parent != null) {
				menu.parent.removeChild(menu);
			}

			parent.addChild(menu);

			stage.update();
		},
		clear: function(stage) {
			if (menu.parent != null) {
				menu.parent.removeChild(menu);
			}

			stage.update();
		}
	};

	return that;
}();