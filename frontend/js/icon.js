'use strict';

var Immutable = null;

function icon(map) {
	var x = map.x;
	var y = map.y;
	
	if (map.iconXOffset !== undefined && map.iconYOffset !== undefined) {
		var angle = Math.atan2(map.iconYOffset, map.iconXOffset);
		
		x += Math.cos(angle) * map.radius;
		y += Math.sin(angle) * map.radius;
	} else {
		x -= map.radius * 0.707;
		y -= map.radius * 0.707;
	}
	
	return {
		//x: map.x + (map.iconXOffset || 0) - map.radius * 0.707,
		//y: map.y + (map.iconYOffset || 0) - map.radius * 0.707,
		x: x,
		y: y,
		radius: 30
	};
}

module.exports = icon;
