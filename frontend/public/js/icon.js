'use strict';

var Immutable = require('Immutable');

function icon(map) {
	var x = map.get('x');
	var y = map.get('y');
	
	if (map.get('iconXOffset') !== undefined && map.get('iconYOffset') !== undefined) {
		var angle = Math.atan2(map.get('iconYOffset'), map.get('iconXOffset'));
		
		x += Math.cos(angle) * map.get('radius');
		y += Math.sin(angle) * map.get('radius');
	} else {
		x -= map.get('radius') * 0.707;
		y -= map.get('radius') * 0.707;
	}
	
	return Immutable.Map({
		//x: map.get('x') + (map.get('iconXOffset') || 0) - map.get('radius') * 0.707,
		//y: map.get('y') + (map.get('iconYOffset') || 0) - map.get('radius') * 0.707,
		x: x,
		y: y,
		radius: 30
	});
}

module.exports = icon;