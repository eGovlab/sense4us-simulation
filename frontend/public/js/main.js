'use strict';

var curry       = require('./curry.js'),
    strictCurry = require('./strict_curry.js'),
    Immutable   = null,
    canvas      = require('./canvas'),
    linker      = require('./linker.js'),
    generateId  = require('./generate_id.js');


require("./object.js");

var mainCanvas       = canvas(document.getElementById('canvas'),    refresh);
var linegraphCanvas  = canvas(document.getElementById('linegraph'), refresh);

var colorValues      = require('./graphics/value_colors.js'),
    modelLayer       = require('./model_layer.js'),
    menuBuilder      = require('./menu_builder'),
    notificationBar  = require('./notification_bar'),
    network          = require('./network'),
    CONFIG           = require('rh_config-parser'),
    informationTree  = require('./information_tree'),
    UI               = require('./ui');

notificationBar.setContainer(document.getElementById('notification-bar'));

CONFIG.setConfig(require('./config.js'));
//network.setDomain(CONFIG.BACKEND_HOSTNAME);

var selectedMenu = {},
    textStrings   = {
        unsorted: [],
        saved:    []
    },
    loadedModel   = modelLayer.newModel(),
    savedModels   = {
        local:  {},
        synced: {}
    };


savedModels.local[loadedModel.id] = loadedModel;

var settings = require('./settings');
/*var UIData = {
    sidebar:         new UI.Sidebar(settings.sidebar),
    menu:            settings.menu,
    selectedMenu:    [],
    floatingWindows: []
};*/

window.Immutable  = Immutable;
window.collisions = require('./collisions.js');

var context = mainCanvas.getContext('2d');

var dragHandler = require('./mechanics/drag_handler.js'),
    mouseDown   = require('./input/mouse_down.js'),
    mouseMove   = require('./input/mouse_move.js'),
    mouseUp     = require('./input/mouse_up.js');

dragHandler(mainCanvas, loadedModel, mouseDown, mouseMove, mouseUp);

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
    
    loadedModel.settings.offsetX = ((loadedModel.settings.offsetX || 0) + zoom_effect_x);
    loadedModel.settings.offsetY = ((loadedModel.settings.offsetY || 0) + zoom_effect_y);

    loadedModel.settings.scaleX = scaleX;
    loadedModel.settings.scaleY = scaleY;
    
    //refresh();
}

var aggregatedLink = require('./aggregated_link.js');
var refreshNamespace = require('./refresh');

var asyncMiddleware = require("./async_middleware");

var lastShow;
function showLineGraph(ctx, canvas, loadedModel, selectedMenu, next) {
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

var ctx = mainCanvas.getContext('2d');
var refreshParams = asyncMiddleware(ctx, mainCanvas, loadedModel, selectedMenu);
var _refresh = refreshParams(
    showLineGraph,
    refreshNamespace.clearCanvasAndTransform,
    refreshNamespace.drawNodes,
    refreshNamespace.drawLinks,
    refreshNamespace.drawNodeDescriptions,
    refreshNamespace._drawLinker,
    refreshNamespace.drawLinkingLine
);

loadedModel.addListener("nodeGui",  refresh);
loadedModel.addListener("nodeData", refresh);
loadedModel.addListener("settings", refresh);
loadedModel.addListener("refresh",  refresh);

refresh();

var sidebarManager = new UI.SidebarManager(CONFIG.get("SIDEBAR_CONTAINER"));

loadedModel.addListener("sidebar", function() {
    sidebarManager.addSidebar(loadedModel.sidebar, loadedModel);
});

loadedModel.propagate();

sidebarManager.setEnvironment(loadedModel.environment);
sidebarManager.setLoadedModel(loadedModel);
sidebarManager.setSelectedMenu(loadedModel.settings);

loadedModel.addListener("selected", function() {
    sidebarManager.setEnvironment(loadedModel.environment);
    sidebarManager.setLoadedModel(loadedModel);
    
    if(this.selected.x !== undefined && this.selected.y !== undefined) {
        var nodeData = loadedModel.nodeData[this.selected.id];
        var nodeGui  = loadedModel.nodeGui[this.selected.id];
        sidebarManager.setSelectedMenu(nodeData, nodeGui);
    } else if(this.selected.coefficient !== undefined) {
        sidebarManager.setSelectedMenu(this.selected);
    } else {
        sidebarManager.setSelectedMenu(loadedModel.settings);
    }
});

var menu = new UI.Menu(CONFIG.get("MENU_CONTAINER"), settings.menu);
menu.createMenu(loadedModel, savedModels);

loadedModel.addListener("resetUI", function() {
    sidebarManager.setEnvironment(loadedModel.environment);
    sidebarManager.addSidebar(loadedModel.sidebar, loadedModel);
    menu.resetMenu(loadedModel, savedModels);

    if(this.selected && this.selected.x !== undefined && this.selected.y !== undefined) {
        var nodeData = loadedModel.nodeData[this.selected.id];
        var nodeGui  = loadedModel.nodeGui[this.selected.id];
        sidebarManager.setSelectedMenu(nodeData, nodeGui);
    } else if(this.selected && this.selected.coefficient !== undefined) {
        sidebarManager.setSelectedMenu(this.selected);
    } else {
        sidebarManager.setSelectedMenu(loadedModel.settings);
    }
});

loadedModel.addListener("settings", function() {
    if(loadedModel.settings.linegraph) {
        linegraphRefresh();
    }
});

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
        var node = nodeData[nodegui.id];
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