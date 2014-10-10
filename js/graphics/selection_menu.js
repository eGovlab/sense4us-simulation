/**
* @namespace sense4us.graphics
*/

var sense4us = sense4us || {};
sense4us.graphics = sense4us.graphics || {};

sense4us.graphics.selection_menu = function(entity, stage) {
	var line = new createjs.Shape();
	line.graphics.beginStroke("green");
	line.graphics.moveTo(0, 0);
	line.graphics.endStroke();

	var circle = new createjs.Shape();
	circle.graphics.beginFill("blue").drawCircle(0, 0, 20);

	var label = new createjs.Text("L", "bold 14px Arial", "#FFFFFF");
	label.textAlign = "center";
	label.y = -7;

	label.mouseEnabled = false;


	var that = Object.create(sense4us.graphics.graphic(entity, stage));

	that.container.set({x: 0, y: 50});
	that.container.addChild(circle, label, line);

	that.update_line = function(x, y) {
		line.graphics.clear();
		line.graphics.setStrokeStyle(5);
		line.graphics.beginStroke("green");
		line.graphics.moveTo(0, 0);
		line.graphics.lineTo(-x, -y);
		line.graphics.endStroke();

		stage.update();
	}

	that.clear_line = function() {
		line.graphics.clear();

		stage.update();
	}

	that.init = function() {}

	stage.update();

	return that;
}