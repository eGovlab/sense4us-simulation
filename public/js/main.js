'use strict';

var curry = require('./curry.js');

var Immutable = require('Immutable');

var canvas = require('./canvas/');

var nodes = Immutable.Map();
var links = Immutable.Map();

var linker = require('./linker.js');

var main_canvas = canvas(document.getElementById('canvas'), document.getElementById('container'));
var draw_node = require('./graphics/draw_node.js');
draw_node = curry(draw_node, main_canvas.getContext('2d'));

var generateId = require('./generate_id.js');

var createNode = function() {
	var id = generateId();
	nodes = nodes.set(id, Immutable.Map({
		id: id,
		signal: 0,
		signal_fire: 0,
		x: 200,
		y: 100,
		radius: 75
	}));
};

// create the main menu
require('./create_menus.js')(document.getElementById('menu_container'),
	createNode
);

window.Immutable = Immutable;
window.collisions = require('./collisions.js');

var draw_selected_menu = curry(require('./selected_menu.js'), document.getElementById('menu_container'));
var draw_linker = curry(require('./graphics/draw_linker.js'), main_canvas.getContext('2d'), linker);
var draw_link = curry(require('./graphics/draw_link.js'), main_canvas.getContext('2d'));

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
		nodes = nodes.map(function(node) {
			if (node.get('selected')) {
				node = newSelected;
			}

			return node;
		});
	}
};

var fixInputForLink = function(link) {
	link = link.concat({
		node1: parseInt(link.get('node1')),
		node2: parseInt(link.get('node2'))
	});

	return link;
};
/*
var nodesMouseDownHandler = function(nodes, pos) {
	var clickedNodes = nodes.filter(function(node) {return node.get('linking') === true || hitTest(pos, node);}).map(function(node) {return node.concat({
		offsetX: pos.get('x') - node.get('x'),
		offsetY: pos.get('y') - node.get('y'),
		clicked: true,
		selected: true
	});}).slice(-1);

	nodes = nodes.merge(nodes.filter(function(node) {return node.get('selected') === true;}).map(function(node) {return node.delete('selected');}));

	if (clickedNodes.size > 0) {
		nodes = nodes.merge(clickedNodes);
	}

	return nodes;
};
*/

var mouseQueue = Immutable.List();

var dragHandler = require('./mechanics/drag_handler.js');
dragHandler(
	main_canvas,
	function mouseDown(pos) {mouseQueue = mouseQueue.push(Immutable.Map({event: 'mouseDown', pos: Immutable.Map({x: pos.x, y: pos.y})})); return true;},
	function mouseMove(pos) {mouseQueue = mouseQueue.push(Immutable.Map({event: 'mouseMove', pos: Immutable.Map({x: pos.x, y: pos.y})}));},
	function mouseUp(pos) {mouseQueue = mouseQueue.push(Immutable.Map({event: 'mouseUp', pos: Immutable.Map({x: pos.x, y: pos.y})}));}
);

var handleMouse = require('./mouse_handling/handle_mouse.js')([require('./mouse_handling/handle_down.js')], [require('./mouse_handling/handle_move.js')], [require('./mouse_handling/handle_up.js')]);

var selected_menu = null;
function refresh() {
	context.clearRect(0, 0, main_canvas.width, main_canvas.height);

	links.forEach(function(link) {
		draw_link(
			require('./aggregate_line.js')(nodes, link)
		);
	});

	var data = {mouseQueue: mouseQueue, nodes: nodes, links: links};
	
	data = handleMouse(data);

	nodes = nodes.merge(data.nodes);
	links = links.merge(data.links);
	mouseQueue = data.mouseQueue;

	var selected = nodes
						.filter(function(node) { return node.get('selected') === true; })
						.merge(
							links.filter(function(link) { return link.get('selected') === true; })
						);

	nodes.filter(function(node) {return node.get('selected') === true && node.get('linking') !== true;}).forEach(draw_linker);

	nodes.filter(function(node) { return node.get('linking') === true; }).forEach(function(node) {
		var linkerForNode = linker(node);
		draw_link(
			Immutable.Map({
				x1: node.get('x'), y1: node.get('y'),
				x2: linkerForNode.get('x'), y2: linkerForNode.get('y'),
				width: linkerForNode.get('radius')
			})
		);
	});

	nodes.forEach(draw_node);

	nodes.filter(function(node) {return node.get('linking') === true; }).forEach(draw_linker);

	selected_menu = draw_selected_menu(selected_menu, selected.last(), updateSelected);

	window.requestAnimationFrame(refresh);
}

refresh();

//var selection_menu = require('./selection_menu');

/*sense4us.selection_menu.graphics = sense4us.graphics.selection_menu(sense4us.selection_menu, sense4us.stage);
sense4us.mechanics.selection_menu(sense4us.selection_menu.graphics.dragging_thingy);
*/
/*

sense4us.events.bind('object_updated', function(object) {
	sense4us.stage.update();
});

sense4us.menu.open('edit');
*/