'use strict';

var curry      = require('./curry.js'),
    Immutable  = require('Immutable'),
    canvas     = require('./canvas/'),
    linker     = require('./linker.js'),
    generateId = require('./generate_id.js');

var mainCanvas = canvas(document.getElementById('canvas'), refresh);

var drawSelectedMenu = curry(require('./selected_menu'), document.getElementById('sidebar')),
    drawLinker       = curry(require('./graphics/draw_linker.js'), mainCanvas.getContext('2d'), linker),
    drawLink         = curry(require('./graphics/draw_link.js'), mainCanvas.getContext('2d')),
    modelLayer       = require('./model_layer.js');

var network = require('./network');

var selectedMenu  = null,
    loadedModel   = null,
    environment   = 'model';

var drawNode = require('./graphics/draw_node.js');
    drawNode = curry(drawNode, mainCanvas.getContext('2d'));

var settings = require('./settings');
settings.initialize(
    document.getElementById('sidebar'),
    document.getElementById('upper-menu'),
    function() {
        var obj = {
            refresh: refresh
        };

        Object.defineProperty(obj, "selectedMenu", {
            get: function() {
                return selectedMenu
            }, 
            
            set: function(arg) {
                selectedMenu = arg;
            }
        });

        Object.defineProperty(obj, "loadedModel", {
            get: function() {
                return loadedModel
            }, 
            
            set: function(arg) {
                loadedModel = arg;
            }
        });

        Object.defineProperty(obj, "environment", {
            get: function() {
                return environment
            }, 
            
            set: function(arg) {
                environment = arg;
            }
        });

        return obj;
    }
);

window.Immutable  = Immutable;
window.collisions = require('./collisions.js');

var context = mainCanvas.getContext('2d');

var updateSelected = function(newSelected) {
    if (newSelected.get('timelag') !== undefined && newSelected.get('coefficient') !== undefined) {
        var coefficient = parseFloat(newSelected.get('coefficient')),
            timelag     = parseInt(newSelected.get('timelag')),
            type        = newSelected.get('type');

        if (isNaN(coefficient) || isNaN(timelag)) {
            console.log('Coefficient:', newSelected.get('coefficient'));
            console.log('Timelag:',     newSelected.get('timelag'));
            return;
        }

        if(newSelected.get('delete') === true) {
            console.log("LINK");
            console.log(newSelected);
            //loadedModel.links = loadedModel.links.delete(newSelected.get('id'));
            return;
        }
        
        loadedModel.links = loadedModel.links.set(newSelected.get('id'),
            loadedModel.links.get(newSelected.get('id')).merge(Immutable.Map({
                    coefficient: newSelected.get('coefficient'),
                    timelag:     newSelected.get('timelag'),
                    type:        newSelected.get('type')
                })
            )
        );
    } else if (newSelected.get('maxIterable') !== undefined) {
      loadedModel.settings = newSelected;
    } else {
        if(newSelected.get('delete') === true) {
            console.log("NODE");

            var seq = newSelected.get('links').toSeq();
            seq.forEach(function(linkId) {
                console.log(linkId);
            });
            return;
        }

        loadedModel.nodeData = loadedModel.nodeData.set(newSelected.get('id'), 
            loadedModel.nodeData.get(newSelected.get('id')).merge(Immutable.Map({
                    id:             newSelected.get('id'),
                    value:          newSelected.get('value'),
                    relativeChange: newSelected.get('relativeChange'),
                    description:    newSelected.get('description')
                })
            )
        );

        loadedModel.nodeGui = loadedModel.nodeGui.set(newSelected.get('id'), 
            loadedModel.nodeGui.get(newSelected.get('id')).merge(Immutable.Map({
                    radius: newSelected.get('radius'),
                    avatar: newSelected.get('avatar'),
                    icon: newSelected.get('icon')
                })
            )
        );
        /*loadedModel.nodeGui = loadedModel.nodeGui.set(newSelected.get('id'),
            loadedModel.nodeGui.get(newSelected.get('id')).merge(newSelected.map(function(node) {
                return {
                    radius: node.get('radius')
                };
            }))
        );*/
        //loadedModel.nodeData = loadedModel.nodeData.set(newSelected.get('id'), Immutable.Map({id: newSelected.get('id'), value: newSelected.get('value'), relativeChange: newSelected.get('relativeChange'), type: newSelected.get('type')}));
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

var dragHandler   = require('./mechanics/drag_handler.js'),
    mouseDownWare = require('./mouse_handling/handle_down.js'),
    mouseMoveWare = require('./mouse_handling/handle_drag.js'),
    mouseUpWare   = require('./mouse_handling/handle_up.js');

dragHandler(
    mainCanvas,
    
    function mouseDown(pos) {
        var data = mouseDownWare({pos: Immutable.Map({x: pos.x, y: pos.y}), nodeGui: loadedModel.nodeGui, links: loadedModel.links});
        loadedModel.nodeGui = loadedModel.nodeGui.merge(data.nodeGui);
        loadedModel.links = loadedModel.links.merge(data.links);

        refresh();

        return true;
    },

    function mouseMove(pos, deltaPos) {
        var data = mouseMoveWare({pos: Immutable.Map({x: pos.x, y: pos.y}), deltaPos: Immutable.Map({x: deltaPos.x, y: deltaPos.y}), settings: loadedModel.settings, nodeGui: loadedModel.nodeGui, links: loadedModel.links});
        loadedModel.nodeGui = loadedModel.nodeGui.merge(data.nodeGui);
        loadedModel.links = loadedModel.links.merge(data.links);
        loadedModel.settings = loadedModel.settings.merge(data.settings);

        refresh();
    },
    
    function mouseUp(pos) {
        var data = mouseUpWare({pos: Immutable.Map({x: pos.x, y: pos.y}), nodeGui: loadedModel.nodeGui, links: loadedModel.links});
        loadedModel.nodeGui = loadedModel.nodeGui.merge(data.nodeGui);
        loadedModel.links = loadedModel.links.merge(data.links);

        mainCanvas.panX = -loadedModel.settings.get('offsetX');
        mainCanvas.panY = -loadedModel.settings.get('offsetY');

        refresh();
    }
);

var aggregatedLink = require('./aggregated_link.js');

function _refresh() {
    if (modelLayer.selected !== loadedModel) {
        loadedModel = modelLayer.selected;
    }
    
    if (loadedModel.settings.get('offsetX') && loadedModel.settings.get('offsetY')) {
        context.setTransform(1, 0, 0, 1, -loadedModel.settings.get('offsetX'), -loadedModel.settings.get('offsetY'));
    }

    context.clearRect(loadedModel.settings.get('offsetX'), loadedModel.settings.get('offsetY'), mainCanvas.width, mainCanvas.height);

    // draw the links and arrows
    loadedModel.links.forEach(function(link) {
        drawLink(aggregatedLink(link, loadedModel.nodeGui));
    });

    // get all the selected objects
    var selected = loadedModel.nodeData
        .filter(function(node) { return loadedModel.nodeGui.get(node.get('id')).get('selected') === true; })
        .map(function(node) {
            return Immutable.Map({
                id: node.get('id'),
                value: node.get('value'),
                relativeChange: node.get('relativeChange'),
                description: node.get('description')
            }).merge(
                Immutable.Map({
                        radius: loadedModel.nodeGui.get(node.get('id')).get('radius'),
                        avatar: loadedModel.nodeGui.get(node.get('id')).get('avatar'),
                        icon: loadedModel.nodeGui.get(node.get('id')).get('icon')
                    })
            );
            
            //return node.merge(loadedModel.nodeGui.get(node.get('id')));
        })
        .merge(
            loadedModel.links.filter(function(link) {return link.get('selected') === true;})
            .map(function(link) {
                return Immutable.Map({
                    id: link.get('id'),
                    timelag: link.get('timelag'),
                    coefficient: link.get('coefficient'),
                    type: link.get('type'),
                    node1: link.get('node1'),
                    node2: link.get('node2')
                });
            })
        );

    // if there are nodes selected that aren't currently linking, we want to draw the linker
    loadedModel.nodeGui.filter(function(node) {return node.get('selected') === true && node.get('linking') !== true;}).forEach(drawLinker);

    // if we are currently linking, we want to draw the link we're creating
    loadedModel.nodeGui.filter(function(node) {return node.get('linking') === true; }).forEach(function(node) {
        var linkerForNode = linker(node);
        drawLink(
            Immutable.Map({
                x1:           node.get('x'),
                y1:           node.get('y'),
                x2:           node.get('linkerX'),
                y2:           node.get('linkerY'),
                fromRadius:   node.get('radius'),
                targetRadius: 0,
                width:        14
            })
        );
    });

    // draw all the nodes
    loadedModel.nodeData.forEach(
        function(n) { 
            var nodeGui = n.merge(loadedModel.nodeGui.get(n.get('id')));
            drawNode(nodeGui, environment);
        }
    );

    // if we are linking, we want to draw the dot above everything else
    loadedModel.nodeGui.filter(function(node) {return node.get('linking') === true; }).forEach(drawLinker);

    if (selected.last()) {
        selectedMenu = drawSelectedMenu(selectedMenu, selected.last(), updateSelected);
    } else {    // draw menu for the model
        selectedMenu = drawSelectedMenu(selectedMenu, loadedModel.settings, updateSelected);
    }
    //update the menu
}

function refresh() {
    window.requestAnimationFrame(_refresh);
}

refresh();