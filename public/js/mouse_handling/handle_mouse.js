'use strict';

var Immutable = require('Immutable');

var mouseHandlingMapping = {
	'mouseDown': null,
	'mouseUp': null,
	'mouseMove': null
};

function handleMouse(data) {
	while (data.mouseQueue.size > 0) {
		var mouseEvent = data.mouseQueue.first();

		if (mouseHandlingMapping.hasOwnProperty(mouseEvent.get('event'))) {
			mouseHandlingMapping[mouseEvent.get('event')].forEach(
				function(handler) {
					if (handler.params) {
						var params = handler.params.map(function(param) {
							return data[param];
						});

						data[handler.column] = handler.func.apply(null, params.concat(mouseEvent));
					} else {
						data[handler.column] = handler.func.call(null, data[handler.column], mouseEvent);
					}
				}
			);
		} else {
			console.log('Unhandled event.', mouseEvent);
		}

		data.mouseQueue = data.mouseQueue.slice(1);
	}

	return data;
}

module.exports = function(mouseDown, mouseMove, mouseUp) {
	mouseHandlingMapping.mouseDown = Immutable.List(mouseDown);
	mouseHandlingMapping.mouseMove = Immutable.List(mouseMove);
	mouseHandlingMapping.mouseUp = Immutable.List(mouseUp);

	return handleMouse;
};