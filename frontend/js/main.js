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

function inflateModel(container, exportUnder, userFilter, projectFilter) {
    if(!isElement(container)) {
        throw new Error('Not an element given to inflateModel');
    }

    //container.className = 'mb-container';
    container.style.overflow = 'hidden';

    var curry        = require('curry').curry,
        strictCurry  = require('curry').strictCurry,
        Immutable    = null,
        canvas       = require('canvas'),
        linker       = require('linker');

    var t_id = 1;
    var generateId = function() {
        return t_id++;
    };

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

    if(typeof exportUnder === 'string' && typeof userFilter === 'string' && projectFilter === undefined) {
        projectFilter = userFilter;
        userFilter    = exportUnder;
        exportUnder   = undefined;
    }

    if(typeof projectFilter !== 'string' || typeof userFilter !== 'string') {
        throw new Error('Need to initialize inflateModel with a user and project id.');
    }

    var configObject = {
        protocol:      protocol,
        hostname:      hostname,
        port:          parseInt(port),
        userFilter:    userFilter,
        projectFilter: projectFilter,
        url:           protocol + '://' + hostname + portString
    };

    var objectHelper = require('object-helper');

    /*var menuHeader       = document.createElement('div'),
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

    sidebar.appendChild(sidebarContainer);*/

    var leftMain           = document.createElement('div'),
        notificationBarDiv = document.createElement('div'),
        mainCanvasC        = document.createElement('canvas'),
        linegraphCanvasC   = document.createElement('canvas'),
        animationStyling   = document.createElement('style');

    notificationBarDiv.style.left = (maxWidth - 200) + 'px';

    //leftMain.className            = 'left main';
    leftMain.style.position       = 'relative';
    leftMain.style.width          = '100%';
    leftMain.style.height         = '100%';

    //notificationBarDiv.className  = 'mb-notification-bar';
    notificationBarDiv.style.position      = 'absolute';
    notificationBarDiv.style.width         = '200px';
    notificationBarDiv.style['margin-top'] = '4px';

    //mainCanvasC.className         = 'main-canvas';
    //linegraphCanvasC.className    = 'linegraph';

    mainCanvasC.style['background-color']      = '#fff';
    linegraphCanvasC.style['margin-top']       = '-4px';
    linegraphCanvasC.style['background-color'] = '#fff';


    var NewUI   = require('new_ui');
    var Colors  = NewUI.Colors,
        sidebar = new NewUI.Sidebar(200);

    leftMain.appendChild(animationStyling);
    animationStyling.addEventListener('load', function() {
        animationStyling = animationStyling.sheet;
        if(!animationStyling.ownerNode || animationStyling.ownerNode.parentElement !== leftMain) {
            throw new Error('Couldn\'t setup a stylesheet.');
        }

        try {
            animationStyling.insertRule('@-webkit-keyframes NOTIFY_FADEIN {0% {opacity: 0;} 100% {opacity: 1;}}', 0);
            animationStyling.insertRule('@-webkit-keyframes NOTIFY_FADEOUT {0% {opacity: 1;} 100% {opacity: 0;}}', 1);
        } catch(e) {

        } try {
            animationStyling.insertRule('@-moz-keyframes NOTIFY_FADEIN {0% {opacity: 0;} 100% {opacity: 1;}}', 0);
            animationStyling.insertRule('@-moz-keyframes NOTIFY_FADEOUT {0% {opacity: 1;} 100% {opacity: 0;}}', 1);
        } catch(e) {

        } try {
            animationStyling.insertRule('@keyframes NOTIFY_FADEIN {0% {opacity: 0;} 100% {opacity: 1;}}', 0);
            animationStyling.insertRule('@keyframes NOTIFY_FADEOUT {0% {opacity: 1;} 100% {opacity: 0;}}', 1);
        } catch(e) {

        }
    });

    sidebar.appendTo(leftMain);
    leftMain.appendChild(notificationBarDiv);
    leftMain.appendChild(mainCanvasC);
    leftMain.appendChild(linegraphCanvasC);

    /*container.appendChild(menuHeader);
    container.appendChild(sidebar);*/
    container.appendChild(leftMain);

    var mainCanvas       = canvas(container, mainCanvasC),
        linegraphCanvas  = canvas(container, linegraphCanvasC);

    /*var mainCanvas       = canvas(document.getElementById('canvas'),    refresh);
    var linegraphCanvas  = canvas(document.getElementById('linegraph'), refresh);*/

    var colorValues      = require('graphics').valueColors,
        modelLayer       = require('model_layer'),

        notification     = require('notification_bar'),

        network          = require('network'),
        informationTree  = require('information_tree');

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

    loadedModel.static              = {};
    loadedModel.static.width        = container.offsetWidth;
    loadedModel.static.height       = container.offsetHeight;
    loadedModel.static.showSimulate = false;
    loadedModel.static.renderChangePercent = true;

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

            //sidebar.style['max-height'] = (container.offsetHeight - 44) + 'px';

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

    loadedModel.CONFIG = configObject;

    var settings      = require('settings');

    window.Immutable  = Immutable;        
    window.collisions = require('collisions');

    var context       = mainCanvas.getContext('2d');

    var MouseEmitter = require('mechanics').MouseEmitter;
    var mouseEventEmitter = new MouseEmitter(mainCanvas);

    var mouseDownMiddleware = require('mouse_middleware').handleDown,
        mouseMoveMiddleware = require('mouse_middleware').handleMove,
        mouseUpMiddleware   = require('mouse_middleware').handleUp;

    mouseEventEmitter.on('mouseDown', function(canvas, button, startPos) {
        var middleware = mouseDownMiddleware[button];
        if(!middleware) {
            return;
        }

        var data = middleware({
            env:       loadedModel.environment,
            pos:       startPos,
            settings:  loadedModel.settings,
            nodeGui:   loadedModel.nodeGui,
            links:     loadedModel.links
        });

        loadedModel.settings = data.settings;
        loadedModel.nodeGui  = data.nodeGui;
        loadedModel.links    = data.links;
    });

    mouseEventEmitter.on('mouseMove', function(canvas, button, startPos, lastPos, deltaPos) {
        var middleware = mouseMoveMiddleware[button];
        if(!middleware) {
            return;
        }

        loadedModel.didDrag = true;
        var data = middleware({
            env:       loadedModel.environment,
            pos:       lastPos,
            deltaPos:  deltaPos,
            settings:  loadedModel.settings,
            nodeGui:   loadedModel.nodeGui,
            links:     loadedModel.links
        });

        loadedModel.settings = data.settings;
        loadedModel.nodeGui  = data.nodeGui;
        loadedModel.links    = data.links;

        loadedModel.emit('refresh');
    });

    mouseEventEmitter.on('mouseUp',   function(canvas, button, startPos, endPos) {
        var middleware = mouseUpMiddleware[button];
        if(!middleware) {
            return;
        }

        var data = middleware({
            env:        loadedModel.environment,
            pos:        endPos,
            nodeData:   loadedModel.nodeData,
            nodeGui:    loadedModel.nodeGui,
            links:      loadedModel.links,
            didDrag:    loadedModel.didDrag,
            settings:   loadedModel.settings,
            selected:   loadedModel.selected,
            history:    loadedModel.history,
            generateId: function(){return loadedModel.generateId()},

            newLinks:   []
        });

        loadedModel.settings = data.settings;
        loadedModel.nodeData = data.nodeData;
        loadedModel.nodeGui  = data.nodeGui;
        loadedModel.links    = data.links;

        data.newLinks.forEach(function(newLink) {
            loadedModel.emit(newLink, 'newLink');
        });

        if(loadedModel.selected !== data.selected) {
            loadedModel.selected = data.selected;
        }

        if(data.resetUI) {
            loadedModel.emit('resetUI');
        }

        if(data.selectableObjectUpdated) {
            loadedModel.emit('selectableObjectUpdated');
        }

        if(data.refreshLinegraph) {
            loadedModel.emit('refreshLinegraph');
        }

        loadedModel.emit('select');
        loadedModel.emit('refresh');

        loadedModel.didDrag = false;

        canvas.panX = -loadedModel.settings.offsetX;
        canvas.panY = -loadedModel.settings.offsetY;
    });

    container.addEventListener('mousedown', function(ev) {
        window.sense4us.lastTarget = ev.target;
    });
    
    var keyboardHandler = require('mechanics').keyboardHandler,
        hotkeyE         = require('input').hotkeyE,
        hotkeyZ         = require('input').hotkeyZ,
        hotkeyY         = require('input').hotkeyY,
        hotkeyV         = require('input').hotkeyV,
        hotkeyESC       = require('input').hotkeyEsc;

    keyboardHandler(document.body, mainCanvas, loadedModel, [hotkeyE, hotkeyZ, hotkeyY, hotkeyESC]);

    var zoom = 1;
    function MouseWheelHandler(e) {
        console.log('scrolling', e);
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

    loadedModel.addListener('modelLoaded', function(id, syncId) {
        //console.log('Model loaded:', id, syncId, 'Resetting pan.');
        console.log(loadedModel.settings.offsetX, loadedModel.settings.offsetY);
        // Sets the canvas panning values to the panning/offset values from the loadedModel.
        // Makes sure canvas/arithmetics.mouseToCanvas returns a relevant number.
        mainCanvasC.panX = -loadedModel.settings.offsetX;
        mainCanvasC.panY = -loadedModel.settings.offsetY;
    });

    if(container.getAttribute('data-experimental') === 'true') {
        function MouseHandler(e) {
            var zoomFactor    = loadedModel.settings.zoom;
            var mousePosition = canvas.arithmetics.mouseToCanvas(
                {x: e.pageX, y: e.pageY},
                mainCanvasC
            );

            //console.log('mousePosition: ', mousePosition);

            var xZoom = mousePosition.x / zoomFactor,
                yZoom = mousePosition.y / zoomFactor;

            loadedModel.static.xZoom = xZoom;
            loadedModel.static.yZoom = yZoom;

            //console.log('mousePosition: ', mousePosition);
            //console.log('xZoom: ',         xZoom);
        }

        function ZoomHandler(e) {
            e.stopPropagation();
            e.preventDefault();

            var sensitivity = 0.1;

            // Get direction of scrolling
            var direction  = 0; // By default the scroll direction is zero
            direction     += (e.deltaY > 0 ? -1 : 0); // If the scrolling is positive in the y-direction, add -1 to the direction value.
            direction     += (e.deltaY < 0 ? +1 : 0); // If the scrolling is negative in the y-direction, add 1 to the direction value.        
            
            // Input Node XY (raw)
            // Input zoom amount value
            // Input click location XY (raw affected by panning)

            var preZoom = loadedModel.settings.zoom;
            var newZoom = loadedModel.settings.zoom + direction * sensitivity;

            if(newZoom <= 0) {
                return;
            }

            var deltaZoom    = newZoom - preZoom;
            var deltaOffsetX = loadedModel.static.xZoom * deltaZoom,
                deltaOffsetY = loadedModel.static.yZoom * deltaZoom;

            console.log('loadedModel.static.xZoom: ', loadedModel.static.xZoom);
            console.log('loadedModel.static.xZoom: ', loadedModel.static.xZoom);
            console.log('deltaZoom: ', deltaZoom);

            loadedModel.settings.zoom   = newZoom;
            loadedModel.settings.scaleX = loadedModel.settings.zoom;
            loadedModel.settings.scaleY = loadedModel.settings.zoom;

            loadedModel.settings.offsetX -= deltaOffsetX;
            loadedModel.settings.offsetY -= deltaOffsetY;

            console.log('deltaOffsetX: ', deltaOffsetX);
            console.log('deltaOffsetY: ', deltaOffsetY);
            console.log('loadedModel.settings.offsetX: ', loadedModel.settings.offsetX);
            console.log('loadedModel.settings.offsetY: ', loadedModel.settings.offsetY);

            loadedModel.emit('refresh');

            //console.log('direction: ', direction);
            //console.log('container', container);
        }

        sidebar.root.addEventListener('wheel', function(evt){evt.stopPropagation();});

        container.addEventListener('wheel',     ZoomHandler);
        container.addEventListener('mousemove', MouseHandler);

    }

    var aggregatedLink   = require('aggregated_link');
    var refreshNamespace = require('refresh');

    var asyncMiddleware  = require('async_middleware');

    var lastShow;
    function showLineGraph(ctx, canvas, loadedModel, selectedMenu, next) {
        var show = loadedModel.settings.linegraph;

        if(show && lastShow !== show) {
            mainCanvas.height      = Math.ceil(((container.offsetHeight-20) * 0.5));
            linegraphCanvas.height = Math.floor(((container.offsetHeight-20) * 0.5));

            console.log('Shown again.');
            if(lastShow !== show) {
                linegraphRefresh();
            }
        } else if(!show) {
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

    var modelling = require('settings').modelling;
    function setupIconGroups(sidebar, modelling) {
        var menuItem = new NewUI.MenuItem(300);
        menuItem.child.clicks = [];
        NewUI.Button.prototype.click.call(menuItem.child, function(evt) {
            if(!evt.target.groupOwner) {
                return;
            }

            var button = evt.target.groupOwner;
            button.constructor(loadedModel, {
                name: button.name,
                role: button.role.toUpperCase()
            }, {
                avatar: button.nodeImageSrc
            });
        });

        modelling.forEach(function(nodeGroup) {
            var group = menuItem.addIconGroup(nodeGroup.header);
            nodeGroup.images.forEach(function(image) {
                var button                   = group.addIcon(configObject.url + '/' + image.src);

                button.root.groupOwner       = button;
                button.image.root.groupOwner = button;

                button.image.root.style['border-radius'] = '50%';

                button.name                  = image.header;
                button.role                  = nodeGroup.header;
                button.constructor           = nodeGroup.callback;
                button.nodeImageSrc          = image.src;
            });
        });

        sidebar.addItem(menuItem);

        return menuItem;
    }

    var _ = setupIconGroups(sidebar, modelling);
    _.setLabel('Modelling');

    function setupSimulate(sidebar, simulate) {
        var menuItem = new NewUI.MenuItem(300);
        var scenarios = [];
        objectHelper.forEach.call(loadedModel.scenarios, function(scenario) {
            scenarios.push({value: scenario.id, label: scenario.name});
        });

        var onNew = function(done) {
            var newScenario = new Scenario();
            newScenario.data = objectHelper.copy.call(loadedModel.loadedScenario.data);
            loadedModel.scenarios[newScenario.id] = newScenario;

            done(newScenario.name, newScenario.id);
        };

        var onEdit = function(id, header) {
            var scenario = loadedModel.scenarios[id];
            if(!scenario) {
                return;
            }

            scenario.name = header;
        };

        var onDelete = function(id) {
            if(!loadedModel.scenarios[id]) {
                return;
            }

            delete loadedModel.scenarios[id];
        };

        var onChange = function(id, header) {
            loadedModel.loadedScenario = loadedModel.scenarios[id];
            loadedModel.emit('refresh');
        };

        var editableDropdown = menuItem.addEditableDropdown('Scenario', scenarios, onNew, onEdit, onDelete, onChange);
        loadedModel.addListener('modelLoaded', function(id, syncId, prevId, prevSyncId) {
            if((syncId === false && id === prevId) || (syncId !== false && syncId === prevSyncId)) {
                return;
            }

            var scenarios = [];
            objectHelper.forEach.call(loadedModel.scenarios, function(scenario) {
                scenarios.push({value: scenario.id, label: scenario.name});
            });

            editableDropdown.replaceValues(scenarios);

            loadedModel.emit('refresh');
        });

        var items = {};

        menuItem.child.on('unfolded', function() {
            if(loadedModel.static.showSimulate === true) {
                menuItem.simulateCheckbox.check();
            }
        });

        loadedModel.addListener('showSimulate', function(shouldCheck) {
            if(shouldCheck) {
                menuItem.simulateCheckbox.check();
            } else {
                menuItem.simulateCheckbox.uncheck();
            }
        });

        simulate.forEach(function(row) {
            switch(row.type) {
                case 'BUTTON':
                    var button = menuItem.addButton(row.header, function() {
                        row.callback(loadedModel)
                    });

                    if(row.id) {
                        items[row.id] = button;
                    }
                    break;
                case 'CHECKBOX':
                    var checkbox = menuItem.addCheckbox(row.header);

                    checkbox.onCheck(function() {
                        row.onCheck(loadedModel);
                    });

                    checkbox.onUncheck(function() {
                        row.onUncheck(loadedModel);
                    });

                    if(row.id) {
                        items[row.id] = button;
                    }

                    if(row.id) {
                        menuItem[row.id] = checkbox;
                    }
                    break; 
                case 'DROPDOWN':
                    var dropdown = menuItem.addDropdown(row.header, row.values);

                    dropdown.defaultValue(function() {
                        return row.defaultValue(loadedModel, row.values);
                    });

                    dropdown.onChange(function() {
                        row.onChange(loadedModel, dropdown.getValue());
                    });

                    if(row.id) {
                        items[row.id] = dropdown;
                    }
                    break;
                case 'SLIDER':
                    var range  = row.range(loadedModel),
                        slider = menuItem.addSlider(row.header, range[0], range[1]);

                    slider.defaultValue(function() {
                        var range = row.range(loadedModel);
                        slider.setMin(range[0]);
                        slider.setMax(range[1]);

                        return row.defaultValue(loadedModel);
                    });

                    if(row.onSlide) {
                        slider.onInput(function() {
                            row.onSlide(loadedModel, slider.getValue());
                        });
                    }

                    slider.onChange(function() {
                        row.onChange(loadedModel, slider.getValue());
                    });

                    if(row.id) {
                        items[row.id] = slider;
                    }
                    break;

                case 'INPUT':
                    var input = menuItem.addInput(row.header);
                    input.defaultValue(function() {
                        return row.defaultValue(loadedModel);
                    });

                    input.onChange(function() {
                        var value = input.getValue();
                        if(row.id === 'iterations') {
                            items.timestep.setMax(value);
                        }

                        row.onChange(loadedModel, value);
                    });

                    if(row.id) {
                        items[row.id] = input;
                    }
                    break;
            }
        });

        sidebar.addItem(menuItem);
        return menuItem;
    }

    var _simulate = require('settings').simulate;
    var __ = setupSimulate(sidebar, _simulate);
    __.setLabel('Simulate');

    var newButton  = sidebar.addButton('file', function() {
        loadedModel.emit('storeModel');
        loadedModel.emit([loadedModel.id, loadedModel.syncId], 'preNewModel');
        loadedModel.emit('newModel');
    });

    var saveButton = sidebar.addButton('floppy-disk', function() {
        loadedModel.emit('storeModel');
        loadedModel.emit([loadedModel.id, loadedModel.syncId], 'loadModel');
        loadedModel.emit([loadedModel.id, loadedModel.syncId], 'preSaveModel');
        loadedModel.emit([loadedModel.id, loadedModel.syncId], 'saveModel');
    });

    var deleteButton = sidebar.addButton('trash', function() {
        loadedModel.emit({
            description: 'Do you really want to delete this model?',
            buttons: [
                {
                    background: Colors.warningRed,
                    color:      Colors.white,
                    callback: function(popup) {
                        loadedModel.emit([loadedModel.id, loadedModel.syncId], 'deleteModel');
                        popup.destroy();
                    },
                    label: 'Confirm'
                },

                {
                    background: Colors.white,
                    callback: function(popup) {
                        popup.destroy();
                    },
                    label: 'Cancel'
                }
            ]
        }, 'popup');
    });

    var printLoadedModel = sidebar.addButton('alert', function() {
        console.log(loadedModel);
    });

    var Button = NewUI.Button;
    function setupLoadModel(sidebar) {
        var menuItem = new NewUI.MenuItem(300);
        menuItem.setLabel('Load model');

        menuItem.child.clicks = [];
        
        Button.prototype.click.call(menuItem.child, function(evt) {
            var button      = evt.target.modelButton;
            var deleteModel = evt.target.deleteModel;

            if(button) {
                loadedModel.loadModel(button.syncId || button.id);
                return;
            }

            if(deleteModel) {
                loadedModel.deleteModel(deleteModel.syncId || deleteModel.id);
                return;
            }
        });

        var buttons = [];
        var createButton = function(iterator) {
            var button;
            if(iterator < buttons.length) {
                button = buttons[iterator];
            } else {
                button = menuItem.addButton();
                button.root.modelButton = button;
                buttons.push(button);

                button.label.root.modelButton = button;

                /*var trashButton = new NewUI.Button();
                button.appendChild(trashButton);

                var trashIcon = new NewUI.Element('span');
                trashButton.appendChild(trashIcon);
                trashIcon.root.className = 'glyphicon glyphicon-trash';
                trashButton.root.style['margin-right'] = '16px';

                button.label.root.style.display = 'inline-block';
                trashButton.root.style.float  = 'right';

                var clearTrash = new NewUI.Element('div');
                clearTrash.root.style.clear = 'both';

                button.appendChild(clearTrash);
                trashButton.root.deleteModel = button;
                trashIcon.root.deleteModel = button;
                trashButton.setWidth(20);
                trashButton.setHeight(20);*/
            }

            return button;
        }

        var lastActiveModelButton = false;
        menuItem.refresh = function() {
            loadedModel.getAllModels().then(function(models) {
                var iterator = 0;
                var initialSize = buttons.length;
                models = models.map(function(model, index, arr) {
                    return arr[arr.length - (index + 1)];
                });

                models.forEach(function(model) {
                    if(savedModels.synced[model.id] && savedModels.local[savedModels.synced[model.id].id]) {
                        return;
                    }

                    var button = createButton(iterator);

                    if(savedModels.synced[model.id]) {
                        button.setLabel(savedModels.synced[model.id].settings.name);
                    } else {
                        button.setLabel(model.name);
                    }

                    button.syncId = model.id;
                    button.id     = model.id;

                    if(loadedModel.syncId === model.id) {
                        if(lastActiveModelButton) {
                            lastActiveModelButton.setBackground(Colors.buttonBackground);
                        }

                        button.setBackground(Colors.buttonCheckedBackground);
                        lastActiveModelButton = button;
                    }

                    iterator++;
                });

                objectHelper.forEach.call(
                    savedModels.local,
                    function(model) {
                        var button = createButton(iterator);

                        button.setLabel(model.settings.name);
                        button.syncId = model.syncId || false;
                        button.id     = model.id;

                        if(loadedModel.id === model.id) {
                            if(lastActiveModelButton) {
                                lastActiveModelButton.setBackground(Colors.buttonBackground);
                            }
                            
                            button.setBackground(Colors.buttonCheckedBackground);
                            lastActiveModelButton = button;
                        }

                        iterator++;
                    }
                );

                var localSaved = objectHelper.size.call(savedModels.local);
                if(models.length + localSaved < buttons.length) {
                    var removedButtons = buttons.splice(models.length + localSaved, buttons.length - models.length);
                    removedButtons.forEach(function(button) {
                        button.destroy();
                    });
                }
            }).catch(function(error) {
                console.error(error);
            });
        };

        menuItem.refresh();

        sidebar.addItem(menuItem);
        return menuItem;
    }

    setupLoadModel(sidebar);

    function Scenario(syncId) {
        this.id                = loadedModel.generateId();
        this.syncId            = syncId;

        this.name              = 'New scenario';
        this.data              = {};

        this.measurement       = 'Week';
        this.measurementAmount = 1;
        this.maxIterations     = 4;
        this.timeStepN         = 0;
    }

    var algorithms = require('algorithms');
    var sort       = algorithms.sort;

    loadedModel.addListener('invertSidebar', function() {
        sidebar.invert();
    });

    require('model').listeners.popup(container, loadedModel);
    require('model').listeners.notification(notificationBarDiv, loadedModel);
    require('model').listeners.mouseDown(loadedModel);
    require('model').listeners.mouseMove(loadedModel);
    require('model').listeners.mouseUp(loadedModel);
    require('model').listeners.delete(loadedModel);

    loadedModel.addListener('resetUI', function() {
        sidebar.foldable.menuItems.forEach(function(menuItem) {
            menuItem.refresh();
        });
    });

    loadedModel.addListener('settings', refresh);
    /**
     * @description Renders a new frame for the canvas.
     * @event refresh
     * @memberof module:model/propagationEvents
     */
    loadedModel.addListener('refresh',  refresh);

    require('model').listeners.selected (sidebar, loadedModel);


    require('model').listeners.storeModel (savedModels, loadedModel);
    require('model').listeners.loadModel  (savedModels, loadedModel);
    require('model').listeners.newModel   (savedModels, loadedModel);
    require('model').listeners.deleteModel(savedModels, loadedModel);
    require('model').listeners.saveModel  (savedModels, loadedModel);

    var localId = loadedModel.id;
    loadedModel.emit('storeModel');
    loadedModel.emit([localId, false], 'loadModel');

    require('model').listeners.settings(loadedModel);
    loadedModel.addListener('settings', function() {
        if(loadedModel.settings.linegraph) {
            linegraphRefresh();
        }
    });

    loadedModel.addListener('refreshLinegraph', function() {
        if(loadedModel.settings.linegraph) {
            console.log('Refreshing linegraph.');
            linegraphRefresh();
        }
    });

    loadedModel.emit(null, 'refresh', 'resetUI', 'settings', 'sidebar');
    loadedModel.emit('Initialized', 'notification');

    var Chart = require('chart.js');
    var drawLineGraph = require('graphics').drawLineGraph;
    function _linegraphRefresh() {
        var lctx = linegraphCanvas.getContext('2d');

        var labels   = [];
        for(var i = 0; i <= loadedModel.loadedScenario.maxIterations; i++) {
            labels.push(''+i);
        }

        console.log('We are here.');

        var selectedNodes = objectHelper.filter.call(
            loadedModel.nodeGui,
            function(node) {
                return node.linegraph;
            }
        );

        var nodeData = loadedModel.nodeData;
        var nodeGui  = loadedModel.nodeGui;
        var datasets = Object.keys(selectedNodes).map(function(key) {
            var nodegui = nodeGui[key];
            var node    = nodeData[key];

            console.log(node);

            return {
                label:            node.name,
                data:             node.simulateChange,
                fill:             false,
                lineTension:      0.1,
                backgroundColor:  nodegui.color,
                pointBorderColor: nodegui.color,
                borderColor:      nodegui.color
            };
        });

        Chart.Line(lctx, {
            data: {
                labels:   labels,
                datasets: datasets
            },

            options: {
                scales: {
                    yAxes: [{
                        ticks: {
                            beginAtZero: true
                        }
                    }]
                }
            }
        });
    }

    function refresh() {
        window.requestAnimationFrame(_refresh);
    }

    function linegraphRefresh() {
        window.requestAnimationFrame(_linegraphRefresh);
    }

    linegraphRefresh();

    sidebar.foldButton.root.click();

    return loadedModel;
}

window.sense4us              = window.sense4us || {};
window.sense4us.lastTarget   = false;
window.sense4us.inflateModel = inflateModel;
window.sense4us.inflateTool  = inflateModel;
window.sense4us.NewUI        = require('new_ui');
