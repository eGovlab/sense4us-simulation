'use strict';

function handleMove(event, data) {
	data.nodes = data.nodes.merge(data.nodes
						.filter(function(node) {return node.get('clicked') === true;})
						.map(function(node) {
							return node.concat({
								x: event.get('pos').get('x') - node.get('offsetX'),
								y: event.get('pos').get('y') - node.get('offsetY')
							});
						}));
	
	data.nodes = data.nodes.merge(data.nodes
						.filter(function(node) { return node.get('linking') === true; })
						.map(function(node) {
							return node.concat({
								linkerX: event.get('pos').get('x'),
								linkerY: event.get('pos').get('y')
							});
						}));

	return data;
}

module.exports = handleMove;