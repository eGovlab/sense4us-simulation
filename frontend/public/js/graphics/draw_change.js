'use strict';

var valueColors = require('./value_colors.js');

module.exports = function drawChange(ctx, x, y, value) {
    ctx.fillStyle = valueColors.neutral;
    if(value > 0) {
        ctx.fillStyle = valueColors.positive;
    } else if(value < 0) {
        ctx.fillStyle = valueColors.negative;
    } else if(isNaN(value)) {
        return;
    }
    
    ctx.textBaseline = 'top';
    ctx.font         = '22px Arial';

    var valueString = value + '%';

    var textData = ctx.measureText(valueString);
    ctx.fillText(valueString, x - textData.width / 2, y);
};