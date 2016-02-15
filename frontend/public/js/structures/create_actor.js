'use strict';

var Immutable  = null,
    createNode = require('./create_node');

module.exports = function createActorNode(model, data, gui) {
    return createNode(model, data, gui, 'actor');
};