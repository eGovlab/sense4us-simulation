"use strict";
/**
* @namespace sense4us.graphics
*/

var sense4us = sense4us || {};
sense4us.graphics = sense4us.graphics || {};

sense4us.graphics.selection_menu = function(entity, stage) {
	var color = sense4us.graphics.color;

	var line_x = null;
	var line_y = null;

	var border_line = new createjs.Shape();
	border_line.graphics.beginStroke("green");

	var line = new createjs.Shape();
	line.graphics.beginStroke("green");

	var parent = sense4us.graphics.graphic(entity, stage);
	var that = Object.create(parent);

	var border_circle = new createjs.Shape();
	border_circle.graphics.beginFill(color.get_color("selection_border_circle")).drawCircle(0, 0, color.get_property("selection_border_circle_radius"));

	var circle = new createjs.Shape();
	circle.graphics.beginFill(color.get_color("selection_circle")).drawCircle(0, 0, color.get_property("selection_circle_radius"));

	var label = new createjs.Text("L", "bold 12px Arial", color.get_color("label"));
	label.textAlign = "center";
	label.y = -7;
	label.shadow = new createjs.Shadow(color.get_color("label_shadow"), 0, 0, color.get_property("selection_label_shadow_blur"));

	label.mouseEnabled = false;

	var input_field = sense4us.graphics.floating_input_field(entity, stage);

	that.container.set({x: -15, y: -10});

	that.containers.edit = new createjs.Container();
	that.containers.edit.addChild(border_circle, circle, label);
	that.containers.edit.update = function(x, y) {
		if (that.container.parent) {
			input_field.set_entity(that.container.parent.graphic_object.entity);
			input_field.show();
			input_field.update();

			if (x !== undefined && y !== undefined) {
				this.x = x;
				this.y = y;
				that.container.parent.addChildAt(border_line, line, 0);

				stroke_line(this.x, this.y, border_line, color.get_gradient("border_line"), color.get_property("border_line_thickness"));
				stroke_line(this.x, this.y, line, color.get_gradient("line_positive"), color.get_property("line_thickness"));
			} else {
				that.clear_line();
				this.reset();
			}
		}
	};
	that.containers.edit.reset = function() {
		that.containers.edit.set({x: -40, y: 50});
	};

	that.containers.view = new createjs.Container();
	that.containers.view.update = function() {
		if (that.container.parent) {
			if (that.container.parent.graphic_object.entity.get("node_type") == "origin") {
				input_field.set_entity(that.container.parent.graphic_object.entity);
				input_field.show();
				input_field.update();
			}
		}
	};

	that.containers.current = that.containers.edit;
	that.container.addChild(input_field.container, that.containers.edit);

	var stroke_line = function(x, y, line, color_array, thickness)
	{
		line.graphics.clear();
		line.graphics.setStrokeStyle(thickness);

		line.graphics.beginRadialGradientStroke(color_array,
			[0, 1], 0, 0, color.get_property("line_gradiant_radius_inner"), x, y, color.get_property("line_gradiant_radius_outer"));

		line.graphics.moveTo(0, 0);
		line.graphics.lineTo(x + that.container.x, y + that.container.y);
		line.graphics.endStroke();
	};

	that.update = function() {
		if (that.container.parent) {
			parent.update();
		} else {
			input_field.hide();
		}
	};

	that.clear_line = function() {
		line.graphics.clear();
		border_line.graphics.clear();
		line_x = null;
		line_y = null;

		stage.update();
	};

	that.dragging_thingy = (function() {
		return that.containers.edit;
	})();

	stage.update();

	return that;
};