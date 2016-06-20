'use strict';

var Immutable  = null,
    createNode = require('./create_node');

module.exports = function createOriginNode(model, data, gui) {
    if(!data) {
        data = {};
    }

    data.baseline = 0;
    
    data.timeTable = {
        0: 0,
        1: 10,
        2: -4
    };
    
    return createNode(model, data, gui, 'origin');
};