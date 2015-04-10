'use strict';

var temp_id = 0;

var generateId = function() {
	temp_id++;
	return temp_id;
};

module.exports = generateId;