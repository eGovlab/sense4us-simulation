'use strict';

var Immutable = require('Immutable');

function aggregatedLink(link, nodes) {
    return Immutable.Map({
        selected:     link.get('selected'),
        loop:         link.get('loop'),
        type:         link.get('type'),
        coefficient:  link.get('coefficient'),
        x1:           nodes.get(link.get('node1')).get('x'),
        y1:           nodes.get(link.get('node1')).get('y'),
        x2:           nodes.get(link.get('node2')).get('x'),
        y2:           nodes.get(link.get('node2')).get('y'),
        width:        parseFloat(link.get('width')),
        fromRadius:   parseFloat(nodes.get(link.get('node1')).get('radius')),
        targetRadius: parseFloat(nodes.get(link.get('node2')).get('radius'))
    });
};

module.exports = aggregatedLink;