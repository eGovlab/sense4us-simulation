'use strict';

var middleware = require('./../middleware.js');
var hitTest = require('./../collisions.js').hitTest;
var linker = require('./../linker.js');
var aggregatedLink = require('./../aggregated_link.js');

var mouseDownWare = middleware([
    startLinkingIfSelected,
    deselect,
    select
]);

function deselect(data) {
    data.nodeGui = data.nodeGui.merge(
        data.nodeGui.
            filter(function(node) { return node.get('selected') === true; }).
            map(function(node) { return node.delete('selected').delete('clicked').delete('offsetX').delete('offsetY'); })
    );

    data.links = data.links.merge(
        data.links.
            filter(function(node) { return node.get('selected') === true; }).
            map(function(node) { return node.delete('selected').delete('clicked').delete('offsetX').delete('offsetY'); })
    );

    return data;
}

function select(data) {
    var collidedNodes = data.nodeGui.
        filter(function(node) { return hitTest(node, data.pos); }).
        slice(-1).
        map(function(node) {
            return node.concat({
                offsetX: data.pos.get('x') - (node.get('x') || 0),
                offsetY: data.pos.get('y') - (node.get('y') || 0),
                clicked: true,
                selected: true
            });
         });
    data.nodeGui = data.nodeGui.merge(collidedNodes);

    if (collidedNodes.size > 0) {
        return data;
    }

    data.links = data.links.merge(
        data.links.
        filter(function(link) { return hitTest(aggregatedLink(link, data.nodeGui), data.pos); }).
        slice(-1).
        map(function(link) {
            return link.concat({
                offsetX: data.pos.get('x') - (link.get('x') || 0),
                offsetY: data.pos.get('y') - (link.get('y') || 0),
                clicked: true,
                selected: true
            });
         })
    );

    return data;
}

function startLinkingIfSelected(data, error, done) {
	var linkingNodes = data.nodeGui.
			filter(function(node) { return node.get('selected') === true; }).
			filter(function(node) { return hitTest(data.pos, linker(node)); }).
			map(function(node) { return node.set('linking', true); });

	data.nodeGui = data.nodeGui.merge(linkingNodes);

	if (linkingNodes.size > 0) {
		return done(data);
	} else {
		return data;
	}
}

var icon = require('../icon');

function startMovingIconIfSelected(data, error, done) {
	var linkingNodes = data.nodeGui.
			filter(function(node) { return node.get('selected') === true; }).
			filter(function(node) { return hitTest(data.pos, icon(node)); }).
			map(function(node) { return node.set('linking', true); });

	data.nodeGui = data.nodeGui.merge(linkingNodes);

	if (linkingNodes.size > 0) {
		return done(data);
	} else {
		return data;
	}
}

module.exports = mouseDownWare;