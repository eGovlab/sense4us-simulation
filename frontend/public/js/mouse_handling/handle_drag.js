'use strict';

var middleware = require('./../middleware.js');

var mouseDownWare = middleware([
	moveClickedNodes,
	moveLinker,
	moveIcon
]);

function moveClickedNodes(data) {
		data.nodeGui = data.nodeGui.merge(
			data.nodeGui
				.filter(function(node) {return node.get('clicked') === true;})
				.map(function(node) {
					return node.concat({
						x: data.pos.get('x') - node.get('offsetX'),
						y: data.pos.get('y') - node.get('offsetY')
					});
				})
		);

		return data;
}

function moveLinker(data) {
	data.nodeGui = data.nodeGui.merge(
		data.nodeGui
			.filter(function(node) { return node.get('linking') === true; })
			.map(function(node) {
				return node.concat({
					linkerX: data.pos.get('x'),
					linkerY: data.pos.get('y')
				});
			})
	);

	return data;
}

function moveIcon(data) {
	data.nodeGui = data.nodeGui.merge(
		data.nodeGui
			.filter(function(node) { return node.get('movingIcon') === true; })
			.map(function(node) {
				return node.concat({
					iconXOffset: data.pos.get('x') - node.get('x'),
					iconYOffset: data.pos.get('y') - node.get('y')
				});
			})
	);

	return data;
}

module.exports = mouseDownWare;