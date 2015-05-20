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
var modelLayer = require("./model-layer.js");

var network = require('./network');

var selected_menu = null,
    loadedModel   = null,
    environment   = "model";

var draw_node = require('./graphics/draw_node.js');
draw_node = curry(draw_node, main_canvas.getContext('2d'));

/*
** Create the main menu
*/

var settings = require("./settings");
settings.initialize(
    document.getElementById("menu_container"),
    document.getElementById("upper_menu"),
    function() {
        var obj = {};

        Object.defineProperty(obj, "selected_menu", {
            get: function() {
                return selected_menu;
            },

            set: function(arg) {
                selected_menu = arg;
            }
        });

        Object.defineProperty(obj, "loadedModel", {
            get: function() {
                return loadedModel;
            },

            set: function(arg) {
                loadedModel = arg;
            }
        });

        Object.defineProperty(obj, "environment", {
            get: function() {
                return environment;
            },

            set: function(arg) {
                environment = arg;
            }
        });

        Object.defineProperty(obj, "refresh", {
            get: function() {
                return refresh;
            }
        });

        return obj;
    }
);

window.Immutable = Immutable;
window.collisions = require('./collisions.js');

var context = main_canvas.getContext('2d');

var updateSelected = function(newSelected) {
    if (newSelected.get("timelag") !== undefined && newSelected.get("coefficient") !== undefined) {
        var coefficient = parseFloat(newSelected.get("coefficient")),
            timelag     = parseInt(newSelected.get("timelag")),
            type        = newSelected.get("type");

        if(isNaN(coefficient) || isNaN(timelag)) {
            console.log("Coefficient:", newSelected.get("coefficient"));
            console.log("Timelag:",     newSelected.get("timelag"));
            return;
        }
        
        loadedModel.links = loadedModel.links.set(newSelected.get("id"),
            loadedModel.links.get(newSelected.get("id")).merge(Immutable.Map({
                    coefficient: newSelected.get("coefficient"),
                    timelag:     newSelected.get("timelag"),
                    type:        newSelected.get("type")
                })
            )
        );
    } else {
        loadedModel.nodeData = loadedModel.nodeData.set(newSelected.get("id"), 
            loadedModel.nodeData.get(newSelected.get("id")).merge(Immutable.Map({
                    id:             newSelected.get("id"),
                    value:          newSelected.get("value"),
                    relativeChange: newSelected.get("relativeChange")
                })
            )
        );

        loadedModel.nodeGui = loadedModel.nodeGui.set(newSelected.get("id"), 
            loadedModel.nodeGui.get(newSelected.get("id")).merge(Immutable.Map({
                    radius: newSelected.get("radius"),
                    avatar: newSelected.get("avatar"),
                })
            )
        );
        /*loadedModel.nodeGui = loadedModel.nodeGui.set(newSelected.get("id"),
            loadedModel.nodeGui.get(newSelected.get("id")).merge(newSelected.map(function(node) {
                return {
                    radius: node.get("radius")
                };
            }))
        );*/
        //loadedModel.nodeData = loadedModel.nodeData.set(newSelected.get('id'), Immutable.Map({id: newSelected.get('id'), value: newSelected.get('value'), relativeChange: newSelected.get('relativeChange'), type: newSelected.get("type")}));
        //loadedModel.nodeGui  = loadedModel.nodeGui.set(newSelected.get('id'), Immutable.Map({id: newSelected.get('id'), x: newSelected.get('x'), y: newSelected.get('y'), radius: newSelected.get('radius')}));
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
        var data = mouseDownWare({pos: Immutable.Map({x: pos.x, y: pos.y}), nodeGui: loadedModel.nodeGui, links: loadedModel.links});
        loadedModel.nodeGui = loadedModel.nodeGui.merge(data.nodeGui);
        loadedModel.links = loadedModel.links.merge(data.links);

        refresh();

        return true;
    },

    function mouseMove(pos) {
        var data = mouseMoveWare({pos: Immutable.Map({x: pos.x, y: pos.y}), nodeGui: loadedModel.nodeGui, links: loadedModel.links});
        loadedModel.nodeGui = loadedModel.nodeGui.merge(data.nodeGui);
        loadedModel.links = loadedModel.links.merge(data.links);

        refresh();
    },
    
    function mouseUp(pos) {
        var data = mouseUpWare({pos: Immutable.Map({x: pos.x, y: pos.y}), nodeGui: loadedModel.nodeGui, links: loadedModel.links});
        loadedModel.nodeGui = loadedModel.nodeGui.merge(data.nodeGui);
        loadedModel.links = loadedModel.links.merge(data.links);

        refresh();
    }
);

var aggregatedLink = require('./aggregated_link.js');


function _refresh() {
    context.clearRect(0, 0, main_canvas.width, main_canvas.height);

    //console.log(loadedModel.links.toJSON());

    // draw the links
    loadedModel.links.forEach(function(link) {
        draw_link(aggregatedLink(link, loadedModel.nodeGui));
    });

    // get all the selected objects
    var selected = loadedModel.nodeData
        .filter(function(node) { return loadedModel.nodeGui.get(node.get('id')).get('selected') === true; })
        .map(function(node) {
            return Immutable.Map({
                id: node.get("id"),
                value: node.get("value"),
                relativeChange: node.get("relativeChange")
            }).merge(
                Immutable.Map({
                        radius: loadedModel.nodeGui.get(node.get("id")).get("radius"),
                        avatar: loadedModel.nodeGui.get(node.get("id")).get("avatar")
                    })
            );
            
            //return node.merge(loadedModel.nodeGui.get(node.get('id')));
        })
        .merge(
            loadedModel.links.filter(function(link) {return link.get('selected') === true;})
            .map(function(link) {
                return Immutable.Map({
                    id: link.get("id"),
                    timelag: link.get("timelag"),
                    coefficient: link.get("coefficient"),
                    type: link.get("type"),
                    node1: link.get("node1"),
                    node2: link.get("node2")
                });
            })
        );

    // if there are nodes selected that aren't currently linking, we want to draw the linker
    loadedModel.nodeGui.filter(function(node) {return node.get('selected') === true && node.get('linking') !== true;}).forEach(draw_linker);

    // if we are currently linking, we want to draw the link we're creating
    loadedModel.nodeGui.filter(function(node) {return node.get('linking') === true; }).forEach(function(node) {
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
    loadedModel.nodeData.forEach(
        function(n) { 
            var nodeGui = n.merge(loadedModel.nodeGui.get(n.get('id')));
            draw_node(nodeGui, environment);
        }
    );

    // if we are linking, we want to draw the dot above everything else
    loadedModel.nodeGui.filter(function(node) {return node.get('linking') === true; }).forEach(draw_linker);

    // update the menu
    selected_menu = draw_selected_menu(selected_menu, selected.last(), updateSelected);
}

function refresh() {
    window.requestAnimationFrame(_refresh);
}

refresh();