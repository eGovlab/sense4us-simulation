'use strict';

var curry       = require('./curry.js'),
    strictCurry = require('./strict_curry.js'),
    Immutable   = require('Immutable'),
    canvas      = require('./canvas'),
    linker      = require('./linker.js'),
    generateId  = require('./generate_id.js');

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
//network.setDomain(CONFIG.get('BACKEND_HOSTNAME'));

var selectedMenu = Immutable.Map({}),
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
    textStrings   = Immutable.Map({
        unsorted: Immutable.List(),
        saved:    Immutable.List()
    }),
    loadedModel   = modelLayer.newModel(),
    savedModels   = Immutable.Map({
        local:  Immutable.Map().set(loadedModel.get('id'), loadedModel),
        synced: Immutable.Map()
    }),
    environment   = 'modelling';

var settings = require('./settings');
var UIData = Immutable.Map({
    sidebar:         settings.sidebar,
    menu:            settings.menu,
    selectedMenu:    Immutable.List(),
    floatingWindows: Immutable.List()
});

/*textStrings = textStrings.set('unsorted', textStrings.get('unsorted').merge(Immutable.List([
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

var informationTreeContainer = CONFIG.get('KEYWORD_CONTAINER');

informationTreeContainer.style.maxHeight = (informationTreeContainer.parentElement.parentElement.offsetHeight - 64) + "px";
window.addEventListener('resize', function() {
    informationTreeContainer.style.maxHeight = (informationTreeContainer.parentElement.parentElement.offsetHeight - 64) + "px";
});

informationTree.addStrings(informationTreeContainer, textStrings.get('unsorted'));*/

/*
** Object to give buttons a callback to relate and influence the current state.
** This is used within the UIRefresh() context below.
*/
var changeCallbacks = Immutable.Map({
    loadedModel: function(arg) {
        if(arg === undefined || !Immutable.Map.isMap(arg)) {
            return loadedModel;
        }

        return loadedModel = arg;
    },

    selectedMenu: function(arg) {
        if(arg === undefined || !Immutable.Map.isMap(arg)) {
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
        if(arg === undefined || !Immutable.Map.isMap(arg)) {
            return savedModels;
        }

        return savedModels = arg;
    },

    UIData: function(arg) {
        if(arg === undefined || !Immutable.Map.isMap(arg)) {
            return UIData;
        }

        return UIData = arg;
    }
});

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
        var data = mouseDownWare({env: environment, pos: Immutable.Map(pos), nodeGui: loadedModel.get('nodeGui'), links: loadedModel.get('links'), linegraph: loadedModel.get('settings').get('linegraph')}, environment);
        loadedModel = loadedModel.set('nodeGui', loadedModel.get('nodeGui').merge(data.nodeGui));
        loadedModel = loadedModel.set('links', loadedModel.get('links').merge(data.links));

        refresh();

        if(loadedModel.get('settings').get('linegraph')) {
            linegraphRefresh();
        }

        return true;
    },

    function mouseMove(pos, deltaPos) {
        var data = mouseMoveWare({pos: Immutable.Map(pos), deltaPos: Immutable.Map(deltaPos), settings: loadedModel.get('settings'), nodeGui: loadedModel.get('nodeGui'), links: loadedModel.get('links')});
        loadedModel = loadedModel.set('nodeGui', loadedModel.get('nodeGui').merge(data.nodeGui));
        loadedModel = loadedModel.set('links', loadedModel.get('links').merge(data.links));
        loadedModel = loadedModel.set('settings', loadedModel.get('settings').merge(data.settings));

        refresh();
    },
    
    function mouseUp(pos) {
        var data = mouseUpWare({pos: Immutable.Map(pos), nextId: loadedModel.get('nextId'), nodeGui: loadedModel.get('nodeGui'), links: loadedModel.get('links')});
        loadedModel = loadedModel.set('nodeGui', loadedModel.get('nodeGui').merge(data.nodeGui));
        loadedModel = loadedModel.set('links', loadedModel.get('links').merge(data.links));
        loadedModel = loadedModel.set('nextId', data.nextId);

        mainCanvas.panX = -loadedModel.get('settings').get('offsetX');
        mainCanvas.panY = -loadedModel.get('settings').get('offsetY');

        refresh();
    }
);

//mainCanvas.addEventListener('mousewheel',     MouseWheelHandler, false);
//mainCanvas.addEventListener('DOMMouseScroll', MouseWheelHandler, false);

var zoom = 1;
function MouseWheelHandler(e) {
	var mouse_canvas_x = e.x - mainCanvas.offsetLeft;
	var mouse_canvas_y = e.y - mainCanvas.offsetTop;
    var scaleX = loadedModel.get('settings').get('scaleX') || 1;
    var scaleY = loadedModel.get('settings').get('scaleX') || 1;
	var mouse_stage_x = mouse_canvas_x / scaleX - (loadedModel.get('settings').get('offsetX') || 0) / scaleX;
	var mouse_stage_y = mouse_canvas_y / scaleY - (loadedModel.get('settings').get('offsetY') || 0) / scaleY;

	if (Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail))) > 0)
		zoom = 1.05;
	else
		zoom = 1/1.05;
    
	scaleX = scaleY *= zoom;

	var mouse_stage_new_x = mouse_canvas_x / scaleX - (loadedModel.get('settings').get('offsetX') || 0) / scaleX;
	var mouse_stage_new_y = mouse_canvas_y / scaleY - (loadedModel.get('settings').get('offsetY') || 0) / scaleY;

	var zoom_effect_x = (mouse_stage_new_x - mouse_stage_x) * scaleX;
	var zoom_effect_y = (mouse_stage_new_y - mouse_stage_y) * scaleY;
    
    loadedModel = loadedModel.set('settings', loadedModel.get('settings').set('offsetX', (loadedModel.get('settings').get('offsetX') || 0) + zoom_effect_x));
    loadedModel = loadedModel.set('settings', loadedModel.get('settings').set('offsetY', (loadedModel.get('settings').get('offsetY') || 0) + zoom_effect_y));
    
    loadedModel = loadedModel.set('settings', loadedModel.get('settings').set('scaleX', scaleX));
    loadedModel = loadedModel.set('settings', loadedModel.get('settings').set('scaleY', scaleY));
    
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
    var showingLineGraph = loadedModel.get('settings').get('linegraph');
    showLineGraph(showingLineGraph);

    context.clearRect(
        (-loadedModel.get('settings').get('offsetX') || 0) * (2 - loadedModel.get('settings').get('scaleX') || 1),
        (-loadedModel.get('settings').get('offsetY') || 0) * (2 - loadedModel.get('settings').get('scaleX') || 1),
        mainCanvas.width  * (2 - (loadedModel.get('settings').get('scaleX') || 1)),
        mainCanvas.height * (2 - (loadedModel.get('settings').get('scaleY') || 1))
    );
    
    context.setTransform(
        loadedModel.get('settings').get('scaleX')  || 1,
        0,
        0,
        loadedModel.get('settings').get('scaleY')  || 1,
        loadedModel.get('settings').get('offsetX') || 0,
        loadedModel.get('settings').get('offsetY') || 0
    );

    // get all the selected objects
    var selected = loadedModel.get('nodeData')
        .filter(function filterNodesForSelection(node) {
            return loadedModel.get('nodeGui').get(node.get('id')).get('selected') === true;
        })
        .map(function removeUnnecessaryDataFromSelectedNodes(node) {
            return node.merge(
                Immutable.Map({
                    radius: loadedModel.get('nodeGui').get(node.get('id')).get('radius'),
                    avatar: loadedModel.get('nodeGui').get(node.get('id')).get('avatar'),
                    icon:   loadedModel.get('nodeGui').get(node.get('id')).get('icon')
                })
            );
        })
        .merge(
            loadedModel.get('links').filter(function filterLinksForSelection(link) {return link.get('selected') === true;})
            .map(function removeUnnecessaryDataFromSelectedLinks(link) {
                return Immutable.Map({
                    id:          link.get('id'),
                    timelag:     link.get('timelag'),
                    coefficient: link.get('coefficient'),
                    threshold:   link.get('threshold'),
                    type:        link.get('type'),
                    node1:       link.get('node1'),
                    node2:       link.get('node2')
                });
            })
        );

    // draw all the nodes
    loadedModel.get('nodeData').forEach(
        function drawEachNode(n) { 
            var nodeGui = n.merge(loadedModel.get('nodeGui').get(n.get('id')));
            if(!showingLineGraph) {
                nodeGui = nodeGui.set('linegraph', false);
            }

            drawNode(nodeGui);
        }
    );

    // draw the links and arrows
    loadedModel.get('links').forEach(function drawLinksAndArrows(link) {
        drawLink(aggregatedLink(link, loadedModel.get('nodeGui')));
    });

    // draw all the node descriptions
    loadedModel.get('nodeData').forEach(
        function drawEachNodeText(n) { 
            var nodeGui = n.merge(loadedModel.get('nodeGui').get(n.get('id')));
            drawText(
                nodeGui.get('name'),
                nodeGui.get('x'),
                nodeGui.get('y') + nodeGui.get('radius') + 4,
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
                if(nodeGui.get('timeTable')) {
                    drawTimeTable(nodeGui);
                } else {
                    drawChange(nodeGui.get('x'), nodeGui.get('y') + nodeGui.get('radius') / 6, Math.round(n.get('simulateChange').get(loadedModel.get('settings').get('timeStepN')) * 100) / 100);
                }
            }
        }
    );

    // if there are nodes selected that aren't currently linking, we want to draw the linker
    loadedModel.get('nodeGui').filter(function drawLinkerOnSelectedNodes(node) {return node.get('selected') === true && node.get('linking') !== true;}).forEach(drawLinker);

    // if we are currently linking, we want to draw the link we're creating
    loadedModel.get('nodeGui').filter(function drawLinkingArrow(node) {return node.get('linking') === true; }).forEach(function(node) {
        var linkerForNode = linker(node);
        drawLink(
            Immutable.Map({
                type:         'fullchannel',
                x1:           node.get('x'),
                y1:           node.get('y'),
                x2:           node.get('linkerX'),
                y2:           node.get('linkerY'),
                fromRadius:   node.get('radius'),
                targetRadius: 0,
                width:        8
            })
        );
    });

    // if we are linking, we want to draw the dot above everything else
    loadedModel.get('nodeGui').filter(function drawLinkerDotWhileLinking(node) {return node.get('linking') === true; }).forEach(drawLinker);

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
                selectedMenu = drawSelectedMenu(selectedMenu, loadedModel.get('settings'), updateSelected, ['name']);
            }
            break;
        case 'simulate':
            if(selected.last()) {
                selectedMenu = drawSelectedMenu(selectedMenu, selected.last(), updateSelected, ['timeTable', 'coefficient', 'timelag', 'type', 'threshold']);
            } else {
                selectedMenu = drawSelectedMenu(selectedMenu, loadedModel.get('settings'), updateSelected, ['maxIterations']);
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

    var selectedNodes = loadedModel.get('nodeGui').filter(function(node) {
        return node.get('linegraph');
    });

    var nodeData = loadedModel.get('nodeData');
    var lineValues = selectedNodes.map(function(nodegui) {
        var node = nodeData.get(nodegui.get('id'));
        return {
            name:   node.get('name'),
            values: node.get('simulateChange'),
            color:  nodegui.get('graphColor')
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
