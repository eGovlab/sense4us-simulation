'use strict';

var middleware     = require('./../middleware.js'),
    pointRect      = require('./../collisions.js').pointRect,
    hitTest        = require('./../collisions.js').hitTest,
    linker         = require('./../linker.js'),
    aggregatedLink = require('./../aggregated_link.js'),
    icon           = require('../icon');

var mouseDownWare = middleware([
    startLinkingIfSelected,
    startMovingIconIfSelected,
    clickAndMove
]);

function generateHexColor() {
    return Math.round(Math.random() * 255).toString(16);
}

function generateColor() {
    return "#" + generateHexColor() + generateHexColor() + generateHexColor();
}

function clickAndMove(data, error, done, env) {
    var previouslyClickedNodes = data.nodeGui.filter(function(node) {
        return node.clicked;
    }).map(function(node) {
        delete node.clicked;
        return node;
    });

    var previouslyClickedLinks = data.links.filter(function(link) {
        return link.clicked;
    }).map(function(link) {
        delete link.clicked;
        return link;
    });

    data.nodeGui = data.nodeGui.merge(previouslyClickedNodes);
    data.links = data.links.merge(previouslyClickedLinks);

    /*// if we click on a icon we want to start moving it!
    var collidedNodes = data.nodeGui.
        filter(function(node) { return node.icon !== undefined && hitTest(data.pos, icon(node)); }).
        slice(-1).
        map(function(node) {
            return node.concat({
                movingIcon: true
            });
         });
    data.nodeGui = data.nodeGui.merge(collidedNodes);

    if (collidedNodes.size > 0) {
        return done(data);
    }*/
    
    // but if we click on the node, we want to move the actual node
    var collidedNodes = data.nodeGui.
        filter(function(node) { return hitTest(node, data.pos); }).
        slice(-1).
        map(function(node) {
            node = node.merge({
                offsetX:   data.pos.x - (node.x || 0),
                offsetY:   data.pos.y - (node.y || 0),
                clicked:   true,
                linegraph: data.linegraph ? !node.linegraph : false,
                graphColor: generateColor()
                //selected: true
            });

            return node;
         });
    data.nodeGui = data.nodeGui.merge(collidedNodes);

    if (Object.keys(collidedNodes).length > 0) {
        console.log("RETURNING", data);
        return done(data);
    }

    // if we didn't click any nodes, we check if we clicked any links
    var collidedLinks = data.links.
        filter(function(link) { return hitTest(aggregatedLink(link, data.nodeGui), data.pos); }).
        slice(-1).
        map(function(link) {
            return link.merge({
                offsetX:  data.pos.x - (link.x || 0),
                offsetY:  data.pos.y - (link.y || 0),
                clicked:  true
                //selected: true
            });
         })
    data.links = data.links.merge(collidedLinks);

    if (Object.keys(collidedLinks).length > 0) {
        console.log("RETURNING");
        return done(data);
    }

    if(data.env !== 'simulate') {
        return data;
    }

    // If we didn't hit any links, look for clicked origin tables.
    var collidedTables = data.nodeGui.
        filter(function(node) {
            var w = node.tableWidth,
                h = node.tableHeight;

            var x = node.x - node.radius - w - 8,
                y = node.y - (h / 2);

            return pointRect(data.pos, Immutable.Map({x: x, y: y, width: w, height: h}));
        }).
        map(function(node) {
            return node.concat({
                offsetX: data.pos.x - (node.x || 0),
                offsetY: data.pos.y - (node.y || 0),
                clicked: true
            });
        });

    data.nodeGui = data.nodeGui.merge(collidedTables);

    if (collidedTables.size > 0) {
        return done(data);
    }

    return data;
}

function startLinkingIfSelected(data, error, done) {
    // if a node is selected and we click the linker-symbol, then start linking!
	var linkingNodes = data.nodeGui.
			filter(function(node) { return node.selected === true; }).
			filter(function(node) { return hitTest(data.pos, linker(node)); }).
			map(function(node)    { return node.set('linking', true); });

	data.nodeGui = data.nodeGui.merge(linkingNodes);

    // if we started to link a node, we use the done-function
    // otherwise it'd go to the next mousehandling-function
    // and try to select something instead
	if (linkingNodes.size > 0) {
		return done(data);
	} else {
		return data;
	}
}

function startMovingIconIfSelected(data, error, done) {
    // if we have a node selected and we aren't linking and we click an icon, then start moving the icon!
	var movingIconNodes = data.nodeGui.
			filter(function(node) { return node.selected === true && node.linking !== true && node.icon !== undefined; }).
			filter(function(node) { return hitTest(data.pos, icon(node)); }).
			map(function(node) { return node.set('movingIcon', true); });

	data.nodeGui = data.nodeGui.merge(movingIconNodes);

    // if we started to move a node, we use the done-function
    // otherwise it'd go to the next mousehandling-function
    // and try to select something instead
	if (movingIconNodes.size > 0) {
		return done(data);
	} else {
		return data;
	}
}

module.exports = mouseDownWare;