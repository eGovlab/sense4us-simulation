"use strict";

/**
* @namespace sense4us.graphics
*/

var sense4us = sense4us || {};
sense4us.graphics = sense4us.graphics || {};

/**
* A class to create the graphic for different nodes.
* @class node
*/

sense4us.graphics.node = function(entity, stage, color_name) {
	color_name = color_name || "circle";
	var selected_variable = "signal";

	var color = sense4us.graphics.color;

	var border_circle = new createjs.Shape();
	border_circle.graphics.beginFill(color.get_color("border_" + color_name)).drawCircle(0, 0, color.get_property("border_" + color_name + "_radius"));

	var circle = new createjs.Shape();
	circle.graphics.beginRadialGradientFill(color.get_gradient(color_name),
		[0, 1], 0, 0, 50, 
		-8, -8, 46).drawCircle(0, 0, color.get_property(color_name + "_radius"));

	var signal_label = new createjs.Text("yes is used", "bold 14px Arial", color.get_color("label"));
	signal_label.textAlign = "center";
	signal_label.y = -7;
	signal_label.shadow = new createjs.Shadow(color.get_color("label_shadow"), 0, 0, color.get_property("label_shadow_blur"));

	var name_label = new createjs.Text(entity.id, "bold 14px Arial", color.get_color("label"));
	name_label.textAlign = "center";
	name_label.y = -75;
	name_label.shadow = new createjs.Shadow(color.get_color("label_shadow"), 0, 0, color.get_property("label_shadow_blur"));

	var circle_container = new createjs.Container();

	circle_container.addChild(border_circle, circle, signal_label, name_label);

	var that = Object.create(sense4us.graphics.graphic(entity, stage));

	that.container.type = "node";
	that.container.addChild(circle_container);

	that.container.x = that.container.y = 100;

	that.update = function() {
		signal_label.text = (parseFloat(entity[selected_variable])*100).toFixed(2) + "%";
		name_label.text = entity.name;
		that.container.x = parseInt(entity.x);
		that.container.y = parseInt(entity.y);
	};

	that.set_variable = function(name) {
		selected_variable = name;
	};

	entity.set("x", that.container.x);
	entity.set("y", that.container.y);

	that.update();
	stage.update();

	return that;
};