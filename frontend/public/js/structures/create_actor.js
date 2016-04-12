'use strict';

var Immutable  = null,
    createNode = require('./create_node');

function generateHexColor() {
    return Math.round(Math.random() * 255).toString(16);
}

function generateColor() {
    return '#' + generateHexColor() + generateHexColor() + generateHexColor();
}

module.exports = function createActorNode(model, data, gui) {
    gui.color = generateColor();
    return createNode(model, data, gui, 'actor');
};