'use strict';

module.exports = [
{
	column: 'nodes',
	func: function(nodes, event) {
		return nodes.merge(nodes
				.filter(function(node) {return node.get('clicked') === true;})
				.map(function(node) {
					return node.concat({
						x: event.get('pos').get('x') - node.get('offsetX'),
						y: event.get('pos').get('y') - node.get('offsetY')
					});
				}));
	}
},
{
	column: 'nodes',
	func: function(nodes, event) {
		return nodes.merge(nodes
				.filter(function(node) { return node.get('linking') === true; })
				.map(function(node) {
					return node.concat({
						linkerX: event.get('pos').get('x'),
						linkerY: event.get('pos').get('y')
					});
				}));
	}
},
{
	params: ['nodes', 'links'],
	column: 'links',
	func: function(nodes, links) {
		var movedNodes = nodes
							.filter(
								function(node) {
									return node.get('clicked') === true;
								}
							);

		var linksToUpdate = links.filter(
			function(link) {
				return movedNodes.filter(
					function(node) { return node.id === link.get('node1') || node.id === link.get('node2').length > 0; }
				);
			}
		);

		linksToUpdate = linksToUpdate.map(function(link) {
			return link.merge({
				x1: nodes.get(link.get('node1')).get('x'),
				y1: nodes.get(link.get('node1')).get('y'),
				x2: nodes.get(link.get('node2')).get('x'),
				y2: nodes.get(link.get('node2')).get('y'),
			});
		});

		return links.merge(linksToUpdate);
	}
}
];