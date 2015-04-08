'use strict';

module.exports = function(ctx, line) {
	ctx.shadowOffsetX = 0;
	ctx.shadowOffsetY = 0;
	ctx.shadowBlur = 10;
	ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';

	ctx.lineJoin = "round";
	ctx.lineCap = "round";
	ctx.strokeStyle = 'darkgreen';
	ctx.lineWidth = line.get('width') * 1.2;
	ctx.beginPath();
	ctx.moveTo(line.get('x1'), line.get('y1'));
	ctx.lineTo(line.get('x2'), line.get('y2'));
	ctx.closePath();
	ctx.stroke();

	ctx.strokeStyle = 'green';
	ctx.lineWidth = line.get('width');
	ctx.lineJoin = "round";
	ctx.lineCap = "round";
	ctx.beginPath();
	ctx.moveTo(line.get('x1'), line.get('y1'));
	ctx.lineTo(line.get('x2'), line.get('y2'));
	ctx.closePath();
	ctx.stroke();

	ctx.shadowOffsetX = 0;
	ctx.shadowOffsetY = 0;
	ctx.shadowBlur = 0;
	ctx.shadowColor = 'rgba(0, 0, 0, 1)';
};