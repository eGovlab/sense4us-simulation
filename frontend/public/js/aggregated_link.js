'use strict';

var Immutable = null;

function aggregatedLink(link, nodes) {
    return {
        selected:     link.selected,
        loop:         link.loop,
        type:         link.type,
        coefficient:  link.coefficient,
        timelag:      link.timelag,
        debugNode:    nodes[link.node1].selected,
        x1:           nodes[link.node1].x,
        y1:           nodes[link.node1].y,
        x2:           nodes[link.node2].x,
        y2:           nodes[link.node2].y,
        width:        parseFloat(link.width),
        fromRadius:   parseFloat(nodes[link.node1].radius),
        targetRadius: parseFloat(nodes[link.node2].radius)
    };
};

module.exports = aggregatedLink;