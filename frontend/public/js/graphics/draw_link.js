'use strict';

var valueColors    = require('./value_colors.js'),
    drawCoordinate = require('./draw_coordinate.js');

module.exports = function drawLink(ctx, line) {
    /*
    ** Variable initiation
    */

    var x1             = line.x1,
        y1             = line.y1,
        x2             = line.x2,
        y2             = line.y2,

        dx             = x2 - x1,
        dy             = y2 - y1,

        distance       = Math.sqrt(dx*dx + dy*dy),
        angle          = Math.atan2(dy, dx),
        
        fromRadius     = line.fromRadius   + 8,
        targetRadius   = line.targetRadius + 8,
        lineWidth      = line.width,
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

    if(distance < fromRadius + targetRadius) {
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

    if (line.selected === true) {
        ctx.strokeStyle = 'rgba(0,0,0, 0.6)';
    } else if(line.loop === true) {
        ctx.strokeStyle = 'rgba(220, 30, 140, 0.8)';
    }  else {
        if(line.coefficient > 0) {
            ctx.strokeStyle = valueColors.positive;
        } else if(line.coefficient < 0) {
            ctx.strokeStyle = valueColors.negative;
        } else {
            ctx.strokeStyle = 'rgba(0,0,0, 0.6)';
        }
    }

    ctx.lineWidth = line.width * 1.2;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(arrowStartX, arrowStartY);
    ctx.lineTo(leftAnchorX,  leftAnchorY);
    ctx.lineTo(arrowEndX,    arrowEndY);
    ctx.lineTo(rightAnchorX, rightAnchorY);
    ctx.lineTo(arrowStartX,  arrowStartY);
    ctx.closePath();
    ctx.stroke();

    if(line.type === 'halfchannel') {
        /*
        ** Draw another smaller line on top of the initial arrow.
        */

        /*ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'rgba(0, 0, 0, 1)';*/

        
        ctx.strokeStyle = 'rgba(255, 255, 255, 1)';

        ctx.lineWidth = line.width;
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

    if(line.coefficient !== undefined) {
        var textHeight = 22;
        ctx.font = textHeight + 'px Arial';
        var coefficient = line.coefficient;
        if(coefficient > 0) {
            ctx.fillStyle = valueColors.positive;
        } else if(coefficient < 0) {
            ctx.fillStyle = valueColors.negative;
        } else {
            ctx.fillStyle = valueColors.neutral;
        }

        var coefficientMeasurement = ctx.measureText(coefficient);

        var concatenatedString = coefficient;
        var timelag = line.timelag;
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
            ctx.fillText(", T: " + line.timelag, textX + coefficientMeasurement.width, textY);
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
            ctx.fillText(", T: " + line.timelag, coefficientX + coefficientMeasurement.width, 0);
        }

        ctx.restore();
        */
    }
};
