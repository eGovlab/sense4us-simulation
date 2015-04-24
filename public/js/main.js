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

var toRender = false;

var draw_node = require('./graphics/draw_node.js');
draw_node = curry(draw_node, main_canvas.getContext('2d'));

var createNode = function(x, y) {
    var id = generateId();
    nodeData = nodeData.set(id, Immutable.Map({
        id: id,
        signal: 0,
        signal_fire: 0
    }));

    nodeGui = nodeGui.set(id, Immutable.Map({
        id: id,
        x: x || 200,
        y: y || 100,
        radius: 75
    }));

    toRender = true;
};

var sendData = function() {
    var httpRequest = new XMLHttpRequest();

    if (!httpRequest) {
      console.log('Giving up :( Cannot create an XMLHTTP instance');
      return false;
    }

    httpRequest.onreadystatechange = function() {
        if (httpRequest.readyState === 4) {
          if (httpRequest.status === 200) {
            console.log(httpRequest.responseText);
          } else {
            console.log('There was a problem with the request.');
          }
        }
    };

    httpRequest.open('POST', 'http://127.0.0.1:3001/derp');
    httpRequest.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    httpRequest.send('nodes=' + encodeURIComponent(JSON.stringify(nodeData.toJSON())) + '&links=' + encodeURIComponent(JSON.stringify(links.toJSON())));
};

// create the main menu
require('./create_menus.js')(document.getElementById('menu_container'), createNode, sendData);

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
    toRender = true;
};

var fixInputForLink = function(link) {
    link = link.concat({
        node1: parseInt(link.get('node1')),
        node2: parseInt(link.get('node2'))
    });

    return link;
};

/*var mouseHandler = new (require("./mouse_handling/handle_mouse.js"))();
mouseHandler.addHandler("mouseDown", require('./mouse_handling/handle_down.js'));
mouseHandler.addHandler("mouseUp",   require('./mouse_handling/handle_up.js'));
mouseHandler.addHandler("mouseMove", require('./mouse_handling/handle_drag.js'));*/

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

var handleMouse = require('./mouse_handling/handle_mouse.js') (
    require('./mouse_handling/handle_down.js'),
    require('./mouse_handling/handle_drag.js'),
    require('./mouse_handling/handle_up.js')
);

var selected_menu = null;

function refresh() {
    if(mouseQueue.size === 0 && !toRender) {
        window.requestAnimationFrame(refresh);
        return;
    }

    context.clearRect(0, 0, main_canvas.width, main_canvas.height);

    // handle the mouse events
    var data = {mouseQueue: mouseQueue, nodeGui: nodeGui, links: links};
    
    //data = mouseHandler.handleQueue(data);
    data = handleMouse(data);

    nodeGui = nodeGui.merge(data.nodeGui);
    links = links.merge(data.links);
    mouseQueue = data.mouseQueue;

    // draw the links
    links.forEach(draw_link);

    // get all the selected objects
    var selected = nodeData
        .filter(function(node) { return nodeGui.get(node.get('id')).get('selected') === true; })
        .map(function(node) { return node.merge(nodeGui.get(node.get('id'))); })
        .merge(
            links.filter(function(link) { return link.get('selected') === true; })
        );

    // if there are nodeData selected that aren't currently linking, we want to draw the linker
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

    // draw all the nodeData
    nodeData.forEach(
        function(n) { return draw_node(n.merge(nodeGui.get(n.get('id')))); }
    );

    // if we are linking, we want to draw the dot above everything else
    nodeGui.filter(function(node) {return node.get('linking') === true; }).forEach(draw_linker);

    // update the menu
    selected_menu = draw_selected_menu(selected_menu, selected.last(), updateSelected);
    toRender = false;

    window.requestAnimationFrame(refresh);
}

refresh();