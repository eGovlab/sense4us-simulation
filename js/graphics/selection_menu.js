/**
* @namespace sense4us.graphics
*/

var sense4us = sense4us || {};
sense4us.graphics = sense4us.graphics || {};

sense4us.graphics.selection_menu = function(entity, stage) {
	var border_line = new createjs.Shape();
	border_line.graphics.beginStroke("green");
	border_line.graphics.moveTo(0, 0);
	border_line.graphics.endStroke();

	var line = new createjs.Shape();
	line.graphics.beginStroke("green");
	line.graphics.moveTo(0, 0);
	line.graphics.endStroke();

	var border_circle = new createjs.Shape();
	border_circle.graphics.beginFill("#162").drawCircle(0, 0, 12);

	var circle = new createjs.Shape();
	circle.graphics.beginFill("#AE4").drawCircle(0, 0, 10);

	var label = new createjs.Text("L", "bold 12px Arial", "#220");
	label.textAlign = "center";
	label.y = -7;

	label.mouseEnabled = false;

	var that = Object.create(sense4us.graphics.graphic(entity, stage));

	that.container.set({x: -50, y: 50});
	that.container.addChild(border_circle, circle, label);

	var stroke_line = function(x, y, line, color_one, color_two, thickness)
	{
		var start_x = line.x;
		var start_y = line.y;

		line.graphics.clear();
		line.graphics.setStrokeStyle(thickness);

		line.graphics.beginRadialGradientStroke([color_one, color_two],
			[0, 1], start_x, start_y, 20, x, y, 20);

		line.graphics.moveTo(0, 0);
		line.graphics.lineTo(x, y);
		line.graphics.endStroke();
	};

	that.update_line = function(x, y) {
		if (that.container.parent) {
			that.container.parent.addChildAt(border_line, line, 0);

			stroke_line(x, y, border_line, "#39D", "#39D", 12);
			stroke_line(x, y, line, "#F00", "#00F", 7);

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