'use strict';

var middleware = require('./../middleware.js');
var hitTest = require('./../collisions.js').hitTest;
var linker = require('./../linker.js');
var Immutable = require('Immutable');

var mouseDownWare = middleware([
	link,
	stopClicked,
	stopLinking
]);

function stopClicked(data) {
	data.nodeGui = data.nodeGui.merge(
			data.nodeGui.filter(function(obj) { return obj.get('clicked') === true; })
				.map(function(obj) { return obj.delete('clicked').delete('offsetX').delete('offsetY'); })
	);

	return data;
}

function link(data) {
	data.nodeGui
		.filter(function(node) { return node.get('linking') === true; })
		.forEach(function(node) {
			var hit = data.nodeGui.filter(function(maybeCollidingNode) {
				return maybeCollidingNode.get('linking') !== true && hitTest(maybeCollidingNode, linker(node));
			}).slice(-1);

			hit = hit.forEach(function(collided) {
				var id = data.links.size;

				data.links = data.links.set(id, Immutable.Map({
					id: id,
					node1: node.get('id'),
					node2: collided.get('id'),
					coefficient: 1,
					type: 'fullchannel',
					timelag: 0,
					width: 14
				}));
			});
		});

	return data;
}

function stopLinking(data) {
	data.nodeGui = data.nodeGui.merge(
		data.nodeGui
		.filter(function(node) { return node.get('linking') === true; })
		.map(function(node) {
			return node.delete('linkerX').delete('linkerY').delete('linking');
		})
	);

	return data;
}

module.exports = mouseDownWare;