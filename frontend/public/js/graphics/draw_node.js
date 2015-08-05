'use strict';

var drawPicture     = require('./draw_picture'),
    drawCircle      = require('./draw_circle'),
    drawOriginTable = require('./draw_origin_table');

var settings = [
    {
        color: 'rgba(255, 85, 85, 1)',
        conditions: [
            function(node) { return node.get('type') === 'actor'; },
            function(node) { return node.get('selected') === true; }
        ]
    },
    {
        color: 'rgba(255, 75, 75, 0.9)',
        conditions: [
            function(node) { return node.get('type') === 'actor'; }
        ]
    },
    {
        color: 'rgba(195, 85, 255, 1)',
        conditions: [
            function(node) { return node.get('type') === 'origin'; },
            function(node) { return node.get('selected') === true; }
        ]
    },
    {
        color: 'rgba(175, 75, 255, 0.9)',
        conditions: [
            function(node) { return node.get('type') === 'origin'; }
        ]
    },
    {
        color: 'rgba(255, 195, 85, 1)',
        conditions: [
            function(node) { return node.get('selected') === true; }
        ]
    },
    {
        color: 'rgba(255, 175, 75, 0.9)',
        conditions: []
    }
];

module.exports = function drawNode(ctx, map, env, isMoving) {
/*
    if (map.get('selected') === true) {
        ctx.fillStyle = 'rgba(255, 175, 75, 0.8)';
    } else {
        ctx.fillStyle = 'rgba(255, 175, 75, 0.6)';
    }
    */

    if (map.get('avatar')) {
        drawPicture(ctx, map.get('avatar'), map, function(_ctx, _imagePath, _map, _refresh) {
            drawNode(ctx, map, env);
        });
    } else {
        var colors = settings.filter(function(style) {
            for (var i = 0; i < style.conditions.length; i++) {
                if (!style.conditions[i](map)) {
                    return false;
                }
            }
            
            return true;
        });
        
        ctx.fillStyle = colors[0].color;
        
        ctx.beginPath();
        ctx.arc(map.get('x'), map.get('y'), map.get('radius'), 0, 360);
        ctx.fill();
    }
    
    if (map.get('icon')) {
        var iconCircle = require('../icon')(map);
        
        drawCircle(ctx, iconCircle, colors[0].color);
        drawPicture(ctx, map.get('icon'), iconCircle, function() {
            drawNode(ctx, map, env);
        });
    }
    
    var text = map.get('description');
    /*if (map.get('type') === 'actor') {
        text = 'Actor' + map.get('id');
    } else if (map.get('type') === 'origin') {
        text = map.get('relativeChange') + '';
    } else {
        if (env === 'modelling') {
            text = map.get('value') + '';
        } else if (env === 'simulate') {
            text = map.get('simulateChange') + '';
        }
    }*/

    /*ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';*/

    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(80, 80, 80, 1.0)';
    
    var size = 48 - text.length * 2.4;
    size = size < 12 ? 12 : size;
    ctx.font = size + 'px sans-serif';
    var textData = ctx.measureText(text);
    ctx.fillText(text, map.get('x') - textData.width / 2, map.get('y') + map.get('radius') + 4);

    /*
    // Draw node description above the node
    var descriptionSize = 22;
    ctx.font = descriptionSize + 'px sans-serif';
    ctx.textBaseline = 'bottom';
    var description = map.get('description');
    var descriptionData = ctx.measureText(description)
    ctx.fillText(description, map.get('x') - descriptionData.width / 2, map.get('y') - map.get('radius'));
    */

    if(env !== 'simulate') {
        return;
    }

    /*ctx.beginPath();

    var rectWidth  = 110,
        rectHeight = 72,
        rectX      = map.get('x') - map.get('radius') - rectWidth - 8,
        rectY      = map.get('y') - (rectHeight / 2);

    ctx.rect(rectX, rectY, rectWidth, rectHeight);
    ctx.fillStyle = 'rgba(80, 80, 80, 0.4)';
    ctx.fill();*/

    var data = map.get('timeTable');
    var amount = (data.size > 3 ? 3 : data.size) - 1;

    var size   = 24;
    var startY = ((map.get('y') - size / 2) - ((size * amount) / 2));

    var longestTimeStep = 0;
    var longestSymbol   = 0;
    var longestString   = 0;
    var rowStrings      = [];

    ctx.font = size + 'px Arial';

    data.forEach(function(value, timeStep) {
        var symbol = " ";
        if(value > 0) {
            symbol = "+";
        } else if(value < 0) {
            symbol = "-";
        }

        var rowString      = "T" + timeStep + ", " + symbol + " " + Math.abs(value) + "%";
        var timeStepLength = ctx.measureText("T" + timeStep + ", ").width;
        var symbolLength   = ctx.measureText(symbol + " ").width;
        var stringLength   = ctx.measureText(rowString).width;

        if(timeStepLength > longestTimeStep) {
            longestTimeStep = timeStepLength;
        }

        if(symbolLength > longestSymbol) {
            longestSymbol = symbolLength;
        }

        if(stringLength > longestString) {
            longestString = stringLength;
        }

        rowStrings.push({
            step:   timeStep,
            symbol: symbol,
            value:  value
        });
    });

    var startX  = map.get('x') - map.get('radius') - longestString - 8,
        symbolX = startX  + longestTimeStep,
        valueX  = symbolX + longestSymbol;

    //console.log("X:",      startX);
    //console.log("Y:",      startY);
    //console.log("Width:",  longestString);
    //console.log("Height:", size * 3);

    rowStrings.forEach(function(stringInformation, index) {
        var stepString   = "T"+stringInformation.step+", ",
            symbolString = stringInformation.symbol + " ",
            valueString  = Math.abs(stringInformation.value) + "%";

        ctx.textBaseline = 'top';
        var y = startY + (size * index);

        ctx.fillStyle = 'rgba(30, 50, 100, 1.0)';
        ctx.fillText(stepString,   startX,   y);

        var changeColor = 'rgba(80, 80, 80, 1.0)';
        if(stringInformation.value > 0) {
            changeColor = 'rgba(20, 150, 40, 1.0)';
        } else if(stringInformation.value < 0) {
            changeColor = 'rgba(150, 20, 40, 1.0)';
        }

        ctx.fillStyle = changeColor;
        ctx.fillText(symbolString, symbolX, y);

        ctx.fillStyle = changeColor;
        ctx.fillText(valueString,  valueX,  y);
    });
};