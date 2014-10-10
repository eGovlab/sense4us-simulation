/**
* @namespace sense4us.graphics
*/

var sense4us = sense4us || {};
sense4us.graphics = sense4us.graphics || {};

/**
* A class to create the graphic for different entities.
* @class graphic
*/
sense4us.graphics.graphic = function(entity, stage) {
	var container = new createjs.Container();
	container.x = container.y = 100;

	var that = {
		init: function() {
			stage.addChild(container);
			stage.update();
		},
		container: function() {
			return container;
		}(),
		entity: function() {
			return entity;
		}()
	}

	return that;
}