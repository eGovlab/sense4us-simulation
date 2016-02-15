'use strict';

var Immutable = require('Immutable');

module.exports = function createLink(id, source, destination) {
    return Immutable.Map({
        id:          id,
        node1:       source,
        node2:       destination,
        coefficient: 1,
        type:        'fullchannel',
        timelag:     0,
        threshold:   0,
        width:       8
    });
};
