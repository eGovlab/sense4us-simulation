'use strict';

var Immutable = require('Immutable');

function icon(map) {
	return Immutable.Map({
		x: map.get('x') - map.get('radius') * 0.707,
		y: map.get('y') - map.get('radius') * 0.707,
		radius: 30
	});
}

module.exports = icon;