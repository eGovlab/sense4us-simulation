'use strict';

var hitTest = require('./../collisions.js').hitTest;
var linker = require('./../linker.js');
var curry = require('./../curry.js');

var specificMouseDownHandler = function(condition, mapping, objs, event) {
	var pos = event.get('pos');

	condition = condition || function(pos, obj) {
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

	var clickedObjs = objs.filter(curry(condition, pos)).map(mapping).slice(-1);

	return objs.merge(clickedObjs);
};

var genericMouseDownHandler = function(objs, event) {
	return specificMouseDownHandler(null, null, objs, event);
};

function deselect(maps) {
	return maps.merge(maps.filter(function(obj) {return obj.get('selected') === true;}).map(function(obj) {return obj.delete('selected');}));
}

function deselectIfNotLinking(objs) {
	var linking_objs = objs.filter(function(obj) { return obj.get('linking') === true; });

	if (linking_objs.size === 0) {
		linking_objs = deselect(objs);
	}

	return objs.merge(linking_objs);
}

module.exports = [
	{
		column: 'nodes',
		func: curry(specificMouseDownHandler,
			function(pos, node) {
				return node.get('selected') === true && hitTest(pos, linker(node));
			},
			function(node) {
				return node.set('linking', true);
			}
		)
	},
	{
		column: 'nodes',
		func: deselectIfNotLinking
	},
	{
		column: 'links',
		func: deselectIfNotLinking
	},
	{
		column: 'nodes',
		func: genericMouseDownHandler
	},
	{
		column: 'links',
		func: genericMouseDownHandler
	}
];