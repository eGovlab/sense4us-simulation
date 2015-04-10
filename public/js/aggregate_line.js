'use strict';

var Immutable = require('Immutable');

var aggregateLine = function(nodes, link) {
	var node1 = nodes.get(link.get('node1'));
	var node2 = nodes.get(link.get('node2'));

	return Immutable.Map({
		x1: node1.get('x'),
		y1: node1.get('y'),
		x2: node2.get('x'),
		y2: node2.get('y'),
		width: link.get('width')
	});
};

module.exports = aggregateLine;