'use strict';

var menuBuilder = require('../menu_builder');

module.exports = function(node, iterations, callback) {
    var table  = menuBuilder.div();

    for(var i = 0; i < iterations; i++) {
        var data  = nodeTable.get(i);
        var input;

        var inputCallback = function(name, value) {
            callback(nodeTable.set(name, value));
        };

        if(data !== undefined) {
            input = menuBuilder.input(i, data, inputCallback);
        } else {
            input = menuBuilder.input(i, 0, inputCallback);
        }

        table.appendChild(input);
    }

    var timeTables = document.getElementById('time-tables');
    timeTables.appendChild(table);
}