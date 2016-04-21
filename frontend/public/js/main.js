'use strict';

function isElement(element) {
    try {
        return element instanceof HTMLElement;
    } catch(e) {
        return    (typeof element           === 'object')
               && (obj.nodeType             === 1)
               && (typeof obj.style         === 'object')
               && (typeof obj.ownerDocument === 'object');
    }
}

function inflateModel(container, exportUnder) {
    if(!isElement(container)) {
        throw new Error('Not an element given to inflateModel');
    }

    container.className = 'mb-container';

    var curry       = require('./curry.js'),
        strictCurry = require('./strict_curry.js'),
        Immutable   = null,
        canvas      = require('./canvas'),
        linker      = require('./linker.js'),
        generateId  = require('./generate_id.js');

    var maxWidth  = container.offsetWidth,
        maxHeight = container.offsetHeight;

    var protocol   = container.getAttribute('data-protocol') || 'http',
        hostname   = container.getAttribute('data-hostname') || 'localhost',
        port       = container.getAttribute('data-port'),
        portString = '';

    if(port !== null) {
        if(protocol === 'http' && port !== '80') {
            portString = ':' + port;
        } else if(protocol === 'https' && port !== '443') {
            portString = ':' + port;
        }
    }

    var configObject = {
        protocol: protocol,
        hostname: hostname,
        port:     parseInt(port),
        url:      protocol + '://' + hostname + portString
    };


    var objectHelper = require('./object-helper.js');

    var menuHeader       = document.createElement('div'),
        upperMenu        = document.createElement('div');

    menuHeader.className = 'menu-header';
    upperMenu.className  = 'mb-upper-menu';

    menuHeader.appendChild(upperMenu);

    var sidebar          = document.createElement('div'),
        sidebarContainer = document.createElement('div');

    sidebar.className           = 'mb-sidebar';
    sidebarContainer.className  = 'sidebar-container';

    sidebar.style['max-width']  = (maxWidth  - 24) + 'px';
    sidebar.style['max-height'] = (maxHeight - 44) + 'px';

    sidebar.appendChild(sidebarContainer);

    var leftMain           = document.createElement('div'),
        notificationBarDiv = document.createElement('div'),
        mainCanvasC        = document.createElement('canvas'),
        linegraphCanvasC   = document.createElement('canvas');

    notificationBarDiv.style.left = (maxWidth - 200) + 'px';

    leftMain.className            = 'left main';
    notificationBarDiv.className  = 'mb-notification-bar';
    mainCanvasC.className         = 'main-canvas';
    linegraphCanvasC.className    = 'linegraph';

    leftMain.appendChild(notificationBarDiv);
    leftMain.appendChild(mainCanvasC);
    leftMain.appendChild(linegraphCanvasC);

    container.appendChild(menuHeader);
    container.appendChild(sidebar);
    container.appendChild(leftMain);

    var mainCanvas       = canvas(container, mainCanvasC),
        linegraphCanvas  = canvas(container, linegraphCanvasC);

    

    /*var mainCanvas       = canvas(document.getElementById('canvas'),    refresh);
    var linegraphCanvas  = canvas(document.getElementById('linegraph'), refresh);*/

    var colorValues      = require('./graphics/value_colors.js'),
        modelLayer       = require('./model_layer.js'),
        menuBuilder      = require('./menu_builder'),
        notification     = require('./notification_bar'),
        network          = require('./network'),
        informationTree  = require('./information_tree'),
        UI               = require('./ui');

    //notificationBar.setContainer(notificationBarDiv);
    
    var selectedMenu  = {},
        textStrings   = {
            unsorted: [],
            saved:    []
        },
        loadedModel   = modelLayer.newModel(),
        savedModels   = {
            local:  {},
            synced: {}
        };

    loadedModel.static        = {};
    loadedModel.static.width  = container.offsetWidth;
    loadedModel.static.height = container.offsetHeight;

    var timer = null;
    window.addEventListener('resize', function() {
        if (timer !== null) {
            clearTimeout(timer);
        }

        timer = setTimeout(function() {
            mainCanvas.width            = container.offsetWidth;
            linegraphCanvas.width       = container.offsetWidth;
            /*mainCanvas.height           = container.offsetHeight;
            linegraphCanvas.height      = container.offsetHeight;*/

            loadedModel.static.width  = container.offsetWidth;
            loadedModel.static.height = container.offsetHeight;

            sidebar.style['max-height'] = (container.offsetHeight - 44) + 'px';

            refresh();
        }, 500);
    });

    if(!window.sense4us[container.getAttribute('id')]) {
        window.sense4us[container.getAttribute('id')] = {};
    }

    if(!window.sense4us.models) {
        window.sense4us.models = {
            unsorted: []
        };
    }

    if(exportUnder && typeof exportUnder === 'string' && exportUnder !== 'unsorted') {
        window.sense4us.models[exportUnder] = loadedModel;
    } else {
        if(exportUnder === 'unsorted') {
            console.warn('Can\'t add a model with id unsorted.');
        }
        window.sense4us.models.unsorted.push(loadedModel);
    }

    savedModels.local[loadedModel.id] = loadedModel;
    loadedModel.CONFIG                = configObject;

    var settings      = require('./settings');

    window.Immutable  = Immutable;
    window.collisions = require('./collisions.js');

    var context       = mainCanvas.getContext('2d');

    var mouseHandler  = require('./mechanics/mouse_handler.js');

    mouseHandler(mainCanvas, loadedModel);

    container.addEventListener('mousedown', function(ev) {
        window.sense4us.lastTarget = ev.target;
    });
    
    var keyboardHandler = require('./mechanics/keyboard_handler.js'),
        hotkeyE         = require('./input/hotkey_e.js'),
        hotkeyZ         = require('./input/hotkey_z.js'),
        hotkeyY         = require('./input/hotkey_y.js'),
        hotkeyESC       = require('./input/hotkey_esc.js');

    keyboardHandler(document.body, mainCanvas, loadedModel, [hotkeyE, hotkeyZ, hotkeyY, hotkeyESC]);

    var zoom = 1;
    function MouseWheelHandler(e) {
        var mouse_canvas_x = e.x - mainCanvas.offsetLeft;
        var mouse_canvas_y = e.y - mainCanvas.offsetTop;
        var scaleX = loadedModel.settings.scaleX || 1;
        var scaleY = loadedModel.settings.scaleY || 1;
        var mouse_stage_x = mouse_canvas_x / scaleX - (loadedModel.settings.offsetX || 0) / scaleX;
        var mouse_stage_y = mouse_canvas_y / scaleY - (loadedModel.settings.offsetY || 0) / scaleY;

        if (Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail))) > 0) {
            zoom = 1.05;
        } else {
            zoom = 1/1.05;
        }
        
        scaleX = scaleY *= zoom;

        var mouse_stage_new_x = mouse_canvas_x / scaleX - (loadedModel.settings.offsetX || 0) / scaleX;
        var mouse_stage_new_y = mouse_canvas_y / scaleY - (loadedModel.settings.offsetY || 0) / scaleY;

        var zoom_effect_x = (mouse_stage_new_x - mouse_stage_x) * scaleX;
        var zoom_effect_y = (mouse_stage_new_y - mouse_stage_y) * scaleY;
        
        loadedModel.settings.offsetX = ((loadedModel.settings.offsetX || 0) + zoom_effect_x);
        loadedModel.settings.offsetY = ((loadedModel.settings.offsetY || 0) + zoom_effect_y);

        loadedModel.settings.scaleX = scaleX;
        loadedModel.settings.scaleY = scaleY;
    }

    var aggregatedLink   = require('./aggregated_link.js');
    var refreshNamespace = require('./refresh');

    var asyncMiddleware  = require('./async_middleware');

    var lastShow;
    function showLineGraph(ctx, canvas, loadedModel, selectedMenu, next) {
        var show   = loadedModel.settings.linegraph;

        if(show) {
            mainCanvas.height      = Math.ceil(((container.offsetHeight-20) * 0.5));
            linegraphCanvas.height = Math.floor(((container.offsetHeight-20) * 0.5));

            linegraphRefresh();
        } else {
            mainCanvas.height      = container.offsetHeight;
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

    require('./model/listeners/notification.js')(notificationBarDiv, loadedModel);
    require('./model/listeners/mouse_down.js')(loadedModel);
    require('./model/listeners/mouse_move.js')(loadedModel);
    require('./model/listeners/mouse_up.js')(loadedModel);
    require('./model/listeners/delete.js')(loadedModel);

    loadedModel.addListener('settings', refresh);
    loadedModel.addListener('refresh',  refresh);

    var sidebarManager = new UI.SidebarManager(sidebarContainer);

    loadedModel.addListener('sidebar', function() {
        sidebarManager.addSidebar(loadedModel.sidebar, loadedModel);
    });

    var ScenarioEditor = require('./scenario').ScenarioEditor;
    loadedModel.addListener('newWindow', function(option) {
        switch(option.toUpperCase()) {
            case 'SCENARIO':
                new ScenarioEditor(loadedModel, container.offsetLeft + 208, container.offsetTop + 28);
                break;
        }
    });

    loadedModel.addListener('newLink', function(link) {
        if(this.selected) {
            this.emit('resetUI');
        }
    });

    loadedModel.addListener('newNode', function(id, nodeData, nodeGui) {
        loadedModel.loadedScenario.generateScenarioContainer(loadedModel);
    });

    sidebarManager.setEnvironment(loadedModel.environment);
    sidebarManager.setLoadedModel(loadedModel);
    sidebarManager.setSelectedMenu(loadedModel.settings);

    var menu = new UI.Menu(upperMenu, settings.menu);
    menu.createMenu(loadedModel, savedModels);

    require('./model/listeners/selected.js')    (sidebarManager, loadedModel);
    require('./model/listeners/reset_ui.js')    (sidebarManager, menu, savedModels, loadedModel);
    require('./model/listeners/store_model.js') (savedModels, loadedModel);
    require('./model/listeners/load_model.js')  (savedModels, loadedModel);
    require('./model/listeners/new_model.js')   (savedModels, loadedModel);
    require('./model/listeners/delete_model.js')(savedModels, loadedModel);
    require('./model/listeners/save_model.js')  (savedModels, loadedModel);

    require('./model/listeners/settings.js')(loadedModel);
    loadedModel.addListener('settings', function() {
        if(loadedModel.settings.linegraph) {
            linegraphRefresh();
        }
    });

    loadedModel.emit(null, 'refresh', 'resetUI', 'settings', 'sidebar');
    loadedModel.emit('Initialized', 'notification');

    var drawLineGraph = require('./graphics/draw_line_graph.js');
    function _linegraphRefresh() {
        var lctx = linegraphCanvas.getContext('2d');
        lctx.clearRect(
            0,
            0,
            linegraphCanvas.width,
            linegraphCanvas.height
        );

        var selectedNodes = objectHelper.filter.call(
            loadedModel.nodeGui,
            function(node) {
                return node.linegraph;
            }
        );

        var nodeData = loadedModel.nodeData;
        var lineValues = objectHelper.map.call(
            selectedNodes,
            function(nodegui) {
                var node = nodeData[nodegui.id];
                return {
                    name:   node.name,
                    values: node.simulateChange,
                    color:  nodegui.graphColor
                }
            }
        );

        drawLineGraph(lctx, 20, 20, linegraphCanvas.width - 40, linegraphCanvas.height - 30, lineValues);
    }

    function refresh() {
        window.requestAnimationFrame(_refresh);
    }

    function linegraphRefresh() {
        window.requestAnimationFrame(_linegraphRefresh);
    }

    linegraphRefresh();
}

window.sense4us              = window.sense4us || {};
window.sense4us.lastTarget   = false;
window.sense4us.inflateModel = inflateModel;
