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

	var that = Object.create(sense4us.graphics.graphic(entity, stage));

	that.container.addChild(border_line, line);

	var stroke_line = function(line, color_array, thickness)
	{
		var start_x = entity.get_start().x;
		var start_y = entity.get_start().y;
		var end_x = entity.get_end().x;
		var end_y = entity.get_end().y;

		line.graphics.clear();
		line.graphics.setStrokeStyle(thickness);
		line.graphics.beginRadialGradientStroke(color_array,
			[0, 0.5], start_x, start_y, color.get_property("line_gradiant_radius_inner"), end_x, end_y, color.get_property("line_gradiant_radius_outer"));

		line.graphics.moveTo(start_x, start_y);
		line.graphics.lineTo(end_x, end_y);
		line.graphics.endStroke();
	};

	that.update = function() {
		stroke_line(border_line, color.get_gradient("border_line"), color.get_property("border_line_thickness"));
		stroke_line(line, color.get_gradient("line"), color.get_property("line_thickness"));

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