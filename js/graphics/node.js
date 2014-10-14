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
	border_circle.graphics.beginFill(color.get_color("border_circle")).drawCircle(0, 0, color.get_property("border_circle_radius"));

	var circle = new createjs.Shape();
	circle.graphics.beginRadialGradientFill(color.get_gradient("circle"),
		[0, 1], 0, 0, 50, 
		-8, -8, 46).drawCircle(0, 0, color.get_property("circle_radius"));

	var label = new createjs.Text(entity.id, "bold 14px Arial", color.get_color("label"));
	label.textAlign = "center";
	label.y = -7;
	label.shadow = new createjs.Shadow(color.get_color("label_shadow"), 0, 0, color.get_property("label_shadow_blur"));

	var circle_container = new createjs.Container();

	circle_container.addChild(border_circle, circle, label);

	var that = Object.create(sense4us.graphics.graphic(entity, stage));

	that.container.type = "node";
	that.container.addChild(circle_container);

	that.container.x = that.container.y = 100;

	that.update = function() {
		label.text = entity.value;
		that.container.x = parseInt(entity.x);
		that.container.y = parseInt(entity.y);
	}

	entity.set("x", that.container.x);
	entity.set("y", that.container.y);

	stage.update();

	return that;
}