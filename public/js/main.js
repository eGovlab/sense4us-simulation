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

var createNode = function(x, y, type) {
    if(typeof x !== "number") {
        x = false;
    }

    if(typeof y !== "number") {
        y = false;
    }

    if(typeof type !== "string") {
        type = false;
    }

    var id = generateId();
    nodeData = nodeData.set(id, Immutable.Map({
        id: id,
        signal: 0,
        signal_fire: 0,
        type: type || "node"
    }));

    nodeGui = nodeGui.set(id, Immutable.Map({
        id: id,
        x: x || 200,
        y: y || 100,
        radius: 75
    }));

    refresh();
};
var createOriginNode = function() {
    createNode(100, 100, 'origin');
}
var createActorNode = function() {
    createNode(100, 100, 'actor');
}

var network = require('./network/network_layer.js');
network.setDomain("localhost:3000");

var sendAllData = function() {
    network.sendData("/models/save", {
        nodes: nodeData.merge(nodeGui).toJSON(),
        links: links.toJSON()
    });
};

var requestMove = function() {
    var data = {
        nodes: nodeData.merge(nodeGui).toJSON(),
        links: links.toJSON()
    };

    network.sendData("/models/move", data, function(response) {
        var nodes = response.response.nodes;

        Object.keys(nodes).forEach(function(id) {
            var node = nodes[id];
            nodeGui = nodeGui.set(node.id, Immutable.Map({
                id: node.id,
                x: node.x,
                y: node.y,
                radius: node.radius
            }));
        });

        refresh();
    });
}

/*
** Create the main menu
*/

var menuLayer = require("./create_menu.js");
menuLayer.setMenuContainer(document.getElementById("upper_menu"));
menuLayer.setSidebarContainer(document.getElementById("menu_container"));
menuLayer.createMenu(
    {
        header: "Mode"
    },

    {
        header: "Model",
        callback: function(){
            menuLayer.activateSidebar("model");
        }
    },

    {
        header: "Simulate",
        callback: function() {
            menuLayer.activateSidebar("simulate");
        }
    }
);

menuLayer.createSidebar("model",
    {
        header: "Create node",
        callback: createNode
    },

    {
        header: "Create origin",
        callback: createOriginNode
    },

    {
        header: "Create actor",
        callback: createActorNode
    },

    {
        header: "Send all data",
        callback: sendAllData
    },

    {
        header: "Move all nodes right 50 pixels.",
        callback: requestMove
    }
);

menuLayer.createSidebar("simulate",
    {
        header: "Move all nodes left 50 pixels.",
        callback: requestMove
    }
);

menuLayer.activateSidebar("model");

var nodeGui = Immutable.Map();

window.Immutable = Immutable;
window.collisions = require('./collisions.js');

createNode(200, 100);
createNode(220, 120);
createNode(240, 140);
createNode(260, 160);
createNode(280, 180);
createNode(300, 200);

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
        nodeData = nodeData.set(newSelected.get('id'), Immutable.Map({id: newSelected.get('id'), signal: newSelected.get('signal'), signalFire: newSelected.get('signalFire')}));
        nodeGui = nodeGui.set(newSelected.get('id'), Immutable.Map({id: newSelected.get('id'), x: newSelected.get('x'), y: newSelected.get('y'), radius: newSelected.get('radius')}));
    }

    refresh();
};

var fixInputForLink = function(link) {
    link = link.concat({
        node1: parseInt(link.get('node1')),
        node2: parseInt(link.get('node2'))
    });

    return link;
};

var dragHandler = require('./mechanics/drag_handler.js');
var mouseDownWare = require('./mouse_handling/handle_down.js');
var mouseMoveWare = require('./mouse_handling/handle_drag.js');
var mouseUpWare = require('./mouse_handling/handle_up.js');

dragHandler(
    main_canvas,
    function mouseDown(pos) {
        var data = mouseDownWare({pos: Immutable.Map({x: pos.x, y: pos.y}), nodeGui: nodeGui, links: links});
        nodeGui = nodeGui.merge(data.nodeGui);
        links = links.merge(data.links);

        refresh();

        return true;
    },
    function mouseMove(pos) {
        var data = mouseMoveWare({pos: Immutable.Map({x: pos.x, y: pos.y}), nodeGui: nodeGui, links: links});
        nodeGui = nodeGui.merge(data.nodeGui);
        links = links.merge(data.links);

        refresh();
    },
    function mouseUp(pos) {
        var data = mouseUpWare({pos: Immutable.Map({x: pos.x, y: pos.y}), nodeGui: nodeGui, links: links});
        nodeGui = nodeGui.merge(data.nodeGui);
        links = links.merge(data.links);

        refresh();
    }
);

var aggregatedLink = function(link, nodes) {
    return Immutable.Map({
        x1: nodes.get(link.get('node1')).get('x'),
        y1: nodes.get(link.get('node1')).get('y'),
        x2: nodes.get(link.get('node2')).get('x'),
        y2: nodes.get(link.get('node2')).get('y'),
        width: link.get('width')
    });
};

var selected_menu = null;

function _refresh() {
    context.clearRect(0, 0, main_canvas.width, main_canvas.height);

    // draw the links
    links.forEach(function(link) {
        draw_link(aggregatedLink(link, nodeGui));
    });

    // get all the selected objects
    var selected = nodeData
        .filter(function(node) { return nodeGui.get(node.get('id')).get('selected') === true; })
        .map(function(node) { return node.merge(nodeGui.get(node.get('id'))); })
        .merge(
            links.filter(function(link) { return link.get('selected') === true; })
        );

    // if there are nodes selected that aren't currently linking, we want to draw the linker
    nodeGui.filter(function(node) {return node.get('selected') === true && node.get('linking') !== true;}).forEach(draw_linker);

    // if we are currently linking, we want to draw the link we're creating
    nodeGui.filter(function(node) {return node.get('linking') === true; }).forEach(function(node) {
        var linkerForNode = linker(node);
        draw_link(
            Immutable.Map({
                x1: node.get('x'), y1: node.get('y'),
                x2: linkerForNode.get('x'), y2: linkerForNode.get('y'),
                width: linkerForNode.get('radius')
            })
        );
    });

    // draw all the nodes
    nodeData.forEach(
        function(n) { return draw_node(n.merge(nodeGui.get(n.get('id')))); }
    );

    // if we are linking, we want to draw the dot above everything else
    nodeGui.filter(function(node) {return node.get('linking') === true; }).forEach(draw_linker);

    // update the menu
    selected_menu = draw_selected_menu(selected_menu, selected.last(), updateSelected);
}

function refresh() {
    window.requestAnimationFrame(_refresh);
}

refresh();