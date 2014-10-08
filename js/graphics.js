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
	dragger.addEventListener("click", function(event) { sense4us.select_object(node); });

	node.graphic = dragger;

	stage.addChild(dragger);

	var mouseX = 0;
	var mouseY = 0;
	dragger.on("mousedown", function(evt) {
		mouseX = evt.stageX - evt.currentTarget.x;
		mouseY = evt.stageY - evt.currentTarget.y;
	});

	dragger.on("pressmove",function(evt) {
		console.log(evt);
		evt.currentTarget.x = evt.stageX - mouseX;
		evt.currentTarget.y = evt.stageY - mouseY;
		stage.update();   
	});

	stage.update();
}

/**
* The graphic for the menu is stored in this attribute.
* @attribute menu {Object}
*/
sense4us.graphics.menu = function() {
	var menu = new createjs.Shape();
	menu.graphics.beginFill("blue").drawCircle(0, 0, 50);
	menu.set({x: 0, y: 50});

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