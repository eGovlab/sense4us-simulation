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
			mouseHandlingMapping[mouseEvent.get('event')].forEach(function(func) { data = func(mouseEvent, data); });
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