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
    modelLayer       = require('./model_layer.js'),
    menuBuilder      = require('./menu_builder'),
    notificationBar  = require('./notification_bar'),
    network = require('./network'),
    CONFIG  = require('rh_config-parser');

notificationBar.setContainer(document.getElementById('notification-bar'));

CONFIG.setConfig(require('./config.js'));
network.setDomain(CONFIG.get('BACKEND_HOSTNAME'));

var selectedMenu  = Immutable.Map({}),
    loadedModel   = modelLayer.newModel(),
    savedModels   = Immutable.Map({
        local:  Immutable.Map().set(loadedModel.get('id'), loadedModel),
        synced: Immutable.Map()
    }),
    environment   = 'edit';

var UI = require('./ui'),
    settings = require('./settings');

var UIData = Immutable.Map({
    sidebar:      settings.sidebar,
    menu:         settings.menu,
    selectedMenu: Immutable.List()
});

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



var drawNode = require('./graphics/draw_node.js');
    drawNode = curry(drawNode, mainCanvas.getContext('2d'));

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
            console.log('LINK');
            console.log(newSelected);
            //loadedModel.get('links') = loadedModel.get('links').delete(newSelected.get('id'));
            return;
        }
        
        loadedModel = loadedModel.set('links', loadedModel.get('links').set(newSelected.get('id'),
            loadedModel.get('links').get(newSelected.get('id')).merge(Immutable.Map({
                    coefficient: newSelected.get('coefficient'),
                    timelag:     newSelected.get('timelag'),
                    type:        newSelected.get('type')
                })
            )
        ));
    } else if (newSelected.get('maxIterable') !== undefined) {
        loadedModel = loadedModel.set('settings', newSelected);
    } else {
        if(newSelected.get('delete') === true) {
            console.log('NODE');

            var seq = newSelected.get('links').toSeq();
            seq.forEach(function(linkId) {
                console.log(linkId);
            });
            return;
        }

        loadedModel = loadedModel.set('nodeData', loadedModel.get('nodeData').set(newSelected.get('id'), 
            loadedModel.get('nodeData').get(newSelected.get('id')).merge(Immutable.Map({
                    id:             newSelected.get('id'),
                    value:          newSelected.get('value'),
                    relativeChange: newSelected.get('relativeChange'),
                    description:    newSelected.get('description')
                })
            )
        ));

        loadedModel = loadedModel.set('nodeGui', loadedModel.get('nodeGui').set(newSelected.get('id'), 
            loadedModel.get('nodeGui').get(newSelected.get('id')).merge(Immutable.Map({
                    radius: newSelected.get('radius'),
                    avatar: newSelected.get('avatar'),
                    icon: newSelected.get('icon')
                })
            )
        ));
        /*loadedModel.get('nodeGui') = loadedModel.get('nodeGui').set(newSelected.get('id'),
            loadedModel.get('nodeGui').get(newSelected.get('id')).merge(newSelected.map(function(node) {
                return {
                    radius: node.get('radius')
                };
            }))
        );*/
        //loadedModel.get('nodeData') = loadedModel.get('nodeData').set(newSelected.get('id'), Immutable.Map({id: newSelected.get('id'), value: newSelected.get('value'), relativeChange: newSelected.get('relativeChange'), type: newSelected.get('type')}));
        //loadedModel.get('nodeGui')  = loadedModel.get('nodeGui').set(newSelected.get('id'), Immutable.Map({id: newSelected.get('id'), x: newSelected.get('x'), y: newSelected.get('y'), radius: newSelected.get('radius')}));
    }

    if(savedModels.get('synced').get(loadedModel.get('id')) !== undefined) {
        savedModels = savedModels.set('synced',
            savedModels.get('synced').set(loadedModel.get('id'),
                loadedModel.set('settings', loadedModel.get('settings').set('saved',
                    false)
                )
            )
        );
    } else {
        savedModels = savedModels.set('local',
            savedModels.get('local').set(loadedModel.get('id'),
                loadedModel.set('settings', loadedModel.get('settings').set('saved',
                    false)
                )
            )
        );
    }

    UIRefresh();
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
        var data = mouseDownWare({pos: Immutable.Map({x: pos.x, y: pos.y}), nodeGui: loadedModel.get('nodeGui'), links: loadedModel.get('links')});
        loadedModel = loadedModel.set('nodeGui', loadedModel.get('nodeGui').merge(data.nodeGui));
        loadedModel = loadedModel.set('links', loadedModel.get('links').merge(data.links));

        refresh();

        return true;
    },

    function mouseMove(pos) {
        var data = mouseMoveWare({pos: Immutable.Map({x: pos.x, y: pos.y}), nodeGui: loadedModel.get('nodeGui'), links: loadedModel.get('links')});
        loadedModel = loadedModel.set('nodeGui', loadedModel.get('nodeGui').merge(data.nodeGui));
        loadedModel = loadedModel.set('links', loadedModel.get('links').merge(data.links));

        refresh();
    },
    
    function mouseUp(pos) {
        var data = mouseUpWare({pos: Immutable.Map({x: pos.x, y: pos.y}), nextId: loadedModel.get('nextId'), nodeGui: loadedModel.get('nodeGui'), links: loadedModel.get('links')});
        loadedModel = loadedModel.set('nodeGui', loadedModel.get('nodeGui').merge(data.nodeGui));
        loadedModel = loadedModel.set('links', loadedModel.get('links').merge(data.links));
        loadedModel = loadedModel.set('nextId', data.nextId);

        refresh();
    }
);

function sidebarRefresh(UIData, container, updateCallback) {
    var sidebarMenu = document.createElement('div');
    sidebarMenu.className = 'menu';
    container.appendChild(sidebarMenu);

    UIData.get('sidebar').forEach(function(button) {
        var buttonElement;
        if(button.get('ajax') === true) {
            buttonElement = menuBuilder.button(button.get('header'), function() {
                button.get('callback')(refresh, changeCallbacks);
            });
        } else {
            buttonElement = menuBuilder.button(button.get('header'), function() {
                updateCallback(button.get('callback')(loadedModel));
            });
        }
        

        sidebarMenu.appendChild(buttonElement);
    });
}

function menuRefresh(UIData, container, updateCallback) {
    var menuBar = document.createElement('div');
    menuBar.className = 'menu';
    container.appendChild(menuBar);

    UIData.get('menu').forEach(function(menu) {
        var button = null;

        if(menu.get('callback') !== undefined && menu.get('update') !== undefined) {
            var dd = menuBuilder.dropdown(
                menu.get('header'),
                function onClick() {
                    menu.get('callback').call(
                        this,
                        refresh,
                        UIRefresh,
                        changeCallbacks
                    );
                },
                
                function update() {
                    menu.get('update').call(
                        this,
                        refresh,
                        UIRefresh,
                        changeCallbacks
                    );
                }
            );

            button = dd;
        } else if (menu.get('callback') !== undefined) {
            button = menuBuilder.button(menu.get('header'), function() {
                updateCallback(menu.get('callback')(UIData));
            });
        }

        if(button === null) {
            return;
        }

        menuBar.appendChild(button);
    });
}

function UIRefresh() {
    var sidebarContainer = document.getElementById('sidebar'),
        menuContainer    = document.getElementById('upper-menu');

    while(sidebarContainer.firstChild) {
        sidebarContainer.removeChild(sidebarContainer.firstChild);
    }

    while(menuContainer.firstChild) {
        menuContainer.removeChild(menuContainer.firstChild);
    }

    sidebarRefresh(UIData, sidebarContainer, function(updatedModel) {
        loadedModel = updatedModel;
        refresh();
    });

    menuRefresh(UIData, menuContainer, function(updatedUI) {
        UIData = updatedUI;
        UIRefresh();
    });
}

UIRefresh();

var aggregatedLink = require('./aggregated_link.js');
function _refresh() {
    /*if (modelLayer.selected !== loadedModel) {
        loadedModel = modelLayer.selected;
    }*/

    context.clearRect(0, 0, mainCanvas.width, mainCanvas.height);

    // draw the links and arrows
    loadedModel.get('links').forEach(function(link) {
        drawLink(aggregatedLink(link, loadedModel.get('nodeGui')));
    });

    // get all the selected objects
    var selected = loadedModel.get('nodeData')
        .filter(function(node) { return loadedModel.get('nodeGui').get(node.get('id')).get('selected') === true; })
        .map(function(node) {
            return Immutable.Map({
                id: node.get('id'),
                value: node.get('value'),
                relativeChange: node.get('relativeChange'),
                description: node.get('description')
            }).merge(
                Immutable.Map({
                        radius: loadedModel.get('nodeGui').get(node.get('id')).get('radius'),
                        avatar: loadedModel.get('nodeGui').get(node.get('id')).get('avatar'),
                        icon: loadedModel.get('nodeGui').get(node.get('id')).get('icon')
                    })
            );
            
            //return node.merge(loadedModel.get('nodeGui').get(node.get('id')));
        })
        .merge(
            loadedModel.get('links').filter(function(link) {return link.get('selected') === true;})
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