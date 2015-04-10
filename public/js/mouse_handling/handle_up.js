'use strict';

var Immutable = require('Immutable');
var hitTest = require('./../collisions.js').hitTest;
var linker = require('./../linker.js');
var generateId = require('./../generate_id.js');

function handleUp(event, data) {
	data.nodes = data.nodes.merge(data.nodes
					.filter(function(node) { return node.get('linking') === true; })
					.map(function(node) {
						var hit = data.nodes.filter(function(maybeCollidingNode) {
							return maybeCollidingNode.get('linking') !== true && hitTest(maybeCollidingNode, linker(node));
						});

						hit = hit.forEach(function(collided) {
							var id = generateId();
							data.links = data.links.set(id, Immutable.Map({
								id: id,
								node1: node.get('id'),
								node2: collided.get('id'),
								width: 14
							}));
						});

						node = node.delete('linkerX').delete('linkerY').delete('linking');
						return node;
					}));

	data.nodes = data.nodes.merge(data.nodes
										.filter(function(node) { return node.get('clicked') === true; })
										.map(function(node) {return node.delete('clicked').delete('offsetX').delete('offsetY');}));

	data.links = data.links.merge(data.links
										.filter(function(link) { return link.get('clicked') === true; })
										.map(function(link) {return link.delete('clicked').delete('offsetX').delete('offsetY');}));

	return data;
}

module.exports = handleUp;