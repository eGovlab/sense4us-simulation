'use strict';

var arithmetics = require('../canvas/arithmetics.js');

module.exports = function(canvas, loadedModel, environment, startCallback, updateCallback, endCallback, missCallback) {
	var active = false;

	var startPos = {x: 0, y: 0},
		endPos   = {x: 0, y: 0},
		lastPos  = {x: 0, y: 0};

	var deltaPos = {x: 0, y: 0};

	var mouseDown = function(event) {
		active = true;

		startPos = arithmetics.mouseToCanvas({x: event.clientX, y: event.clientY}, canvas);
		lastPos = {x: startPos.x, y: startPos.y};

		var result = startCallback(canvas, loadedModel, environment, startPos);
		loadedModel.propagate();

		if (result) {
			if (updateCallback) {
				window.addEventListener('mousemove', mouseMove);
			}

			if (endCallback) {
				window.addEventListener('mouseup', mouseUp);
			}
		} else if (missCallback) {
			missCallback(canvas, loadedModel, environment, startPos);
		}
	};

	canvas.addEventListener('mousedown', mouseDown);

	var mouseMove = function(event) {
		active = true;

		endPos = arithmetics.mouseToCanvas({x: event.clientX, y: event.clientY}, canvas);

		deltaPos.x = lastPos.x - endPos.x;
		deltaPos.y = lastPos.y - endPos.y;

		startPos.x = endPos.x;
		startPos.y = endPos.y;

		updateCallback(canvas, loadedModel, environment, endPos, deltaPos);
		loadedModel.propagate();
		
		lastPos = {x: endPos.x, y: endPos.y};
	};

	var mouseUp = function(event) {
		active = false;

		endPos = arithmetics.mouseToCanvas({x: event.clientX, y: event.clientY}, canvas);

		window.removeEventListener('mousemove', mouseMove);
		window.removeEventListener('mouseup', mouseUp);

		endCallback(canvas, loadedModel, environment, endPos);
		loadedModel.propagate();
	};
};