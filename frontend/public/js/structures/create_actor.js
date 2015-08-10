'use strict';

var Immutable  = require('Immutable'),
    createNode = require('./create_node');

module.exports = function createActorNode(model, data, gui) {
    return createNode(model, 'actor', data, gui);
};