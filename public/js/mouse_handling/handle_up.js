'use strict';

var Immutable = require('Immutable');
var hitTest = require('./../collisions.js').hitTest;
var linker = require('./../linker.js');
var generateId = require('./../generate_id.js');

function removeClicked(objs) {
	objs = objs.merge(
			objs.filter(function(obj) { return obj.get('clicked') === true; })
				.map(function(obj) { return obj.delete('clicked').delete('offsetX').delete('offsetY'); })
	);
	return objs;
}

function delink(nodes) {
	return nodes.merge(nodes
					.filter(function(node) { return node.get('linking') === true; })
					.map(function(node) {
						return node.delete('linkerX').delete('linkerY').delete('linking');
					}));
}

function link(nodes, links) {
	nodes
		.filter(function(node) { return node.get('linking') === true; })
		.forEach(function(node) {
			var hit = nodes.filter(function(maybeCollidingNode) {
				return maybeCollidingNode.get('linking') !== true && hitTest(maybeCollidingNode, linker(node));
			});

			hit = hit.forEach(function(collided) {
				var id = generateId();

				links = links.set(id, Immutable.Map({
					id: id,
					x1: node.get('x'),
					y1: node.get('y'),
					x2: collided.get('x'),
					y2: collided.get('y'),
					node1: node.get('id'),
					node2: collided.get('id'),
					width: 14
				}));
			});
		});

	return links;
}

module.exports = [
{
	column: 'links',
	params: ['nodes', 'links'],
	func: link
},
{
	column: 'nodes',
	func: delink
},
{
	column: 'nodes',
	func: removeClicked
},
{
	column: 'links',
	func: removeClicked
}
];