'use strict';

module.exports = function(ctx, line) {
	ctx.shadowOffsetX = 0;
	ctx.shadowOffsetY = 0;
	ctx.shadowBlur = 10;
	ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';

	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';

	if (line.get('selected') === true) {
		ctx.strokeStyle = 'rgba(20, 200, 120, 0.8)';
	} else {
		ctx.strokeStyle = 'rgba(20, 200, 120, 0.6)';
	}

	ctx.lineWidth = line.get('width') * 1.2;
	ctx.beginPath();
	ctx.moveTo(line.get('x1'), line.get('y1'));
	ctx.lineTo(line.get('x2'), line.get('y2'));
	ctx.closePath();
	ctx.stroke();

	if (line.get('selected') === true) {
		ctx.strokeStyle = 'rgba(75, 255, 175, 0.8)';
	} else {
		ctx.strokeStyle = 'rgba(75, 255, 175, 0.6)';
	}

	ctx.lineWidth = line.get('width');
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';
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