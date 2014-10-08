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

	var label = new createjs.Text(node.get("id"), "bold 14px Arial", "#FFFFFF");
	label.textAlign = "center";
	label.y = -7;

	var dragger = new createjs.Container();
	dragger.x = dragger.y = 100;
	dragger.addChild(circle, label);

	node.graphic = dragger;

	stage.addChild(dragger);

	var mouseX = 0;
	var mouseY = 0;
	var show_menu = false;
	dragger.on("mousedown", function(evt) {
		show_menu = true;
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

		if (difference_x > 5 || difference_x < -5 || difference_y > 5 || difference_y < -5) {
			//if (sense4us.selected_object != node) {
				evt.currentTarget.x = new_x;
				evt.currentTarget.y = new_y;

				stage.update();
			//}

			show_menu = false;
		}
	});

	stage.update();
}

/**
* The graphic for the menu is stored in this attribute.
* @attribute menu {Object}
*/
sense4us.graphics.menu = function() {
	var circle = new createjs.Shape();
	circle.graphics.beginFill("blue").drawCircle(0, 0, 20);

	var label = new createjs.Text("L", "bold 14px Arial", "#FFFFFF");
	label.textAlign = "center";
	label.y = -7;

	label.mouseEnabled = false;

	var menu = new createjs.Container();
	menu.addChild(circle, label);
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
		if (moved) {
			objects = menu.parent.getObjectsUnderPoint(evt.currentTarget.x, evt.currentTarget.y);

			var colliding_object = null;
			for (var pos in objects) {
				var object = objects[pos];
				if (object.id == circle.id || object.id == sense4us.selected_object.graphic.id) {
					continue;
				}

				colliding_object = object;
				break;
			}

			if (colliding_object) {
				console.log(colliding_object);
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