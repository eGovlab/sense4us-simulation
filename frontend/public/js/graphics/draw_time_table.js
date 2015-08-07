'use strict';

var menuBuilder = require('../menu_builder');

module.exports = function drawNode(ctx, map) {
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
}