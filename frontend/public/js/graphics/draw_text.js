'use strict';

module.exports = function drawText(ctx, text, x, y, color, centered, size, font, baseline) {
    var fontSize     = size     || '18',
        fontType     = font     || 'sans-serif',
        textX        = x        || 0,
        textY        = y        || 0,
        fontColor    = color    || 'rgba(80,80,80,1)',
        fontBaseline = baseline || 'top';

    if(centered) {
        textX = textX - (ctx.measureText(text).width / 2);
    }

    ctx.textBaseline = fontBaseline;
    ctx.fillStyle    = fontColor;
    ctx.font         = fontSize + "px " + fontType;

    ctx.fillText(text, textX, textY);
};