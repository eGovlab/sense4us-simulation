'use strict';

var middleware = require('./../middleware.js');

var mouseDownWare = middleware([
	moveLinker,
	moveIcon,
	moveClickedNodes,
	pan
]);

function pan(data) {
	data.settings.offsetX = (data.settings.offsetX || 0) - data.deltaPos.x;
	data.settings.offsetY = (data.settings.offsetY || 0) - data.deltaPos.y;
	
	return data;
}

function moveClickedNodes(data, error, done) {
	var movingNodes = data.nodeGui
		.filter(function(node) {return node.clicked === true;})
		.map(function(node) {
			return node.merge({
				x: data.pos.x - node.offsetX,
				y: data.pos.y - node.offsetY
			});
		});
	
	data.nodeGui = data.nodeGui.merge(movingNodes);
	
	if (Object.keys(movingNodes).length > 0) {
		return done(data);
	}

	return data;
}

function moveLinker(data, error, done) {
	var movingLinker = data.nodeGui
		.filter(function(node) { return node.linking === true; })
		.map(function(node) {
			return node.merge({
				linkerX: data.pos.x,
				linkerY: data.pos.y
			});
		});
			
	data.nodeGui = data.nodeGui.merge(movingLinker);
	
	if (Object.keys(movingLinker).length > 0) {
		return done(data);
	}

	return data;
}

function moveIcon(data, error, done) {
	var movingIcons = data.nodeGui
		.filter(function(node) { return node.movingIcon === true; })
		.map(function(node) {
			return node.merge({
				iconXOffset: data.pos.x - node.x,
				iconYOffset: data.pos.y - node.y
			});
		});

	data.nodeGui = data.nodeGui.merge(movingIcons);

	if (Object.keys(movingIcons).length > 0) {
		return done(data);
	}
	
	return data;
}

module.exports = mouseDownWare;