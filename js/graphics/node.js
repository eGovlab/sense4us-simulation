/**
* @namespace sense4us.graphics
*/

var sense4us = sense4us || {};
sense4us.graphics = sense4us.graphics || {};

/**
* A class to create the graphic for different nodes.
* @class node
*/

sense4us.graphics.node = function(entity, stage) {
	var color = sense4us.graphics.color;

	var border_circle = new createjs.Shape();
	border_circle.graphics.beginFill(color.get_color("border_circle")).drawCircle(0, 0, 52);

	var circle = new createjs.Shape();
	circle.graphics.beginRadialGradientFill(color.get_gradient("circle"),
		[0, 1], 25, 25, 50, 
		-25, -25, 50).drawCircle(0, 0, 50);

	var label = new createjs.Text(entity.signal, "bold 14px Arial", "#FAFAFA");
	label.textAlign = "center";
	label.y = -7;

	var circle_container = new createjs.Container();

	circle_container.addChild(border_circle, circle, label);

	var that = Object.create(sense4us.graphics.graphic(entity, stage));

	that.container.type = "node";
	that.container.addChild(circle_container);

	that.container.x = that.container.y = 100;

	that.update = function() {
		label.text = entity.signal;
		that.container.x = parseInt(entity.x);
		that.container.y = parseInt(entity.y);
	}

	entity.set("x", that.container.x);
	entity.set("y", that.container.y);

	stage.update();

	return that;
}