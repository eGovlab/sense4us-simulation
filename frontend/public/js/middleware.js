'use strict';

var middleware = function(callbacks, error, done) {
	if (error === undefined) {
		error = function(message) {
			throw new Error(message);
		};
	}

	done = function(data) {
		data.done = true;

		return data;
	};

	var next = function(data) {
		var result = this.call(this, data, error, done);

		var pos = callbacks.indexOf(this);

		if (pos === -1 && data.done !== true) {
			throw new Error('something pooped');
		}

		if (pos + 1 === callbacks.length || data.done === true) {
			return data;
		}

		return next.call(callbacks[pos + 1], result);
	};

	return function(data) {
		if (callbacks === null || callbacks.length === 0) {
			throw new Error('callbacks is not containing anything');
		}

		return next.call(callbacks[0], data);
	};
};

module.exports = middleware;