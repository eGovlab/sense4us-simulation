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

function clickAndMove(data, error, done, env) {
    var previouslyClickedNodes = data.nodeGui.filter(function(node) {
        return node.get('clicked');
    }).map(function(node) {
        return node.delete('clicked');
    });

    data.nodeGui = data.nodeGui.merge(previouslyClickedNodes);
    // if we click on a icon we want to start moving it!
    var collidedNodes = data.nodeGui.
        filter(function(node) { return node.get('icon') !== undefined && hitTest(data.pos, icon(node)); }).
        slice(-1).
        map(function(node) {
            return node.concat({
                movingIcon: true,
                selected:   true
            });
         });
    data.nodeGui = data.nodeGui.merge(collidedNodes);

    if (collidedNodes.size > 0) {
        return done(data);
    }
    
    // but if we click on the node, we want to move the actual node
    collidedNodes = data.nodeGui.
        filter(function(node) { return hitTest(node, data.pos); }).
        slice(-1).
        map(function(node) {
            return node.concat({
                offsetX:  data.pos.get('x') - (node.get('x') || 0),
                offsetY:  data.pos.get('y') - (node.get('y') || 0),
                clicked:  true
                //selected: true
            });
         });
    data.nodeGui = data.nodeGui.merge(collidedNodes);

    if (collidedNodes.size > 0) {
        return done(data);
    }

    // if we didn't click any nodes, we check if we clicked any links
    var collidedLinks = data.links.
        filter(function(link) { return hitTest(aggregatedLink(link, data.nodeGui), data.pos); }).
        slice(-1).
        map(function(link) {
            return link.concat({
                offsetX:  data.pos.get('x') - (link.get('x') || 0),
                offsetY:  data.pos.get('y') - (link.get('y') || 0),
                clicked:  true
                //selected: true
            });
         })
    data.links = data.links.merge(collidedLinks);

    if (collidedLinks.size > 0) {
        return done(data);
    }

    if(data.env !== 'simulate') {
        return data;
    }

    // If we didn't hit any links, look for clicked origin tables.
    var collidedTables = data.nodeGui.
        filter(function(node) {
            var w = node.get('tableWidth'),
                h = node.get('tableHeight');

            var x = node.get('x') - node.get('radius') - w - 8,
                y = node.get('y') - (h / 2);

            return pointRect(data.pos, Immutable.Map({x: x, y: y, width: w, height: h}));
        }).
        map(function(node) {
            return node.concat({
                offsetX: data.pos.get('x') - (node.get('x') || 0),
                offsetY: data.pos.get('y') - (node.get('y') || 0),
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
			filter(function(node) { return node.get('selected') === true; }).
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
			filter(function(node) { return node.get('selected') === true && node.get('linking') !== true && node.get('icon') !== undefined; }).
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