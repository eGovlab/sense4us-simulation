'use strict';

var curry = require('./curry.js');

var Immutable = require('Immutable');

var canvas = require('./canvas/');
var hitTest = require('./collisions.js').hitTest;

var nodes = Immutable.Map();
var links = Immutable.Map();

var main_canvas = canvas(document.getElementById('canvas'), document.getElementById('container'));
var draw_node = require('./graphics/draw_node.js');
draw_node = curry(draw_node, main_canvas.getContext('2d'));

var getLinks = function(attribute) {
	if (attribute) {
		return links.filter(function(node) {return node.get(attribute) === true;});
	} else {
		return links;
	}
};

var mergeLinks = function(newLinks) {
	links = links.merge(newLinks);
};

var getNodes = function(attribute) {
	if (attribute) {
		return nodes.filter(function(node) {return node.get(attribute) === true;});
	} else {
		return nodes;
	}
};

var mergeNodes = function(newNodes) {
	nodes = nodes.merge(newNodes);
};

var linker = function(node) {
	return Immutable.Map({
		x: (node.get('linkerX') || node.get('x') + node.get('radius') * 0.9),
		y: (node.get('linkerY') || node.get('y') + node.get('radius') * 0.9),
		radius: node.get('radius') / 10
	});
};

var temp_id = 0;

var generateId = function() {
	temp_id++;
	return temp_id;
};

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
		mergeLinks(getLinks().map(function(link) {
			if (link.get('selected')) {
				return fixInputForLink(newSelected);
			}

			return link;
		}));
	} else {
		mergeNodes(getNodes().map(function(node) {
			if (node.get('selected')) {
				node = newSelected;
			}

			return node;
		}));
	}
};

var fixInputForLink = function(link) {
	link = link.concat({
		node1: parseInt(link.get('node1')),
		node2: parseInt(link.get('node2'))
	});

	return link;
};

var aggregateLine = function(nodes, link) {
	var node1 = nodes.get(link.get('node1'));
	var node2 = nodes.get(link.get('node2'));

	return Immutable.Map({
		x1: node1.get('x'),
		y1: node1.get('y'),
		x2: node2.get('x'),
		y2: node2.get('y'),
		width: link.get('width')
	});
};

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

var genericMouseDownHandler = function(objs, pos, condition, mapping) {
	condition = condition || function(obj) {
		return hitTest(
			mousePosState,
			obj
		);
	};

	mapping = mapping || function(obj) {
		return obj.concat({
			offsetX: pos.get('x') - obj.get('x'),
			offsetY: pos.get('y') - obj.get('y'),
			clicked: true,
			selected: true
		});
	};

	var clickedObjs = objs.filter(condition).map(mapping).slice(-1);

	return clickedObjs;
};

var mouseDownState = false;
var mouseHeldState = false;
var mouseUpState = false;

var mousePosState = null;

var dragHandler = require('./mechanics/drag_handler.js');
dragHandler(
	main_canvas,
	function mouseDown(pos) {mouseDownState = true; mousePosState = Immutable.Map({x: pos.x, y: pos.y}); return true;},
	function mouseMove(pos) {mouseHeldState = true; mousePosState = Immutable.Map({x: pos.x, y: pos.y});},
	function mouseUp(pos) {mouseUpState = true; mousePosState = Immutable.Map({x: pos.x, y: pos.y});}
);

function handleMouse() {
	if (mouseDownState) {
		var nodes = genericMouseDownHandler(getNodes(), mousePosState,
			function(node) {
				return node.get('selected') === true && hitTest(mousePosState, linker(node));
			},
			function(node) {
				return node.set('linking', true);
			}
		);

		mergeNodes(nodes);

		if (nodes.size === 0) {
			mergeNodes(getNodes().filter(function(obj) {return obj.get('selected') === true;}).map(function(obj) {return obj.delete('selected');}));
			mergeLinks(getLinks().filter(function(obj) {return obj.get('selected') === true;}).map(function(obj) {return obj.delete('selected');}));
		}

		mergeNodes(genericMouseDownHandler(getNodes(), mousePosState));

		mergeLinks(genericMouseDownHandler(getLinks(), mousePosState,
				function(link) {
					return hitTest(
						mousePosState,
						aggregateLine(
							getNodes(),
							link
						)
					);
				}
		));

		mouseDownState = false;
		mouseHeldState = true;
	} else if (mouseUpState) {
		mergeNodes(getNodes('linking').map(function(node) {
			var hit = getNodes().filter(function(maybeCollidingNode) {
				return maybeCollidingNode.get('linking') !== true && hitTest(maybeCollidingNode, linker(node));
			});

			hit = hit.forEach(function(collided) {
				var id = generateId();
				mergeLinks(getLinks().set(id, Immutable.Map({
					id: id,
					node1: node.get('id'),
					node2: collided.get('id'),
					width: 14
				})));
			});

			node = node.delete('linkerX').delete('linkerY').delete('linking');
			return node;
		}));

		mergeNodes(getNodes('clicked').map(function(node) {return node.delete('clicked').delete('offsetX').delete('offsetY');}));
		mergeLinks(getLinks('clicked').map(function(link) {return link.delete('clicked').delete('offsetX').delete('offsetY');}));

		mouseUpState = false;
		mouseHeldState = false;
	} else if (mouseHeldState) {
		mergeNodes(getNodes().filter(function(node) {return node.get('clicked') === true;}).map(function(node) {return node.concat({
			x: mousePosState.get('x') - node.get('offsetX'),
			y: mousePosState.get('y') - node.get('offsetY')
		});}));
		
		mergeNodes(getNodes('linking').map(function(node) {return node.concat({linkerX: mousePosState.get('x'), linkerY: mousePosState.get('y')});}));
	}
}

var selected_menu = null;
function refresh() {
	context.clearRect(0, 0, main_canvas.width, main_canvas.height);

	getLinks().forEach(function(link) {
		draw_link(
			aggregateLine(getNodes(), link)
		);
	});

	handleMouse();

	var selected = getNodes('selected').merge(getLinks('selected'));

	getNodes().filter(function(node) {return node.get('selected') === true && node.get('linking') !== true;}).forEach(draw_linker);

	getNodes('linking').forEach(function(node) {
		var linkerForNode = linker(node);
		draw_link(
			Immutable.Map({
				x1: node.get('x'), y1: node.get('y'),
				x2: linkerForNode.get('x'), y2: linkerForNode.get('y'),
				width: linkerForNode.get('radius')
			})
		);
	});

	getNodes().forEach(draw_node);

	getNodes('linking').forEach(draw_linker);

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