var sense4us = sense4us || {};

sense4us.events = function(object) {
	var events = {};

	var that = {
		trigger: function(event, data) {
			if (events[event] == null) {
				return;
			}

			for (var pos in events[event]) {
				var callback = events[event][pos];
				callback(data);
			}
		},
		bind: function(event, callback) {
			events[event] = events[event] || [];
			events[event].push(callback);
		}
	};

	return that;
}();