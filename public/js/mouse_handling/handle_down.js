'use strict';

var hitTest = require('./../collisions.js').hitTest;
var linker = require('./../linker.js');
var aggregateLine = require('./../aggregate_line.js');

var genericMouseDownHandler = function(objs, pos, condition, mapping) {
	condition = condition || function(obj) {
		return hitTest(
			pos,
			obj
		);
	};

	mapping = mapping || function(obj) {
		return obj.concat({
			offsetX: pos.get('x') - (obj.get('x') || 0),
			offsetY: pos.get('y') - (obj.get('y') || 0),
			clicked: true,
			selected: true
		});
	};

	var clickedObjs = objs.filter(condition).map(mapping).slice(-1);

	return clickedObjs;
};

function handleDown(event, data) {
	var linking_nodes = genericMouseDownHandler(data.nodes, event.get('pos'),
		function(node) {
			return node.get('selected') === true && hitTest(event.get('pos'), linker(node));
		},
		function(node) {
			return node.set('linking', true);
		}
	);

	data.nodes = data.nodes.merge(linking_nodes);

	if (linking_nodes.size === 0) {
		data.nodes = data.nodes.merge(data.nodes.filter(function(obj) {return obj.get('selected') === true;}).map(function(obj) {return obj.delete('selected');}));
		data.links = data.links.merge(data.links.filter(function(obj) {return obj.get('selected') === true;}).map(function(obj) {return obj.delete('selected');}));
	}

	data.nodes = data.nodes.merge(genericMouseDownHandler(data.nodes, event.get('pos')));

	data.links = data.links.merge(genericMouseDownHandler(data.links, event.get('pos'),
			function(link) {
				return hitTest(
					event.get('pos'),
					aggregateLine(
						data.nodes,
						link
					)
				);
			}
	));

	return data;
}

module.exports = handleDown;