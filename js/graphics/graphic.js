/**
* @namespace sense4us
*/

var sense4us = sense4us || {};
sense4us.graphics = sense4us.graphics || {};

/**
* A class to create the graphic for different entities.
* @class graphic
*/
sense4us.graphics.graphic = function(entity, stage) {
	var container = new createjs.Container();
	container.x = container.y = 0;

	var that = {
		container: function() {
			return container;
		}(),
		entity: function() {
			return entity;
		}()
	}

	container.graphic_object = that;

	return that;
}