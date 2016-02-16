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

Object.prototype.size = function() {
    return Object.keys(this).length;
}

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
    var length = arr.length;
    if(length === 0) {
        return false;
    }

    return this[arr[arr.length-1]];
}

console.log(Object.prototype);

var mainCanvas       = canvas(document.getElementById('canvas'),    refresh);
var linegraphCanvas  = canvas(document.getElementById('linegraph'), refresh);

var colorValues      = require('./graphics/value_colors.js'),
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

//UIRefresh = curry(UIRefresh, refresh, changeCallbacks);

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
//UIRefresh();

var updateSelected = curry(require('./selected_menu').updateSelected, refresh, UIRefresh, changeCallbacks);
var aggregatedLink = require('./aggregated_link.js');

var asyncMiddleware = require("./async_middleware");
var uiParams        = asyncMiddleware(refresh, loadedModel, savedModels, UIData);
var UIMiddleware = uiParams(
    UIRefresh.menuRefresh,
    UIRefresh.sidebarRefresh
);

var lastShow = false;
function showLineGraph(ctx, canvas, loadedModel, selectedMenu, environment, next) {
    var show = loadedModel.settings.linegraph;
    var parent = linegraphCanvas.parentElement;
    if(show === lastShow) {
        return next();
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

    next();
}

var refreshNamespace = require('./refresh');
var ctx = mainCanvas.getContext('2d');
var refreshParams = asyncMiddleware(ctx, mainCanvas, loadedModel, selectedMenu, environment);
var _refresh = refreshParams(
    showLineGraph,
    refreshNamespace.clearCanvasAndTransform,
    refreshNamespace.getSelectedObjects,
    refreshNamespace.drawNodes,
    refreshNamespace.drawLinks,
    refreshNamespace.drawNodeDescriptions,
    refreshNamespace._drawLinker,
    refreshNamespace.drawLinkingLine,
    refreshNamespace.updateSelectedMenu
);

UIMiddleware();
refresh();

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

linegraphRefresh();