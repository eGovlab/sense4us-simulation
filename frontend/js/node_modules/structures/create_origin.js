'use strict';

var Immutable  = null,
    createNode = require('./create_node');

module.exports = function createOriginNode(model, data, gui) {
    if(!data) {
        data = {};
    }
    
    return createNode(model, data, gui, 'origin');
};