'use strict';

var Immutable = require('Immutable');

var linker = function(node) {
	return Immutable.Map({
		x: (node.get('linkerX') || node.get('x') + node.get('radius') * 0.9),
		y: (node.get('linkerY') || node.get('y') + node.get('radius') * 0.9),
		radius: node.get('radius') / 10
	});
};

module.exports = linker;