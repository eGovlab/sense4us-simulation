/**
* @namespace sense4us.graphics
*/

var sense4us = sense4us || {};
sense4us.graphics = sense4us.graphics || {};

sense4us.graphics.selection_menu = function(entity, stage) {
	var color = sense4us.graphics.color;

	var border_line = new createjs.Shape();
	border_line.graphics.beginStroke("green");
	border_line.graphics.moveTo(0, 0);
	border_line.graphics.endStroke();

	var line = new createjs.Shape();
	line.graphics.beginStroke("green");
	line.graphics.moveTo(0, 0);
	line.graphics.endStroke();

	var border_circle = new createjs.Shape();
	border_circle.graphics.beginFill(color.get_color("selection_border_circle")).drawCircle(0, 0, color.get_property("selection_border_circle_radius"));

	var circle = new createjs.Shape();
	circle.graphics.beginFill(color.get_color("selection_circle")).drawCircle(0, 0, color.get_property("selection_circle_radius"));

	var label = new createjs.Text("L", "bold 12px Arial", color.get_color("label"));
	label.textAlign = "center";
	label.y = -7;
	label.shadow = new createjs.Shadow(color.get_color("label_shadow"), 0, 0, color.get_property("selection_label_shadow_blur"));

	label.mouseEnabled = false;

	var that = Object.create(sense4us.graphics.graphic(entity, stage));

	that.container.set({x: -55, y: 55});
	that.container.addChild(border_circle, circle, label);

	var stroke_line = function(x, y, line, color_array, thickness)
	{
		var start_x = line.x;
		var start_y = line.y;

		line.graphics.clear();
		line.graphics.setStrokeStyle(thickness);

		line.graphics.beginRadialGradientStroke(color_array,
			[0, 1], start_x, start_y, color.get_property("line_gradiant_radius_inner"), x, y, color.get_property("line_gradiant_radius_outer"));

		line.graphics.moveTo(0, 0);
		line.graphics.lineTo(x, y);
		line.graphics.endStroke();
	};

	that.update_line = function(x, y) {
		if (that.container.parent) {
			that.container.parent.addChildAt(border_line, line, 0);

			stroke_line(x, y, border_line, color.get_gradient("border_line"), color.get_property("border_line_thickness"));
			stroke_line(x, y, line, color.get_gradient("line"), color.get_property("line_thickness"));

			stage.update();
		}
	}

	that.clear_line = function() {
		line.graphics.clear();
		border_line.graphics.clear();

		stage.update();
	}

	that.container.circle = function() {
		return circle;
	}()

	stage.update();

	return that;
}