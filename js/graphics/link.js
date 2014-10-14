/**
* @namespace sense4us.graphics
*/

var sense4us = sense4us || {};
sense4us.graphics = sense4us.graphics || {};

sense4us.graphics.link = function(entity, stage) {
	var color = sense4us.graphics.color;

	var border_line = new createjs.Shape();
	border_line.graphics.beginStroke("#is_this_even_used");
	border_line.graphics.moveTo(0, 0);
	border_line.graphics.endStroke();

	var line = new createjs.Shape();
	line.graphics.beginStroke("#wat");
	line.graphics.moveTo(0, 0);
	line.graphics.endStroke();

	var font_size = 14;

	var arrow_offset = 0;

	var label = new createjs.Text(entity.co, "bold " + font_size + "px Arial", color.get_color("label"));
	label.textAlign = "center";
	label.shadow = new createjs.Shadow(color.get_color("label_shadow"), 0, 0, color.get_property("label_shadow_blur"));

	var character_multiplier = 0.4;

	
	var arrow = new createjs.Text("<", "bold " + font_size + "px Arial", color.get_color("label"));
	arrow.textAlign = "center";


	var that = Object.create(sense4us.graphics.graphic(entity, stage));

	that.container.addChild(border_line, line, label, arrow);

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
		label.text = entity.co;

		var link_rotation = Math.atan2(entity.get_start().get_y() - entity.get_end().get_y(),
			entity.get_start().get_x() - entity.get_end().get_x());

		var label_offset_x = 20;
		var label_offset_y = 20;
		
		label.x = Math.sin(link_rotation) * label_offset_x;
		label.y = -Math.cos(link_rotation) * label_offset_y;

		label.x = label.x * (label.text.length+1) * character_multiplier;
		label.y -= font_size / 2;

		that.container.x = (entity.get_start().get_x() + entity.get_end().get_x()) * 0.5;
		that.container.y = (entity.get_start().get_y() + entity.get_end().get_y()) * 0.5;

		arrow.x = Math.sin(link_rotation) * label_offset_x * 0.44;
		arrow.y = -Math.cos(link_rotation) * label_offset_y * 0.44;

		arrow.rotation = (link_rotation / Math.PI) * 180;

		var co = entity.get("co");

		if(co < 0)
		{
			stroke_line(line, color.get_gradient("line_negative"), color.get_property("line_thickness"));	
		}
		else if(co > 0)
		{
			stroke_line(line, color.get_gradient("line_positive"), color.get_property("line_thickness"));	
		}
		else if(co == 0)
		{
			stroke_line(line, color.get_gradient("line_dead"), color.get_property("line_thickness"));	
		}

		stroke_line(border_line, color.get_gradient("border_line"), color.get_property("border_line_thickness"));

		stage.update();
	}

	that.clear_line = function() {
		border_line.graphics.clear();
		line.graphics.clear();

		stage.update();
	}

	that.update();

	stage.update();

	return that;
}