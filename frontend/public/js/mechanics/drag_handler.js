'use strict';

var arithmetics = require('../canvas/arithmetics.js');

module.exports = function(canvas, startCallback, updateCallback, endCallback, missCallback) {
	var active = false;

	var startPos = {x: 0, y: 0};
	var endPos = {x: 0, y: 0};

	var deltaPos = {x: 0, y: 0};

	var mouseDown = function(event) {
		active = true;

		startPos = arithmetics.mouseToCanvas({x: event.clientX, y: event.clientY}, canvas);

		var result = null;
		
		if (missCallback) {
			result = missCallback(startCallback, startPos);
		} else {
			result = startCallback(startPos);
		}

		if (result) {
			if (updateCallback) {
				window.addEventListener('mousemove', mouseMove);
			}

			if (endCallback) {
				window.addEventListener('mouseup', mouseUp);
			}
		}
	};

	canvas.addEventListener('mousedown', mouseDown);

	var mouseMove = function(event) {
		active = true;

		endPos = arithmetics.mouseToCanvas({x: event.clientX, y: event.clientY}, canvas);

		deltaPos.x += endPos.x - startPos.x;
		deltaPos.y += endPos.y - startPos.y;

		startPos.x = endPos.x;
		startPos.y = endPos.y;

		updateCallback(endPos);
	};

	var mouseUp = function(event) {
		active = false;

		endPos = arithmetics.mouseToCanvas({x: event.clientX, y: event.clientY}, canvas);

		window.removeEventListener('mousemove', mouseMove);
		window.removeEventListener('mouseup', mouseUp);

		endCallback(endPos);
	};
};