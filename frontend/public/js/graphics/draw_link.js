'use strict';

var valueColors    = require('./value_colors.js'),
    drawCoordinate = require('./draw_coordinate.js');

module.exports = function drawLink(ctx, line) {
    /*
    ** Variable initiation
    */

    var x1             = line.get('x1'),
        y1             = line.get('y1'),
        x2             = line.get('x2'),
        y2             = line.get('y2'),

        dx             = x2 - x1,
        dy             = y2 - y1,

        distance       = Math.sqrt(dx*dx + dy*dy),
        angle          = Math.atan2(dy, dx),
        
        fromRadius     = line.get('fromRadius')   + 8,
        targetRadius   = line.get('targetRadius') + 8,
        lineWidth      = line.get('width'),
        halfLineWidth  = lineWidth * 0.80,

        startX         = x1 + Math.cos(angle) * (fromRadius),
        startY         = y1 + Math.sin(angle) * (fromRadius),
        
        arrowEndX      = x1 + Math.cos(angle) * (distance - (targetRadius + halfLineWidth)),
        arrowEndY      = y1 + Math.sin(angle) * (distance - (targetRadius + halfLineWidth)),

        arrowMiddleX   = startX + Math.cos(angle) * ((distance - fromRadius - targetRadius) / 2),
        arrowMiddleY   = startY + Math.sin(angle) * ((distance - fromRadius - targetRadius) / 2),
        
        arrowStartX    = x1 + Math.cos(angle) * (distance - (targetRadius + 25)),
        arrowStartY    = y1 + Math.sin(angle) * (distance - (targetRadius + 25)),
        
        halfPI         = Math.PI / 2,

        anchorDistance = 10,
        
        leftAngle      = angle + halfPI,
        rightAngle     = angle - halfPI,

        leftAnchorX    = arrowStartX + Math.cos(leftAngle) * anchorDistance,
        leftAnchorY    = arrowStartY + Math.sin(leftAngle) * anchorDistance,
        
        rightAnchorX   = arrowStartX + Math.cos(rightAngle) * anchorDistance,
        rightAnchorY   = arrowStartY + Math.sin(rightAngle) * anchorDistance,

        coefficientX   = arrowMiddleX + Math.cos(leftAngle) * 20,
        coefficientY   = arrowMiddleY + Math.sin(leftAngle) * 20;

    if(distance < fromRadius) {
        return;
    }

    /*
    ** Draw the initial arrow.
    */

    /*ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur    = 10;
    ctx.shadowColor   = 'rgba(0, 0, 0, 0.5)';*/

    ctx.lineJoin = 'miter';
    ctx.lineCap  = 'square';

    if (line.get('selected') === true) {
        ctx.strokeStyle = 'rgba(30, 220, 140, 0.8)';
    } else if(line.get('loop') === true) {
        ctx.strokeStyle = 'rgba(220, 30, 140, 0.8)';
    }  else {
        ctx.strokeStyle = 'rgba(20, 200, 120, 0.6)';
    }

    ctx.lineWidth = line.get('width') * 1.2;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(arrowStartX, arrowStartY);
    ctx.lineTo(leftAnchorX,  leftAnchorY);
    ctx.lineTo(arrowEndX,    arrowEndY);
    ctx.lineTo(rightAnchorX, rightAnchorY);
    ctx.lineTo(arrowStartX,  arrowStartY);
    ctx.closePath();
    ctx.stroke();

    if(line.get('type') === 'halfchannel') {
        /*
        ** Draw another smaller line on top of the initial arrow.
        */

        /*ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'rgba(0, 0, 0, 1)';*/

        
        ctx.strokeStyle = 'rgba(255, 255, 255, 1)';

        ctx.lineWidth = line.get('width');
        ctx.lineJoin = 'miter';
        ctx.lineCap  = 'square';
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(arrowStartX, arrowStartY);
        ctx.lineTo(leftAnchorX,  leftAnchorY);
        ctx.lineTo(arrowEndX,    arrowEndY);
        ctx.lineTo(rightAnchorX, rightAnchorY);
        ctx.lineTo(arrowStartX,  arrowStartY);
        ctx.closePath();
        ctx.stroke();
    }

    

    if(line.get('coefficient') !== undefined) {
        var textHeight = 22;
        ctx.font = textHeight + 'px Arial';
        var coefficient = line.get('coefficient');
        if(coefficient > 0) {
            ctx.fillStyle = valueColors.positive;
        } else if(coefficient < 0) {
            ctx.fillStyle = valueColors.negative;
        } else {
            ctx.fillStyle = valueColors.neutral;
        }

        var coefficientMeasurement = ctx.measureText(coefficient);

        var concatenatedString = coefficient;
        var timelag = line.get('timelag');
        if(timelag !== undefined) {
             concatenatedString += ", T: " + timelag;
        }
        var textMeasurement = ctx.measureText(concatenatedString);

        //console.log(megaString, textMeasurement.width);

        
        ctx.textBaseline = 'middle';

        /*
        ** String aligned with arrow */

        var halfTextWidth  = textMeasurement.width / 2,
            halfTextHeight = textHeight / 2;

        var offsetX = halfTextWidth  + 22, // padding X
            offsetY = halfTextHeight + 22; // padding Y

        var textX = arrowMiddleX - halfTextWidth  + Math.cos(angle + halfPI)*offsetX,
            textY = arrowMiddleY + halfTextHeight + Math.sin(angle + halfPI)*offsetY;

        ctx.fillText(coefficient, textX, textY);
        if(timelag !== undefined) {
            ctx.fillStyle = valueColors.neutral;
            ctx.fillText(", T: " + line.get('timelag'), textX + coefficientMeasurement.width, textY);
        }

        /*
        ** String rotated WITH the arrow.

        ctx.save();
        ctx.translate(coefficientX, coefficientY);
        ctx.rotate(angle);

        coefficientX = 0 - (textMeasurement.width / 2);
        
        ctx.fillText(coefficient, coefficientX, 0);
        
        if(timelag !== undefined) {
            ctx.fillStyle = valueColors.neutral;
            ctx.fillText(", T: " + line.get('timelag'), coefficientX + coefficientMeasurement.width, 0);
        }

        ctx.restore();
        */
    }
};