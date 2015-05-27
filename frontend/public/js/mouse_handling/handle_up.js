'use strict';

var middleware = require('./../middleware.js');
var hitTest = require('./../collisions.js').hitTest;
var linker = require('./../linker.js');
var Immutable = require('Immutable');

var mouseDownWare = middleware([
	link,
	stopClicked,
	stopLinking,
	stopMovingIcon
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

				// TODO: Add all relevant links to nodes so they may be deleted on node deletion.
				var nodeLinks = node.get('links');
				if(nodeLinks === undefined) {
					node.set('links', Immutable.List());
				}

				var collidedLinks = collided.get('links');
				if(collidedLinks === undefined) {
					collided.set('links', Immutable.List());
				}

				var nodeId     = node.get('id'),
					collidedId = collided.get('id');

				data.nodeGui = data.nodeGui.set(nodeId, data.nodeGui.get(nodeId).merge(Immutable.Map({
						links: node.get('links').push(id)
					})
				)).set(collidedId, data.nodeGui.get(collidedId).merge(Immutable.Map({
						links: collided.get('links').push(id)
					})
				));

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

function stopMovingIcon(data) {
	data.nodeGui = data.nodeGui.merge(
		data.nodeGui
		.filter(function(node) { return node.get('movingIcon') === true; })
		.map(function(node) {
			return node.delete('movingIcon');
		})
	);

	return data;
}

module.exports = mouseDownWare;