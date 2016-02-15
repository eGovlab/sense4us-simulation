'use strict';

var Immutable = null;

module.exports = function createLink(id, source, destination) {
    return {
        id:          id,
        node1:       source,
        node2:       destination,
        coefficient: 1,
        type:        'fullchannel',
        timelag:     0,
        threshold:   0,
        width:       8
    };
};
