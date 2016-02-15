'use strict';

var curry       = require('./curry.js'),
    strictCurry = require('./strict_curry.js'),
    Immutable   = null,
    canvas      = require('./canvas'),
    linker      = require('./linker.js'),
    generateId  = require('./generate_id.js');


Object.prototype.forEach = function(callback) {
    var that = this;
    Object.keys(this).forEach(function(key, i, arr) {
        callback(that[key], key, i, arr);
    });
};

Object.prototype.filter = function(callback) {
    var newObj = {},
        that   = this;
    Object.keys(this).forEach(function(key, i, arr) {
        if(callback(that[key], key, i, arr)) {
            newObj[key] = that[key];
        }
    });

    return newObj;
};

Object.prototype.map = function(callback) {
    var newObj = {},
        that   = this;
    Object.keys(this).forEach(function(key, i, arr) {
        newObj[key] = callback(that[key], key, i, arr);
    });

    return newObj;
};

Object.prototype.merge = function() {
    var newObj = {},
        that   = this;

    Object.keys(this).forEach(function(key) {
        newObj[key] = that[key];
    });

    for(var i = 0; i < arguments.length; i++) {
        if(typeof arguments[i] !== "object") {
            return;
        }

        var obj = arguments[i];
        Object.keys(obj).forEach(function(key) {
            newObj[key] = obj[key];
        });
    }

    return newObj;
};

Object.prototype.slice = function(from, to) {
    var newObj = {},
        that   = this;

    var slice = Object.keys(this).slice(from, to);
    slice.forEach(function(key) {
        newObj[key] = that[key];
    });

    return newObj;
};

Object.prototype.last = function() {
    var arr = Object.keys(this);
    return this[arr[arr.length-1]];
}

console.log(Object.prototype);

var mainCanvas       = canvas(document.getElementById('canvas'),    refresh);
var linegraphCanvas  = canvas(document.getElementById('linegraph'), refresh);

var drawSelectedMenu = curry(require('./selected_menu').drawSelectedMenu, document.getElementById('sidebar')),
    drawLinker       = curry(require('./graphics/draw_linker.js'),     mainCanvas.getContext('2d'), linker),
    drawLink         = curry(require('./graphics/draw_link.js'),       mainCanvas.getContext('2d')),
    drawChange       = curry(require('./graphics/draw_change.js'),     mainCanvas.getContext('2d')),
    drawText         = strictCurry(require('./graphics/draw_text.js'), mainCanvas.getContext('2d')),
    colorValues      = require('./graphics/value_colors.js'),
    modelLayer       = require('./model_layer.js'),
    menuBuilder      = require('./menu_builder'),
    notificationBar  = require('./notification_bar'),
    network          = require('./network'),
    CONFIG           = require('rh_config-parser'),
    informationTree  = require('./information_tree'),
    /* UIRefresh is curried after changeCallbacks is defined. */
    UIRefresh        = require('./ui');

notificationBar.setContainer(document.getElementById('notification-bar'));

CONFIG.setConfig(require('./config.js'));
//network.setDomain(CONFIG.BACKEND_HOSTNAME);

var selectedMenu = {},
    /*
    ** modelLayer.newModel(id) 
    ** (USE PARAMETER WITH HIGH CAUTION.
    **  MIGHT FUCK SHIT UP WITH SAVED MODELS.
    **  See model_layer.js for more info.)
    ** returns:
    **
    ** Immutable.Map({
    **     id:       id || generateId,
    **     saved:    false,
    **     synced:   false,
    **     syncId:   null,
    **
    **     nextId:   0,
    **     nodeData: Immutable.Map({}),
    **     nodeGui:  Immutable.Map({}),
    **     links:    Immutable.Map({}),
    **     settings: Immutable.Map({
    **         name:     'New Model',
    **         maxIterable: 0
    **     })
    ** });
    */
    textStrings   = {
        unsorted: [],
        saved:    []
    },
    loadedModel   = modelLayer.newModel(),
    savedModels   = {
        local:  {},
        synced: {}
    },
    environment   = 'modelling';

savedModels.local[loadedModel.id] = loadedModel;

var settings = require('./settings');
var UIData = {
    sidebar:         settings.sidebar,
    menu:            settings.menu,
    selectedMenu:    [],
    floatingWindows: []
};

/*textStrings = textStrings.set('unsorted', textStrings.unsorted.merge(Immutable.List([
    'incoming text string',
    'incoming text string',
    'incoming text string',
    'incoming text string',
    'incoming text string',
    'incoming text string',
    'incoming text string',
    'incoming text string',
    'incoming text string',
    'incoming text string',
    'incoming text string',
    'incoming text string',
    'incoming text string',
    'incoming text string',
    'incoming text string',
    'incoming text string',
    'incoming text string',
    'incoming text string',
    'incoming text string',
    'incoming text string',
    'incoming text string',
    'incoming text string',
    'incoming text string',
    'incoming text string',
    'incoming text string',
    'incoming text string',
    'incoming text string',
    'incoming text string',
    'incoming text string',
    'incoming text string',
    'incoming text string',
    'incoming text string',
    'incoming text string',
    'incoming text string',
    'incoming text string',
    'incoming text string',
    Immutable.Map({
        header: 'category 1',
        keys: Immutable.List([
            'c11',
            'c12',
            'c13'
        ])
    }),

    Immutable.Map({
        header: 'category 2',
        keys: Immutable.List([
            'c21',
            'c22',
            'c23'
        ])
    }),

    Immutable.Map({
        header: 'category 3',
        keys: Immutable.List([
            'c31',
            'c32',
            'c33'
        ])
    })
])));

var informationTreeContainer = CONFIG.KEYWORD_CONTAINER;

informationTreeContainer.style.maxHeight = (informationTreeContainer.parentElement.parentElement.offsetHeight - 64) + "px";
window.addEventListener('resize', function() {
    informationTreeContainer.style.maxHeight = (informationTreeContainer.parentElement.parentElement.offsetHeight - 64) + "px";
});

informationTree.addStrings(informationTreeContainer, textStrings.unsorted);*/

/*
** Object to give buttons a callback to relate and influence the current state.
** This is used within the UIRefresh() context below.
*/
var changeCallbacks = {
    loadedModel: function(arg) {
        if(arg === undefined || typeof arg !== "object") {
            return loadedModel;
        }

        return loadedModel = arg;
    },

    selectedMenu: function(arg) {
        if(arg === undefined || typeof arg !== "object") {
            return selectedMenu;
        }

        return selectedMenu = arg;
    },

    environment: function(arg) {
        if(arg === undefined || typeof arg !== 'string') {
            return environment;
        }

        return environment = arg;
    },

    savedModels: function(arg) {
        if(arg === undefined || typeof arg !== "object") {
            return savedModels;
        }

        return savedModels = arg;
    },

    UIData: function(arg) {
        if(arg === undefined || typeof arg !== "object") {
            return UIData;
        }

        return UIData = arg;
    }
};

UIRefresh = curry(UIRefresh, refresh, changeCallbacks);

var drawNode      = require('./graphics/draw_node.js'),
    drawTimeTable = require('./graphics/draw_time_table.js');
    drawNode      = curry(drawNode, mainCanvas.getContext('2d'));
    drawTimeTable = curry(drawTimeTable, mainCanvas.getContext('2d'));

window.Immutable  = Immutable;
window.collisions = require('./collisions.js');

var context = mainCanvas.getContext('2d');

var fixInputForLink = function(link) {
    link = link.concat({
        node1: parseInt(link.node1),
        node2: parseInt(link.node2)
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
        var _data = {
            env:       environment,
            pos:       pos,
            nodeGui:   loadedModel.nodeGui,
            links:     loadedModel.links,
            linegraph: loadedModel.settings.linegraph
        };

        var data = mouseDownWare(_data, environment);
        loadedModel.nodeGui = loadedModel.nodeGui.merge(data.nodeGui);
        loadedModel.links   = loadedModel.links.merge(data.links);

        refresh();

        if(loadedModel.settings.linegraph) {
            linegraphRefresh();
        }

        return true;
    },

    function mouseMove(pos, deltaPos) {
        var _data = {
            pos:      pos,
            deltaPos: deltaPos,
            settings: loadedModel.settings,
            nodeGui:  loadedModel.nodeGui,
            links:    loadedModel.links
        };

        var data = mouseMoveWare(_data);

        loadedModel.nodeGui  = loadedModel.nodeGui.merge(data.nodeGui);
        loadedModel.links    = loadedModel.links.merge(data.links);
        
        loadedModel.settings.offsetX = data.settings.offsetX;
        loadedModel.settings.offsetY = data.settings.offsetY;
        //loadedModel.settings = loadedModel.settings.merge(data.settings);

        refresh();
    },
    
    function mouseUp(pos) {
        var _data = {
            pos:     pos,
            nextId:  loadedModel.nextId,
            nodeGui: loadedModel.nodeGui,
            links:   loadedModel.links
        };

        var data = mouseUpWare(_data);
        loadedModel.nodeGui = loadedModel.nodeGui.merge(data.nodeGui);
        loadedModel.links   = loadedModel.links.merge(data.links);
        loadedModel.nextId  = data.nextId;

        mainCanvas.panX = -loadedModel.settings.offsetX;
        mainCanvas.panY = -loadedModel.settings.offsetY;

        refresh();
    }
);

//mainCanvas.addEventListener('mousewheel',MouseWheelHandler, false);
//mainCanvas.addEventListener('DOMMouseScroll', MouseWheelHandler, false);

var zoom = 1;
function MouseWheelHandler(e) {
	var mouse_canvas_x = e.x - mainCanvas.offsetLeft;
	var mouse_canvas_y = e.y - mainCanvas.offsetTop;
    var scaleX = loadedModel.settings.scaleX || 1;
    var scaleY = loadedModel.settings.scaleX || 1;
	var mouse_stage_x = mouse_canvas_x / scaleX - (loadedModel.settings.offsetX || 0) / scaleX;
	var mouse_stage_y = mouse_canvas_y / scaleY - (loadedModel.settings.offsetY || 0) / scaleY;

	if (Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail))) > 0)
		zoom = 1.05;
	else
		zoom = 1/1.05;
    
	scaleX = scaleY *= zoom;

	var mouse_stage_new_x = mouse_canvas_x / scaleX - (loadedModel.settings.offsetX || 0) / scaleX;
	var mouse_stage_new_y = mouse_canvas_y / scaleY - (loadedModel.settings.offsetY || 0) / scaleY;

	var zoom_effect_x = (mouse_stage_new_x - mouse_stage_x) * scaleX;
	var zoom_effect_y = (mouse_stage_new_y - mouse_stage_y) * scaleY;
    
    loadedModel = loadedModel.set('settings', loadedModel.settings.set('offsetX', (loadedModel.settings.offsetX || 0) + zoom_effect_x));
    loadedModel = loadedModel.set('settings', loadedModel.settings.set('offsetY', (loadedModel.settings.offsetY || 0) + zoom_effect_y));
    
    loadedModel = loadedModel.set('settings', loadedModel.settings.set('scaleX', scaleX));
    loadedModel = loadedModel.set('settings', loadedModel.settings.set('scaleY', scaleY));
    
    refresh();
}

function alignWithList(item) {
    if(!item.selected && item.y !== 0) {
        if(item.y > -2 && item.y < 2) {
            item.y = 0;
            return;
        }

        item.y = item.y / 2;
        refresh();
    }
}

/* This method is retarded. */
UIRefresh();

var updateSelected = curry(require('./selected_menu').updateSelected, refresh, UIRefresh, changeCallbacks);
var aggregatedLink = require('./aggregated_link.js');

var lastShow = false;
function showLineGraph(show) {
    var parent = linegraphCanvas.parentElement;
    if(show === lastShow) {
        return;
    }

    if(show) {
        mainCanvas.height      = (parent.offsetHeight - 70) * 0.5;
        linegraphCanvas.height = (parent.offsetHeight - 70) * 0.5;

        linegraphRefresh();
    } else {
        mainCanvas.height      = parent.offsetHeight;
        linegraphCanvas.height = 0;
    }

    lastShow = show;
}

function _refresh() {
    var showingLineGraph = loadedModel.settings.linegraph;
    showLineGraph(showingLineGraph);

    context.clearRect(
        (-loadedModel.settings.offsetX || 0) * (2 - loadedModel.settings.scaleX || 1),
        (-loadedModel.settings.offsetY || 0) * (2 - loadedModel.settings.scaleX || 1),
        mainCanvas.width  * (2 - (loadedModel.settings.scaleX || 1)),
        mainCanvas.height * (2 - (loadedModel.settings.scaleY || 1))
    );
    
    context.setTransform(
        loadedModel.settings.scaleX  || 1,
        0,
        0,
        loadedModel.settings.scaleY  || 1,
        loadedModel.settings.offsetX || 0,
        loadedModel.settings.offsetY || 0
    );

    // get all the selected objects
    var selected = loadedModel.nodeData
        .filter(function filterNodesForSelection(node) {
            return loadedModel.nodeGui[node.id].selected === true;
        })
        .map(function removeUnnecessaryDataFromSelectedNodes(node) {
            return node.merge(
                {
                    radius: loadedModel.nodeGui[node.id].radius,
                    avatar: loadedModel.nodeGui[node.id].avatar,
                    icon:   loadedModel.nodeGui[node.id].icon
                }
            );
        })
        .merge(
            loadedModel.links.filter(function filterLinksForSelection(link) {return link.selected === true;})
            .map(function removeUnnecessaryDataFromSelectedLinks(link) {
                return {
                    id:          link.id,
                    timelag:     link.timelag,
                    coefficient: link.coefficient,
                    threshold:   link.threshold,
                    type:        link.type,
                    node1:       link.node1,
                    node2:       link.node2
                };
            })
        );

    // draw all the nodes
    loadedModel.nodeData.forEach(
        function drawEachNode(n) { 
            var nodeGui = n.merge(loadedModel.nodeGui[n.id]);
            if(!showingLineGraph) {
                nodeGui.linegraph = false;
            }

            drawNode(nodeGui);
        }
    );

    // draw the links and arrows
    loadedModel.links.forEach(function drawLinksAndArrows(link) {
        drawLink(aggregatedLink(link, loadedModel.nodeGui));
    });

    // draw all the node descriptions
    loadedModel.nodeData.forEach(
        function drawEachNodeText(n) { 
            var nodeGui = n.merge(loadedModel.nodeGui[n.id]);
            drawText(
                nodeGui.name,
                nodeGui.x,
                nodeGui.y + nodeGui.radius + 4,
                colorValues.neutral,
                true
            );
            /*
            ** If you add more environment specific code, please bundle
            ** it up into another method.
            **
            ** e.g. drawNodeInSimulation(nodeGui)
            */
            if(environment === 'simulate' ) {
                if(nodeGui.timeTable) {
                    drawTimeTable(nodeGui);
                } else {
                    drawChange(nodeGui.x, nodeGui.y + nodeGui.radius / 6, Math.round(n.simulateChange[loadedModel.settings.timeStepN] * 100) / 100);
                }
            }
        }
    );

    // if there are nodes selected that aren't currently linking, we want to draw the linker
    loadedModel.nodeGui.filter(function drawLinkerOnSelectedNodes(node) {return node.selected === true && node.linking !== true;}).forEach(drawLinker);

    // if we are currently linking, we want to draw the link we're creating
    loadedModel.nodeGui.filter(function drawLinkingArrow(node) {return node.linking === true; }).forEach(function(node) {
        var linkerForNode = linker(node);
        drawLink(
            {
                type:         'fullchannel',
                x1:           node.x,
                y1:           node.y,
                x2:           node.linkerX,
                y2:           node.linkerY,
                fromRadius:   node.radius,
                targetRadius: 0,
                width:        8
            }
        );
    });

    // if we are linking, we want to draw the dot above everything else
    loadedModel.nodeGui.filter(function drawLinkerDotWhileLinking(node) {return node.linking === true; }).forEach(drawLinker);

    //update the menu
    var sidebar = document.getElementById('sidebar');
    if(selected.last()) {
        sidebar.firstElementChild.style.display = 'none';
    } else {
        sidebar.firstElementChild.style.display = 'block';
    }

    switch(environment) {
        case 'modelling':
            if(selected.last()) {
                selectedMenu = drawSelectedMenu(selectedMenu, selected.last(), updateSelected, ['timeTable', 'name', 'description', 'type', 'threshold', 'coefficient', 'timelag']);
            } else {
                selectedMenu = drawSelectedMenu(selectedMenu, loadedModel.settings, updateSelected, ['name']);
            }
            break;
        case 'simulate':
            if(selected.last()) {
                selectedMenu = drawSelectedMenu(selectedMenu, selected.last(), updateSelected, ['timeTable', 'coefficient', 'timelag', 'type', 'threshold']);
            } else {
                selectedMenu = drawSelectedMenu(selectedMenu, loadedModel.settings, updateSelected, ['maxIterations']);
                //selectedMenu = drawSelectedMenu(selectedMenu, null, null, null);
            }
            break;
    }
}

var drawLineGraph = require('./graphics/draw_line_graph.js');
function _linegraphRefresh() {
    var lctx = linegraphCanvas.getContext('2d');
    lctx.clearRect(
        0,
        0,
        linegraphCanvas.width,
        linegraphCanvas.height
    );

    var selectedNodes = loadedModel.nodeGui.filter(function(node) {
        return node.linegraph;
    });

    var nodeData = loadedModel.nodeData;
    var lineValues = selectedNodes.map(function(nodegui) {
        var node = nodeData.get(nodegui.id);
        return {
            name:   node.name,
            values: node.simulateChange,
            color:  nodegui.graphColor
        }
    });

    drawLineGraph(lctx, 20, 20, linegraphCanvas.width - 40, linegraphCanvas.height - 30, lineValues);
}

function refresh() {
    window.requestAnimationFrame(_refresh);
}

function linegraphRefresh() {
    window.requestAnimationFrame(_linegraphRefresh);
}

refresh();
linegraphRefresh();
