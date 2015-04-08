'use strict';
/*
var node_constructor = require('../entities/node.js');
var node_graphics = require('../graphics/node.js');
var draggable = require('../mechanics/draggable.js');
*/

var Immutable = require('Immutable');

module.exports = function(id, signal, signal_fire, type, name, x, y, stage) {
	/*var node = node_constructor(id);

	var template_name = 'node_name';
	if(name !== null && typeof name === 'string')
		template_name = name;

	if(x !== undefined && y !== undefined) {
		node.set('x', x);
		node.set('y', y);
	}

	node.set('name', template_name);
	node.set('signal', signal);
	node.set('signal_fire', signal_fire);
	
	if(type && type.toUpperCase() === 'ORIGIN') {
		node.set('draw_type', 'ORIGIN');
		node.graphics = node_graphics(node, stage, 'origin');
	} else {
		node.graphics = node_graphics(node, stage);
	}

	stage.addChild(node.graphics.container);
	stage.update();
	draggable(node.graphics);*/

	var node = Immutable.Map({id: id, signal: signal, signal_fire: signal_fire, type: type, name: name, x: x, y: y, stage: stage});

	return node;
};