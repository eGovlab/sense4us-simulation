'use strict';

function drawCoordinate(ctx, x, y, color) {
    ctx.strokeStyle = color;
    ctx.lineJoin = 'miter';
    ctx.lineCap  = 'square';

    ctx.lineWidth = 6;

    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, 0);
    ctx.stroke();
}

module.exports = drawCoordinate;