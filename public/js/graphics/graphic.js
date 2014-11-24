"use strict";

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

	var containers = {};

	var last_mode = null;

	var that = {
		container: function() {
			return container;
		}(),
		containers: function() {
			return containers;
		}(),
		update: function() {
			if (stage.mode != last_mode && that.containers.hasOwnProperty(stage.mode)) {
				that.container.removeChild(that.containers.current);
				that.containers.current = that.containers[stage.mode];
				that.container.addChild(that.containers.current);
			}

			that.containers.current.update.call(that.containers.current, arguments);
		},
		entity: function() {
			return entity;
		}(),
		destroy: function() {
			stage.removeChild(container);
			stage.update();
		}
	};

	container.graphic_object = that;

	return that;
};