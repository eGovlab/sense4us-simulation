'use strict';

var Immutable = require('Immutable');

function aggregatedLink(link, nodes) {
    return Immutable.Map({
        x1: nodes.get(link.get('node1')).get('x'),
        y1: nodes.get(link.get('node1')).get('y'),
        x2: nodes.get(link.get('node2')).get('x'),
        y2: nodes.get(link.get('node2')).get('y'),
        width: link.get('width')
    });
};

module.exports = aggregatedLink;