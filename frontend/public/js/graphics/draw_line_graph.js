'use strict';

var objectHelper = require('./../object-helper.js');

function generateHexColor() {
    return Math.round(Math.random() * 255).toString(16);
}

function generateColor() {
    return '#' + generateHexColor() + generateHexColor() + generateHexColor();
}

function drawLineGraph(ctx, x, y, w, h, values) {
    var highestValue  = 0,
        lowestValue   = false,
        amountOfSteps = 0;

    objectHelper.forEach.call(
        values,
        function(node) {
            node.values.forEach(function(value, step) {
                if(value > highestValue) {
                    highestValue = value;
                }

                if(lowestValue === false || value < lowestValue) {
                    lowestValue = value;
                }

                if(step > amountOfSteps) {
                    amountOfSteps = step;
                }
            });
        }
    );

    var innerlineMargin = ((w + h) / 2) * 0.05,
        twiceMargin     = innerlineMargin * 2,
        thriceMargin    = innerlineMargin * 3;

    var graphX      = x + 40 + innerlineMargin,
        graphY      = y,
        graphHeight = h - 40 - innerlineMargin,
        graphWidth  = w - 40 - innerlineMargin;

    /* Body */

    ctx.strokeStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(x + 40, y);
    ctx.lineTo(x + 40, y + h - 40);
    ctx.lineTo(x + w,  y + h - 40);
    ctx.stroke();

    /* Timesteps */

    var timestepStringY = y + h - 36;

    var fontSize = 14;

    ctx.font         = fontSize + 'px Arial';
    ctx.textBaseline = 'top'; 
    ctx.fillText(0, x + 36 + innerlineMargin, timestepStringY);

    var halfSteps = Math.round(amountOfSteps / 2);
    var halfStepsWidth = ctx.measureText(halfSteps).width;
    ctx.fillText(halfSteps, (x + 40) + ((w - 40) / 2), timestepStringY);

    var allStepsWidth = ctx.measureText(amountOfSteps).width;
    ctx.fillText(amountOfSteps, x + w - allStepsWidth, timestepStringY);

    var timestepLegend = 'Timestep';
    var timestepLegendWidth = ctx.measureText(timestepLegend).width;
    ctx.fillText('Timestep', (x + 40) + ((w - 40) / 2) - timestepLegendWidth / 2, y + h - 16);

    /* Values */

    ctx.textBaseline = 'middle'; 
    var lowestValueY = y + h - 44 - innerlineMargin / 2;

    var highestValueWidth = ctx.measureText(highestValue).width;
    ctx.fillText(highestValue, x + 36 - highestValueWidth, y);

    var halfHighestValue = (highestValue - lowestValue) / 2 + lowestValue;
    var halfHighestValueWidth = ctx.measureText(halfHighestValue).width;
    ctx.fillText(halfHighestValue, x + 36 - halfHighestValueWidth, (y + lowestValueY) / 2);

    var lowestValueWidth = ctx.measureText(lowestValue).width;
    ctx.fillText(lowestValue, x + 36 - lowestValueWidth, lowestValueY);

    var valueLegend = 'Value';
    var valueLegendWidth = ctx.measureText(valueLegend).width;

    ctx.save();
    ctx.translate(x, (y + h - 40) / 2);
    ctx.rotate(Math.PI / 2);

    ctx.fillText(valueLegend, 0 - valueLegendWidth / 2, 0);
    ctx.restore();

    /* Node values */

    var circleRadius = 5;
    var margin = graphWidth / amountOfSteps;

    function drawNode(step, value, lastX, lastY) {
        var circleY = graphHeight - (graphHeight * (value - lowestValue) / (highestValue - lowestValue)),
            circleX = margin * step;

        if(lastX !== undefined && lastY !== undefined) {
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(circleX, circleY);
            ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(circleX, circleY, circleRadius, 0, 2 * Math.PI);
        ctx.fill();

        return {x: circleX, y: circleY};
    }

    objectHelper.forEach.call(
        values,
        function(node) {
            var lastX     = undefined,
                lastY     = undefined,
                //step      = 0,
                lastValue = 0,
                coords;
            ctx.save();
            ctx.translate(graphX, graphY);

            ctx.fillStyle      = node.color;
            ctx.strokeStyle    = node.color;
            ctx.lineWidth      = 4;
            ctx.lineCap        = 'round';
            
            node.values.forEach(function(value, step) {
                /*while(step < index) {
                    coords = drawNode(step, lastValue, lastX, lastY);
                    step++;

                    lastX = coords.x;
                    lastY = coords.y;
                }*/

                coords = drawNode(step, value, lastX, lastY);
                lastValue = value;
                //step++;

                lastX = coords.x;
                lastY = coords.y;
            });

            /*while(step <= amountOfSteps) {
                coords = drawNode(step, lastValue, lastX, lastY);
                step++;

                lastX = coords.x;
                lastY = coords.y;
            }*/

            //ctx.fillText(node.name, lastX + circleRadius + 4, lastY);
            ctx.restore();
        }
    );
    
    console.log('Linegraph drawn.');
}

module.exports = drawLineGraph;