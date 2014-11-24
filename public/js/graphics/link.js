"use strict";
/**
* @namespace sense4us.graphics
*/
(function(ns) {
	ns.graphics = ns.graphics || {};

	var create_edit_graphics = function(entity, container) {
		var color = ns.graphics.color;

		var font_size = 14;

		container.label = new createjs.Text(entity.co, "bold " + font_size + "px Arial", color.get_color("label"));
		container.label.textAlign = "center";
		container.label.shadow = new createjs.Shadow(color.get_color("label_shadow"), 0, 0, color.get_property("label_shadow_blur"));

		container.addChild(container.label);
	};

	ns.graphics.link = function(entity, stage) {
		var color = ns.graphics.color;

		var border_line = new createjs.Shape();
		border_line.graphics.beginStroke("#is_this_even_used");
		border_line.graphics.moveTo(0, 0);
		border_line.graphics.endStroke();

		var line = new createjs.Shape();
		line.graphics.beginStroke("#wat");
		line.graphics.moveTo(0, 0);
		line.graphics.endStroke();

		var font_size = 14;

		var time_label = new createjs.Text(entity.t + "m", "bold " + font_size + "px Arial", color.get_color("label"));
		time_label.textAlign = "center";
		time_label.shadow = new createjs.Shadow(color.get_color("label_shadow"), 0, 0, color.get_property("label_shadow_blur"));

		var character_multiplier = 0.3;
		
		var arrow = new createjs.Text("<", "bold " + font_size + "px Arial", color.get_color("label"));
		arrow.textAlign = "center";
		arrow.shadow = new createjs.Shadow(color.get_color("label_shadow"), 0, 0, color.get_property("label_shadow_blur"));


		var parent = ns.graphics.graphic(entity, stage);
		var that = Object.create(parent);

		that.containers.edit = new createjs.Container();
		that.containers.edit.update = function() {
			this.label.text = entity.co;
			time_label.text = entity.t + "m";

			var link_rotation = Math.atan2(entity.get_start().get_y() - entity.get_end().get_y(),
				entity.get_start().get_x() - entity.get_end().get_x());

			var label_offset_x = 20;
			var label_offset_y = 20;
			
			this.label.x = Math.sin(link_rotation) * label_offset_x;
			this.label.y = -Math.cos(link_rotation) * label_offset_y;

			this.label.x = this.label.x * (String(this.label.text).length + 2) * character_multiplier;
			this.label.y -= font_size / 2;
			
			time_label.x = Math.sin(link_rotation) * -label_offset_x;
			time_label.y = -Math.cos(link_rotation) * -label_offset_y;

			time_label.x = time_label.x * (String(time_label.text).length + 2) * character_multiplier;
			time_label.y -= font_size / 2;

			that.container.x = (entity.get_start().get_x() + entity.get_end().get_x()) * 0.5;
			that.container.y = (entity.get_start().get_y() + entity.get_end().get_y()) * 0.5;

			arrow.x = Math.sin(link_rotation) * label_offset_x * 0.44;
			arrow.y = -Math.cos(link_rotation) * label_offset_y * 0.44;

			arrow.rotation = (link_rotation / Math.PI) * 180;
		};

		create_edit_graphics(entity, that.containers.edit);

		that.containers.view = new createjs.Container();
		that.containers.view.update = function() {
			time_label.text = entity.t + "m";

			var link_rotation = Math.atan2(entity.get_start().get_y() - entity.get_end().get_y(),
				entity.get_start().get_x() - entity.get_end().get_x());

			var label_offset_x = 20;
			var label_offset_y = 20;
			
			time_label.x = Math.sin(link_rotation) * -label_offset_x;
			time_label.y = -Math.cos(link_rotation) * -label_offset_y;

			time_label.x = time_label.x * (String(time_label.text).length + 2) * character_multiplier;
			time_label.y -= font_size / 2;

			that.container.x = (entity.get_start().get_x() + entity.get_end().get_x()) * 0.5;
			that.container.y = (entity.get_start().get_y() + entity.get_end().get_y()) * 0.5;

			arrow.x = Math.sin(link_rotation) * label_offset_x * 0.44;
			arrow.y = -Math.cos(link_rotation) * label_offset_y * 0.44;

			arrow.rotation = (link_rotation / Math.PI) * 180;
		};

		that.containers.current = that.containers.edit;

		that.container.addChild(border_line, line, time_label, arrow);
		that.container.addChild(that.containers.current);

		that.container.x = 0;
		that.container.y = 0;

		var stroke_line = function(line, color_array, thickness)
		{
			var start_x = entity.get_start().get_x() - that.container.x;
			var start_y = entity.get_start().get_y() - that.container.y;
			var end_x = entity.get_end().get_x() - that.container.x;
			var end_y = entity.get_end().get_y() - that.container.y;

			line.graphics.clear();
			line.graphics.setStrokeStyle(thickness);
			
			line.graphics.beginRadialGradientStroke(color_array,
				[0, 1], start_x, start_y, color.get_property("line_gradiant_radius_inner"), end_x, end_y, color.get_property("line_gradiant_radius_outer"));

			line.graphics.moveTo(start_x, start_y);
			line.graphics.lineTo(end_x, end_y);
			line.graphics.endStroke();
		};

		that.update = function() {
			parent.update();

			var co = entity.get("co");

			if(co < 0)
			{
				stroke_line(line, color.get_gradient("line_negative"), color.get_property("line_thickness"));	
			}
			else if(co > 0)
			{
				stroke_line(line, color.get_gradient("line_positive"), color.get_property("line_thickness"));	
			}
			else if(co === 0)
			{
				stroke_line(line, color.get_gradient("line_dead"), color.get_property("line_thickness"));	
			}

			stroke_line(border_line, color.get_gradient("border_line"), color.get_property("border_line_thickness"));

			stage.update();
		};

		that.clear_line = function() {
			border_line.graphics.clear();
			line.graphics.clear();

			stage.update();
		};

		that.update();

		stage.update();

		return that;
	};
}(window.sense4us = window.sense4us || {}));