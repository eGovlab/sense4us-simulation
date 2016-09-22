'use strict';

var Immutable  = null,
    createNode = require('./create_node');

function generateHexColor() {
    var n = Math.round(Math.random() * 255).toString(16);

    if(n.length === 1) {
        n = '0' + n;
    }

    return n;
}

function generateColor() {
    return '#' + generateHexColor() + generateHexColor() + generateHexColor();
}

module.exports = function createActorNode(model, data, gui) {
    gui.color = generateColor();
    return createNode(model, data, gui, 'actor');
};