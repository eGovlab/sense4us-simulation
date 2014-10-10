/**
* @namespace sense4us.graphics
*/

var sense4us = sense4us || {};
sense4us.graphics = sense4us.graphics || {};

/**
* A class to create the graphic for different nodes.
* @class node
*/

sense4us.graphics.node = function(entity, stage) {
	var circle = new createjs.Shape();
	circle.graphics.beginFill("red").drawCircle(0, 0, 50);

	var label = new createjs.Text(entity.id, "bold 14px Arial", "#FFFFFF");
	label.textAlign = "center";
	label.y = -7;

	var that = Object.create(sense4us.graphics.graphic(entity, stage));

	that.container.type = "node";
	that.container.addChild(circle, label);
	that.container.x = that.container.y = 100;

	stage.update();

	return that;
}