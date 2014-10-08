/**
* @namespace sense4us
*/

var sense4us = sense4us || {};

/**
* This is an event handler, meaning that we can bind a callback
* to an event.
* This will then be called when we run the trigger-function.
* This is basically a static function, so it's accessible from any place
* using sense4us.
* @class events
* @constructor
* @example We want the function eatPizza(pizza) to be called
* on the event "pizzaDelivered":
* @example sense4us.events.bind("pizzaDelivered", eatPizza);
* @example To trigger the event:
* @example sense4us.events.trigger("pizzaDelivered", pizzaObject);
*/
sense4us.events = function() {
	var events_and_callbacks = {};

	var that = {
		/**
		* Bind a callback to an event. When the event is triggered, all callbacks
		* bound to the event will be called.
		* @method bind
		* @param event {String} Name of the event.
		* @param callback {Function} The callback to be called when event is triggered.
		*/
		bind: function(event, callback) {
			events_and_callbacks[event] = events_and_callbacks[event] || [];
			events_and_callbacks[event].push(callback);
		},
		/**
		* When an event is triggered, run all relevant callbacks with the data specified.
		* @method trigger
		* @param event {String} Name of the event that is triggered.
		* @param data {Object} Object that is passed into the callback.
		*/
		trigger: function(event, data) {
			if (events_and_callbacks[event] == null) {
				return;
			}

			for (var pos in events_and_callbacks[event]) {
				var callback = events_and_callbacks[event][pos];
				callback(data);
			}
		}
	};

	return that;
}();