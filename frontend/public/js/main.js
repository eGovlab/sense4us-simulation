'use strict';

var curry      = require('./curry.js'),
    Immutable  = require('Immutable'),
    canvas     = require('./canvas/'),
    linker     = require('./linker.js'),
    generateId = require('./generate_id.js');

var mainCanvas = canvas(document.getElementById('canvas'), refresh);

var drawSelectedMenu = curry(require('./selected_menu').drawSelectedMenu, document.getElementById('sidebar')),
    drawLinker       = curry(require('./graphics/draw_linker.js'), mainCanvas.getContext('2d'), linker),
    drawLink         = curry(require('./graphics/draw_link.js'), mainCanvas.getContext('2d')),
    modelLayer       = require('./model_layer.js'),
    menuBuilder      = require('./menu_builder'),
    notificationBar  = require('./notification_bar'),
    network          = require('./network'),
    CONFIG           = require('rh_config-parser'),
    /* UIRefresh is curried after changeCallbacks is defined. */
    UIRefresh        = require('./ui');

notificationBar.setContainer(document.getElementById('notification-bar'));

CONFIG.setConfig(require('./config.js'));
network.setDomain(CONFIG.get('BACKEND_HOSTNAME'));

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
    **         name:     "New Model",
    **         maxIterable: 0
    **     })
    ** });
    */
    loadedModel   = modelLayer.newModel(),
    savedModels   = Immutable.Map({
        local:  Immutable.Map().set(loadedModel.get('id'), loadedModel),
        synced: Immutable.Map()
    }),
    environment   = 'edit';

var settings = require('./settings');

var UIData = Immutable.Map({
    sidebar:      settings.sidebar,
    menu:         settings.menu,
    selectedMenu: Immutable.List()
});

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

var drawNode = require('./graphics/draw_node.js');
    drawNode = curry(drawNode, mainCanvas.getContext('2d'));

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
        var data = mouseDownWare({pos: Immutable.Map(pos), nodeGui: loadedModel.get('nodeGui'), links: loadedModel.get('links')});
        loadedModel = loadedModel.set('nodeGui', loadedModel.get('nodeGui').merge(data.nodeGui));
        loadedModel = loadedModel.set('links', loadedModel.get('links').merge(data.links));

        refresh();

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

window.addEventListener("mousewheel", MouseWheelHandler, false);
window.addEventListener("DOMMouseScroll", MouseWheelHandler, false);

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
    console.log('derp', loadedModel.get('settings').get('offsetX'));
    loadedModel = loadedModel.set('settings', loadedModel.get('settings').set('offsetY', (loadedModel.get('settings').get('offsetY') || 0) + zoom_effect_y));
    
    loadedModel = loadedModel.set('settings', loadedModel.get('settings').set('scaleX', scaleX));
    loadedModel = loadedModel.set('settings', loadedModel.get('settings').set('scaleY', scaleY));
    
    refresh();
}

UIRefresh();

var updateSelected = curry(require('./selected_menu').updateSelected, refresh, UIRefresh, changeCallbacks);

var aggregatedLink = require('./aggregated_link.js');
function _refresh() {
    context.clearRect(
        (-loadedModel.get('settings').get('offsetX') || 0) * (2 - loadedModel.get('settings').get('scaleX') || 1),
        (-loadedModel.get('settings').get('offsetY') || 0) * (2 - loadedModel.get('settings').get('scaleX') || 1),
        mainCanvas.width * (2 - (loadedModel.get('settings').get('scaleX') || 1)),
        mainCanvas.height * (2 - (loadedModel.get('settings').get('scaleY') || 1))
    );
    
    context.setTransform(
        loadedModel.get('settings').get('scaleX') || 1,
        0,
        0,
        loadedModel.get('settings').get('scaleY') || 1,
        loadedModel.get('settings').get('offsetX') || 0,
        loadedModel.get('settings').get('offsetY') || 0
    );

    // draw the links and arrows
    loadedModel.get('links').forEach(function(link) {
        drawLink(aggregatedLink(link, loadedModel.get('nodeGui')));
    });

    // get all the selected objects
    var selected = loadedModel.get('nodeData')
        .filter(function(node) { return loadedModel.get('nodeGui').get(node.get('id')).get('selected') === true; })
        .map(function(node) {
            return Immutable.Map({
                id:             node.get('id'),
                value:          node.get('value'),
                relativeChange: node.get('relativeChange'),
                description:    node.get('description')
            }).merge(
                Immutable.Map({
                        radius: loadedModel.get('nodeGui').get(node.get('id')).get('radius'),
                        avatar: loadedModel.get('nodeGui').get(node.get('id')).get('avatar'),
                        icon:   loadedModel.get('nodeGui').get(node.get('id')).get('icon')
                    })
            );
            
            //return node.merge(loadedModel.get('nodeGui').get(node.get('id')));
        })
        .merge(
            loadedModel.get('links').filter(function(link) {return link.get('selected') === true;})
            .map(function(link) {
                return Immutable.Map({
                    id:          link.get('id'),
                    timelag:     link.get('timelag'),
                    coefficient: link.get('coefficient'),
                    type:        link.get('type'),
                    node1:       link.get('node1'),
                    node2:       link.get('node2')
                });
            })
        );

    // if there are nodes selected that aren't currently linking, we want to draw the linker
    loadedModel.get('nodeGui').filter(function(node) {return node.get('selected') === true && node.get('linking') !== true;}).forEach(drawLinker);

    // if we are currently linking, we want to draw the link we're creating
    loadedModel.get('nodeGui').filter(function(node) {return node.get('linking') === true; }).forEach(function(node) {
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
    loadedModel.get('nodeData').forEach(
        function(n) { 
            var nodeGui = n.merge(loadedModel.get('nodeGui').get(n.get('id')));
            drawNode(nodeGui, environment);
        }
    );

    // if we are linking, we want to draw the dot above everything else
    loadedModel.get('nodeGui').filter(function(node) {return node.get('linking') === true; }).forEach(drawLinker);

    if (selected.last()) {
        selectedMenu = drawSelectedMenu(selectedMenu, selected.last(), updateSelected);
    } else {    // draw menu for the model
        selectedMenu = drawSelectedMenu(selectedMenu, loadedModel.get('settings'), updateSelected);
    }
    //update the menu
}

function refresh() {
    window.requestAnimationFrame(_refresh);
}

refresh();