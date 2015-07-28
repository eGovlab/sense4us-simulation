'use strict';

var middleware = require('./../middleware.js');
var hitTest = require('./../collisions.js').hitTest;
var linker = require('./../linker.js');
var aggregatedLink = require('./../aggregated_link.js');
var icon = require('../icon');

var mouseDownWare = middleware([
    startLinkingIfSelected,
    startMovingIconIfSelected,
    deselect
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

function startLinkingIfSelected(data, error, done) {
    // if a node is selected and we click the linker-symbol, then start linking!
	var linkingNodes = data.nodeGui.
			filter(function(node) { return node.get('selected') === true; }).
			filter(function(node) { return hitTest(data.pos, linker(node)); }).
			map(function(node) { return node.set('linking', true); });

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