'use strict';

var menuBuilder = require('../menu_builder'),
    valueColors = require('./value_colors.js');

module.exports = function drawTimeTable(ctx, map) {
    var data = map.get('timeTable');

    var size   = 24,
        startY = ((map.get('y') - size / 2) - ((size * data.size) / 2)),

        longestTimeStep = 0,
        longestSymbol   = 0,
        longestString   = 0,
        rowStrings      = [];

    ctx.font = size + 'px Arial';

    data.forEach(function getRowLength(value, timeStep) {
        value = Math.round(value * 100) / 100;
        var symbol = " ";
        if(value > 0) {
            symbol = "+";
        } else if(value < 0) {
            symbol = "-";
        }

        var rowString      = "T" + timeStep + ", " + symbol + " " + Math.abs(value) + "%",
            timeStepLength = ctx.measureText("T" + timeStep + ", ").width,
            symbolLength   = ctx.measureText(symbol + " ").width,
            stringLength   = ctx.measureText(rowString).width;

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

    rowStrings.forEach(function drawTableRow(stringInformation, index) {
        var stepString   = "T"+stringInformation.step+", ",
            symbolString = stringInformation.symbol + " ",
            valueString  = Math.abs(stringInformation.value) + "%";

        ctx.textBaseline = 'top';
        var y = startY + (size * index);

        ctx.fillStyle = 'rgba(30, 50, 100, 1.0)';
        ctx.fillText(stepString,   startX,   y);

        var changeColor = valueColors.neutral;
        if(stringInformation.value > 0) {
            changeColor = valueColors.positive;
        } else if(stringInformation.value < 0) {
            changeColor = valueColors.negative;
        }

        ctx.fillStyle = changeColor;
        ctx.fillText(symbolString, symbolX, y);

        ctx.fillStyle = changeColor;
        ctx.fillText(valueString,  valueX,  y);
    });
}