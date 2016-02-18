'use strict';

var linker = function(node) {
	return {
		x: (node.linkerX || node.x + node.radius * 0.9),
		y: (node.linkerY || node.y + node.radius * 0.9),
		radius: node.radius / 10
	};
};

module.exports = linker;