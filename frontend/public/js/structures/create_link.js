'use strict';

var Immutable = null;

module.exports = function createLink(model, source, destination, type) {
    console.log(model);
    return {
        id:          model.generateId(),
        node1:       source,
        node2:       destination,
        coefficient: 1,
        type:        type || 'fullchannel',
        timelag:     0,
        threshold:   0,
        width:       8
    };
};
