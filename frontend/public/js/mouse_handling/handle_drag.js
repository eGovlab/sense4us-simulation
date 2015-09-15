'use strict';

var middleware = require('./../middleware.js');

var mouseDownWare = middleware([
	moveLinker,
	moveIcon,
	moveClickedNodes,
	pan
]);

function pan(data) {
	data.settings = data.settings.set('offsetX', (data.settings.get('offsetX') || 0) - data.deltaPos.get('x'));
	data.settings = data.settings.set('offsetY', (data.settings.get('offsetY') || 0) - data.deltaPos.get('y'));
	
	return data;
}

function moveClickedNodes(data, error, done) {
	var movingNodes = data.nodeGui
		.filter(function(node) {return node.get('clicked') === true;})
		.map(function(node) {
			return node.concat({
				x: data.pos.get('x') - node.get('offsetX'),
				y: data.pos.get('y') - node.get('offsetY')
			});
		});
	
	data.nodeGui = data.nodeGui.merge(movingNodes);
	
	if (movingNodes.size > 0) {
		return done(data);
	}

	return data;
}

function moveLinker(data, error, done) {
	var movingLinker = data.nodeGui
		.filter(function(node) { return node.get('linking') === true; })
		.map(function(node) {
			return node.concat({
				linkerX: data.pos.get('x'),
				linkerY: data.pos.get('y')
			});
		});
			
	data.nodeGui = data.nodeGui.merge(movingLinker);
	
	if (movingLinker.size > 0) {
		return done(data);
	}

	return data;
}

function moveIcon(data, error, done) {
	var movingIcons = data.nodeGui
		.filter(function(node) { return node.get('movingIcon') === true; })
		.map(function(node) {
			return node.concat({
				iconXOffset: data.pos.get('x') - node.get('x'),
				iconYOffset: data.pos.get('y') - node.get('y')
			});
		});

	data.nodeGui = data.nodeGui.merge(movingIcons);

	if (movingIcons.size > 0) {
		return done(data);
	}
	
	return data;
}

module.exports = mouseDownWare;