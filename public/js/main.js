'use strict';

var curry = require('./curry.js');
var Immutable = require('Immutable');
var canvas = require('./canvas/');
var linker = require('./linker.js');
var generateId = require('./generate_id.js');

var main_canvas = canvas(document.getElementById('canvas'), document.getElementById('container'));

var draw_selected_menu = curry(require('./selected_menu.js'), document.getElementById('menu_container'));
var draw_linker = curry(require('./graphics/draw_linker.js'), main_canvas.getContext('2d'), linker);
var draw_link = curry(require('./graphics/draw_link.js'), main_canvas.getContext('2d'));

var nodeData = Immutable.Map();
var links = Immutable.Map();

var draw_node = require('./graphics/draw_node.js');
draw_node = curry(draw_node, main_canvas.getContext('2d'));

var createNode = function() {
	var id = generateId();
	nodeData = nodeData.set(id, Immutable.Map({
		id: id,
		signal: 0,
		signal_fire: 0
	}));

	nodeGui = nodeGui.set(id, Immutable.Map({
		id: id,
		x: 200,
		y: 100,
		radius: 75
	}));
};

// create the main menu
require('./create_menus.js')(document.getElementById('menu_container'), createNode);

var nodeGui = Immutable.Map();

window.Immutable = Immutable;
window.collisions = require('./collisions.js');

createNode();
createNode();

var context = main_canvas.getContext('2d');

var updateSelected = function(newSelected) {
	if (newSelected.get('node1') && newSelected.get('node2')) {
		links = links.map(function(link) {
			if (link.get('selected')) {
				return fixInputForLink(newSelected);
			}

			return link;
		});
	} else {
		nodeData = nodeData.set(newSelected.get('id'), newSelected);
	}
};

var fixInputForLink = function(link) {
	link = link.concat({
		node1: parseInt(link.get('node1')),
		node2: parseInt(link.get('node2'))
	});

	return link;
};

var mouseQueue = Immutable.List();

var dragHandler = require('./mechanics/drag_handler.js');
dragHandler(
	main_canvas,
	function mouseDown(pos) {
		mouseQueue = mouseQueue.push(Immutable.Map({event: 'mouseDown', pos: Immutable.Map({x: pos.x, y: pos.y})}));
		return true;
	},
	function mouseMove(pos) {
		mouseQueue = mouseQueue.push(Immutable.Map({event: 'mouseMove', pos: Immutable.Map({x: pos.x, y: pos.y})}));
	},
	function mouseUp(pos) {
		mouseQueue = mouseQueue.push(Immutable.Map({event: 'mouseUp', pos: Immutable.Map({x: pos.x, y: pos.y})}));
}
);

var handleMouse = require('./mouse_handling/handle_mouse.js')(
							require('./mouse_handling/handle_down.js'),
							require('./mouse_handling/handle_drag.js'),
							require('./mouse_handling/handle_up.js')
						 );

var selected_menu = null;

function refresh() {
	context.clearRect(0, 0, main_canvas.width, main_canvas.height);


	// handle the mouse events
	var data = {mouseQueue: mouseQueue, nodeGui: nodeGui, links: links};
	
	data = handleMouse(data);

	nodeGui = nodeGui.merge(data.nodeGui);
	links = links.merge(data.links);
	mouseQueue = data.mouseQueue;

	// draw the links
	links.forEach(draw_link);

	// get all the selected objects
	var selected = nodeData
		.filter(function(node) { return nodeGui.get(node.get('id')).get('selected') === true; })
		.merge(
			links.filter(function(link) { return link.get('selected') === true; })
		);

	// if there are nodeData selected that aren't currently linking, we want to draw the linker
	nodeGui.filter(function(node) {return node.get('selected') === true && node.get('linking') !== true;}).forEach(draw_linker);

	// if we are currently linking, we want to draw the link we're creating
	nodeGui.filter(function(node) { return node.get('linking') === true; }).forEach(function(node) {
		var linkerForNode = linker(node);
		draw_link(
			Immutable.Map({
				x1: node.get('x'), y1: node.get('y'),
				x2: linkerForNode.get('x'), y2: linkerForNode.get('y'),
				width: linkerForNode.get('radius')
			})
		);
	});

	// draw all the nodeData
	nodeData.forEach(
		function(n) { return draw_node(n.merge(nodeGui.get(n.get('id')))); }
	);

	// if we are linking, we want to draw the dot above everything else
	nodeGui.filter(function(node) {return node.get('linking') === true; }).forEach(draw_linker);

	// update the menu
	selected_menu = draw_selected_menu(selected_menu, selected.last(), updateSelected);

	window.requestAnimationFrame(refresh);
}

refresh();