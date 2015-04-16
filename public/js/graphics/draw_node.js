'use strict';

module.exports = function(ctx, map) {
	ctx.shadowOffsetX = 0;
	ctx.shadowOffsetY = 0;
	ctx.shadowBlur = 10;
	ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';

	ctx.fillStyle = 'rgba(255, 175, 75, 0.6)';
	ctx.beginPath();
	ctx.arc(map.get('x'), map.get('y'), map.get('radius'), 0, 360);
	ctx.fill();

	ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
	ctx.textBaseline = 'middle';
	var text = ctx.measureText(map.get('signal'));
	ctx.font = '48px sans-serif';
	ctx.fillText(map.get('signal'), map.get('x') - text.width / 2, map.get('y'));
	
	ctx.shadowOffsetX = 0;
	ctx.shadowOffsetY = 0;
	ctx.shadowBlur = 0;
	ctx.shadowColor = 'rgba(0, 0, 0, 1)';
};