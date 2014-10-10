/**
* @namespace sense4us.graphics
*/

var sense4us = sense4us || {};
sense4us.graphics = sense4us.graphics || {};

sense4us.graphics.link = function(entity, stage) {
	var line = new createjs.Shape();
	line.graphics.beginStroke("green");
	line.graphics.moveTo(0, 0);
	line.graphics.endStroke();

	var that = Object.create(sense4us.graphics.graphic(entity, stage));

	that.container.addChild(line);

	that.update_line = function() {
		line.graphics.clear();
		line.graphics.setStrokeStyle(5);
		line.graphics.beginStroke("green");
		line.graphics.moveTo(entity.get_start().x, entity.get_start().y);
		line.graphics.lineTo(entity.get_end().x, entity.get_end().y);
		line.graphics.endStroke();

		stage.update();
	}

	that.clear_line = function() {
		line.graphics.clear();

		stage.update();
	}

	that.update_line();

	stage.update();

	return that;
}