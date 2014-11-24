"use strict";

/**
* @namespace sense4us.graphics
*/

(function(ns) {
	ns.graphics = ns.graphics || {};

	/**
	* A class to create the graphic for different nodes.
	* @class node
	*/

	var create_edit_graphics = function(entity, container, color_name) {
		var color = ns.graphics.color;

		var border_circle = new createjs.Shape();
		border_circle.graphics.beginFill(color.get_color("border_" + color_name)).drawCircle(0, 0, color.get_property("border_" + color_name + "_radius"));

		container.signal_label = new createjs.Text("yes is used", "bold 14px Arial", color.get_color("label"));
		container.signal_label.textAlign = "center";
		container.signal_label.x = 3;
		container.signal_label.y = -7;
		container.signal_label.shadow = new createjs.Shadow(color.get_color("label_shadow"), 0, 0, color.get_property("label_shadow_blur"));

		container.name_label = new createjs.Text(entity.id, "bold 14px Arial", color.get_color("label"));
		container.name_label.textAlign = "center";
		container.name_label.y = -64;
		container.name_label.shadow = new createjs.Shadow(color.get_color("label_shadow"), 0, 0, color.get_property("label_shadow_blur"));

		container.addChild(container.name_label);
	};

	var create_view_graphics = function(entity, container, color_name) {
		var color = ns.graphics.color;

		container.signal_label = new createjs.Text("yes is used", "bold 14px Arial", color.get_color("label"));
		container.signal_label.textAlign = "center";
		container.signal_label.x = 3;
		container.signal_label.y = -7;
		container.signal_label.shadow = new createjs.Shadow(color.get_color("label_shadow"), 0, 0, color.get_property("label_shadow_blur"));

		container.name_label = new createjs.Text(entity.id, "bold 14px Arial", color.get_color("label"));
		container.name_label.textAlign = "center";
		container.name_label.y = -64;
		container.name_label.shadow = new createjs.Shadow(color.get_color("label_shadow"), 0, 0, color.get_property("label_shadow_blur"));

		container.addChild(container.signal_label, container.name_label);
	};

	ns.graphics.node = function(entity, stage, color_name) {
		var selected_variable = "signal";

		if(!color_name || ["ORIGIN"].indexOf(color_name.toUpperCase()) === -1)
			color_name = "circle";

		var color = ns.graphics.color;

		var parent = ns.graphics.graphic(entity, stage);
		var that = Object.create(parent);

		that.containers.edit = new createjs.Container();
		that.containers.edit.update = function() {
			that.containers.edit.signal_label.text = (parseFloat(entity[selected_variable])*100).toFixed(1) + "%";
			that.containers.edit.name_label.text = entity.name;
		};

		create_edit_graphics(entity, that.containers.edit, color_name);

		that.containers.view = new createjs.Container();
		that.containers.view.update = function() {
			that.containers.view.signal_label.text = (parseFloat(entity[selected_variable])*100).toFixed(1) + "%";
			that.containers.view.name_label.text = entity.name;
		};

		create_view_graphics(entity, that.containers.view, color_name);

		that.container.type = "node";

		var x = entity.get_x();
		var y = entity.get_y();
		if(x === undefined || y === undefined) {
			x = 100;
			y = 100;
		}

		that.container.x = x;
		that.container.y = y;

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
}(window.sense4us = window.sense4us || {}));