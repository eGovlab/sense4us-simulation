'use strict';

var colours = {
    green:   'rgba(0, 255, 0, 1)',
    red:     'rgba(255, 0, 0, 1)',
    neutral: 'rgba(170, 170, 170, 1)'
};

module.exports = function drawChange(ctx, x, y, value) {
    ctx.fillStyle    = colours.green;
    ctx.textBaseline = 'top';
    ctx.font         = '12px sans-serif';

    var textData = ctx.measureText(value);
    ctx.fillText(value, x - textData.width / 2, y);
};