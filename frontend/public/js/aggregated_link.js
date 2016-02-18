'use strict';

var Immutable = null;

function aggregatedLink(link, nodeGui) {
    return {
        selected:     link.selected,
        loop:         link.loop,
        type:         link.type,
        coefficient:  link.coefficient,
        timelag:      link.timelag,
        debugNode:    nodeGui[link.node1].selected,
        x1:           nodeGui[link.node1].x,
        y1:           nodeGui[link.node1].y,
        x2:           nodeGui[link.node2].x,
        y2:           nodeGui[link.node2].y,
        width:        parseFloat(link.width),
        fromRadius:   parseFloat(nodeGui[link.node1].radius),
        targetRadius: parseFloat(nodeGui[link.node2].radius)
    };
};

module.exports = aggregatedLink;