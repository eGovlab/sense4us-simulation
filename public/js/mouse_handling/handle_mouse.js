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
	mouseHandlingMapping.mouseUp   = Immutable.List(mouseUp);

	return handleMouse;
};

/*function MouseHandler() {
	if(!(this instanceof MouseHandler)) {
		throw new Error("handle_mouse.js: Trying to call constructor as generic method.");		
	}

	this.handlers = {};
}

MouseHandler.prototype = {
	addHandler: function(listenTo, handler) {
		var acceptable = [
			"mousedown",
			"mouseup",
			"mousemove"
		];

		listenTo = listenTo.toLowerCase();
		if(acceptable.indexOf(listenTo) === -1) {
			throw new Error("handle_mouse.js: Trying to add handler to invalid event.");
		}

		if(!this.handlers[listenTo]) {
			this.handlers[listenTo] = [];
		}

		this.handlers[listenTo].push(handler);
		return this.handlers[listenTo].length - 1;
	},

	removeHandler: function(listenTo, id) {
		if(!this.handlers[listenTo]) {
			return true;
		}

		this.handlers[listenTo] = this.handlers[listenTo].filter(function(ele, index) {
			if(index === id) {
				return false;
			}

			return true;
		});

		return true;
	},

	handleQueue: function(data) {
		while (data.mouseQueue.size > 0) {
			var mouseEvent = data.mouseQueue.first();

			var eventName = mouseEvent.get('event').toLowerCase();
			if (this.handlers.hasOwnProperty(eventName)) {
				this.handlers[eventName].forEach(function(listOfHandlers) {
					listOfHandlers.forEach(function(handler){
						if (handler.params) {
							var params = handler.params.map(function(param) {
								return data[param];
							});

							console.log(handler.column);
							data[handler.column] = handler.func.apply(null, params.concat(mouseEvent));
						} else {
							console.log(handler.column);
							data[handler.column] = handler.func.call(null, data[handler.column], mouseEvent);
						}
					});
				});
			} else {
				console.log('Unhandled event.', mouseEvent);
			}

			data.mouseQueue = data.mouseQueue.slice(1);
		}

		return data;
	}
};

module.exports = MouseHandler;*/