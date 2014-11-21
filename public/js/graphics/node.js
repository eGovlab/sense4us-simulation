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

var create_edit_graphics = function(entity, container, color_name) {
	var color = sense4us.graphics.color;

	var border_circle = new createjs.Shape();
	border_circle.graphics.beginFill(color.get_color("border_" + color_name)).drawCircle(0, 0, color.get_property("border_" + color_name + "_radius"));

	container.signal_label = new createjs.Text("yes is used", "bold 14px Arial", color.get_color("label"));
	container.signal_label.textAlign = "center";
	container.signal_label.y = -7;
	container.signal_label.shadow = new createjs.Shadow(color.get_color("label_shadow"), 0, 0, color.get_property("label_shadow_blur"));

	container.name_label = new createjs.Text(entity.id, "bold 14px Arial", color.get_color("label"));
	container.name_label.textAlign = "center";
	container.name_label.y = -75;
	container.name_label.shadow = new createjs.Shadow(color.get_color("label_shadow"), 0, 0, color.get_property("label_shadow_blur"));

	container.addChild(container.signal_label, container.name_label);
};

var create_view_graphics = function(entity, container, color_name) {
	var color = sense4us.graphics.color;

	container.signal_label = new createjs.Text("yes is used", "bold 14px Arial", color.get_color("label"));
	container.signal_label.textAlign = "center";
	container.signal_label.y = -7;
	container.signal_label.shadow = new createjs.Shadow(color.get_color("label_shadow"), 0, 0, color.get_property("label_shadow_blur"));

	container.name_label = new createjs.Text(entity.id, "bold 20px Arial", color.get_color("label"));
	container.name_label.textAlign = "center";
	container.name_label.y = -75;
	container.name_label.shadow = new createjs.Shadow(color.get_color("label_shadow"), 0, 0, color.get_property("label_shadow_blur"));

	container.addChild(container.signal_label, container.name_label);
};

sense4us.graphics.node = function(entity, stage, color_name) {
	var selected_variable = "signal";
	color_name = color_name || "circle";

	var color = sense4us.graphics.color;

	var parent = sense4us.graphics.graphic(entity, stage);
	var that = Object.create(parent);

	that.containers.edit = new createjs.Container();
	that.containers.edit.update = function() {
		that.containers.edit.signal_label.text = (parseFloat(entity[selected_variable])*100).toFixed(2) + "%";
		that.containers.edit.name_label.text = entity.name;
	};

	create_edit_graphics(entity, that.containers.edit, color_name);

	that.containers.view = new createjs.Container();
	that.containers.view.update = function() {
		that.containers.view.signal_label.text = (parseFloat(entity[selected_variable])*100).toFixed(2) + "%";
		that.containers.view.name_label.text = entity.name;
	};

	create_view_graphics(entity, that.containers.view, color_name);

	that.container.type = "node";

	that.container.x = that.container.y = 100;

	that.containers.current = that.containers.edit;

	var border_circle = new createjs.Shape();
	border_circle.graphics.beginFill(color.get_color("border_" + color_name)).drawCircle(0, 0, color.get_property("border_" + color_name + "_radius"));

	var circle = new createjs.Shape();
	circle.graphics.beginRadialGradientFill(color.get_gradient(color_name),
		[0, 1], 0, 0, 50, 
		-8, -8, 46).drawCircle(0, 0, color.get_property(color_name + "_radius"));

	that.container.addChild(border_circle, circle);
	that.container.addChild(that.containers.current);

	that.update = function() {
		parent.update();

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