'use strict';

module.exports = function drawLinker(ctx, linker, node) {
	ctx.shadowOffsetX = 0;
	ctx.shadowOffsetY = 0;
	ctx.shadowBlur = 10;
	ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';

	ctx.fillStyle = 'red';
	ctx.beginPath();
	ctx.arc(linker(node).get('x'), linker(node).get('y'), linker(node).get('radius'), 0, 360);
	ctx.fill();

	ctx.shadowOffsetX = 0;
	ctx.shadowOffsetY = 0;
	ctx.shadowBlur = 0;
	ctx.shadowColor = 'rgba(0, 0, 0, 1)';
};