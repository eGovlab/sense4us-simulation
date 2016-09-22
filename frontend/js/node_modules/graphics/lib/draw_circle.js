'use strict';

module.exports = function drawNode(ctx, map, color) {
	ctx.fillStyle = color;
	
	ctx.beginPath();
	ctx.arc(map.get('x'), map.get('y'), map.get('radius'), 0, 360);
	ctx.fill();
};