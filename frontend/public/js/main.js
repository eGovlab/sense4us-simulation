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

/*var loadedModel.nodeData = Immutable.Map(),
    loadedModel.nodeGui  = Immutable.Map(),
    links    = Immutable.Map();*/

var network = require('./network/network_layer.js');
network.setDomain("localhost:3000");

var selected_menu = null,
    loadedModel   = null,
    environment   = "model";

var draw_node = require('./graphics/draw_node.js');
draw_node = curry(draw_node, main_canvas.getContext('2d'));

var createNode = function(x, y, type) {
    if(typeof x !== "number") {
        x = false;
    }

    if(typeof y !== "number") {
        y = false;
    }

    if(typeof type !== "string") {
        type = false;
    }

    var id = loadedModel.generateId();
    loadedModel.setData(Immutable.Map({
        id: id,
        value: 0,
        relativeChange: 0,
        simulateChange: 0,
        type: type || "intermediate"
    }));

    loadedModel.setGui(generateNodeGui(id, x, y));

    refresh();
};

function generateNodeGui(id, x, y, radius) {
    return Immutable.Map({
        id: id,
        x: x || 200,
        y: y || 100,
        avatar: 'https://mdn.mozillademos.org/files/5397/rhino.jpg',
        radius: radius || 75
    });
}

var createOriginNode = function() {
    createNode(100, 100, 'origin');
}
var createActorNode = function() {
    createNode(100, 100, 'actor');
}

var breakoutAllNodes = function() {
    var dd = loadedModel.nodeData.toJSON(),
        dg = loadedModel.nodeGui.toJSON(),
        allNodes = [];

    Object.keys(dd).forEach(function(_dd_id) {
        if(!dg[_dd_id]) {
            return;
        }

        var obj = dd[_dd_id];
        Object.keys(dg[_dd_id]).forEach(function(_dg_property) {
            obj[_dg_property] = dg[_dd_id][_dg_property];
        });

        allNodes.push(obj);
    });

    return allNodes;
}

var breakoutAllLinks = function() {
    var links = loadedModel.links.toJSON(),
        allLinks = [];

    Object.keys(links).forEach(function(key) {
        allLinks.push(links[key]);
    });

    return allLinks;
}

var sendAllData = function() {
    network.postData("/models/print", {
        nodes: breakoutAllNodes(),
        links: loadedModel.links.toJSON()
    });
};

var requestRight = function() {
    var data = {
        nodes: loadedModel.nodeData.merge(loadedModel.nodeGui).toJSON(),
        links: loadedModel.links.toJSON()
    };

    network.postData("/models/move-right", data, function(response) {
        var nodes = response.response.nodes;

        Object.keys(nodes).forEach(function(id) {
            var node = nodes[id];
            loadedModel.nodeGui = loadedModel.nodeGui.set(node.id, generateNodeGui(node.id, node.x, node.y, node.radius));
        });

        refresh();
    });
};

var requestLeft = function() {
    var data = {
        nodes: loadedModel.nodeData.merge(loadedModel.nodeGui).toJSON(),
        links: loadedModel.links.toJSON()
    };

    network.postData("/models/move-left", data, function(response) {
        var nodes = response.response.nodes;

        Object.keys(nodes).forEach(function(id) {
            var node = nodes[id];
            loadedModel.nodeGui = loadedModel.nodeGui.set(node.id, generateNodeGui(node.id, node.x, node.y, node.radius));
        });

        refresh();
    });
};

var saveModel = function() {
    if(loadedModel.synced) {
        var data = {
            modelId: loadedModel.id,
            model:   loadedModel.name,
            nodes:   breakoutAllNodes(),
            links:   breakoutAllLinks()
        };

        network.postData("/models/save", data, function(response, err) {
            if(err) {
                return;
            }
            console.log(response.response);
        });
        return;
    }

    var blackout = menuBuilder.div();
    blackout.className = "blackout";

    var saveForm = menuBuilder.div();
    saveForm.className = "save-form";

    var saveFormContainer = menuBuilder.div();
    saveFormContainer.className = "save-form-container";

    var form = document.createElement("form");
    var nameDiv = document.createElement("div");

    var nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.name = "model-name";
    nameInput.className = "save-form-input";
    var nameLabel = document.createElement("label");
    nameLabel.innerHTML = "Name";
    nameLabel.className = "save-form-label";

    nameDiv.appendChild(nameLabel);
    nameDiv.appendChild(nameInput);

    var buttonContainer = menuBuilder.div();
    buttonContainer.className = "save-form-button-container";

    var submitButton = document.createElement("input");
    submitButton.type = "submit";
    submitButton.value = "Save";

    var cancelButton = document.createElement("button");
    cancelButton.innerHTML = "Cancel";

    cancelButton.addEventListener("click", function(e) {
        e.preventDefault();
        console.log("Cancelled");
        document.body.removeChild(blackout);
    });

    buttonContainer.appendChild(submitButton);
    buttonContainer.appendChild(cancelButton);

    form.appendChild(nameDiv);
    form.appendChild(buttonContainer);

    saveFormContainer.appendChild(form);

    form.addEventListener("submit", function(e) {
        e.preventDefault();
        console.log("Sent");
        document.body.removeChild(blackout);

        console.log(nameInput.value);
        var data = {
            modelId: null,
            model: nameInput.value,
            nodes: breakoutAllNodes(),
            links: breakoutAllLinks()
        };

        network.postData("/models/save", data, function(response, err) {
            if(err) {
                return;
            }

            var id = response.response.id;
            var name = response.response.name;

            loadedModel.synced = true;
            loadedModel.setId(id);
            loadedModel.name = name;
            modelLayer.select(loadedModel);

            console.log(loadedModel);

            menuBuilder.updateAll();
        });
    });

    saveForm.appendChild(saveFormContainer);

    document.body.appendChild(blackout);
    blackout.appendChild(saveForm);
};

var simulate = function() {
    var timestep = parseInt(document.getElementById("timelag").value);
    if(isNaN(timestep)) {
        timestep = 0;
    }

    var data = {
        timestep: timestep,
        nodes: breakoutAllNodes(),
        links: loadedModel.links.toJSON()
    };

    network.postData("/models/simulate", data, function(response, err) {
        if(err) {
            return;
        }

        var nodes = response.response.nodes;
        nodes.forEach(function(node) {
            loadedModel.nodeData = loadedModel.nodeData.set(node.id, loadedModel.nodeData.get(node.id).set("simulateChange", node.relativeChange));
        });

        refresh();
    });
};

/*
** Create the main menu
*/

var menuBuilder = require("./menu_builder");
var menuLayer   = require("./menu-layer.js");
menuLayer.setMenuContainer(document.getElementById("upper_menu"));
menuLayer.setSidebarContainer(document.getElementById("menu_container"));
menuLayer.createMenu(
    {
        header: "Load"
    },

    {
        header: "Model",
        type: "dropdown",
        update: function() {
            var element = this;
            //element.options.length = 0;
            //element.selectedIndex  = -1;

            element.resetOptions();

            element.addOption("new", "New Model");

            /*var newModel = menuBuilder.option("new", "New Model");
            element.appendChild(newModel);*/
            /*var newModel1 = menuBuilder.option("new", "New Model");
            element.appendChild(newModel1);*/

            if(loadedModel === null) {
                loadedModel = modelLayer.createModel();
                loadedModel.setOption(menuBuilder.option(loadedModel.getId(), loadedModel.getId() + ": New Model"));
                modelLayer.select(loadedModel);
            }

            modelLayer.iterateModels(function(model, index) {
                element.addOption(model.getId(), model.name);
                if(model.getId() === modelLayer.selected.getId()) {
                    element.select(index + 1);
                }
            }, function() {
                element.refreshList();
                refresh();
            });
        },

        callback: function(e){
            var id = this.value;
            if(id === "new") {
                loadedModel = modelLayer.createModel();
                loadedModel.setOption(menuBuilder.option(loadedModel.getId(), loadedModel.getId() + ": New Model"));
                modelLayer.select(loadedModel);
            } else {
                loadedModel = modelLayer.select(id);
            }

            this.update();
        }
    },

    {
        header: "Mode"
    },

    {
        header: "Model",
        callback: function(){
            selected_menu = null;

            menuLayer.activateSidebar("model");
            environment = "model";
            refresh();
        }
    },

    {
        header: "Simulate",
        callback: function() {
            selected_menu = null;

            menuLayer.activateSidebar("simulate");
            environment = "simulate";
            refresh();
        }
    }
);

menuLayer.createSidebar("model",
    {
        header: "Create node",
        callback: createNode
    },

    {
        header: "Create origin",
        callback: createOriginNode
    },

    {
        header: "Create actor",
        callback: createActorNode
    },

    {
        header: "Send all data",
        callback: sendAllData
    },

    {
        header: "Move all nodes right 50 pixels.",
        callback: requestRight
    }

    /*{
        header: "Save",
        callback: saveModel
    },*/
);

menuLayer.createSidebar("simulate",
    {
        header: "Move all nodes left 50 pixels.",
        callback: requestLeft
    },

    {
        header: "Run simulation",
        callback: simulate
    },

    {
        type: "input",
        header: "Timelag",
        id: "timelag",
        default: 0
    }
);

menuLayer.activateSidebar("model");

window.Immutable = Immutable;
window.collisions = require('./collisions.js');

/*createNode(200, 100);
createNode(220, 120);
createNode(240, 140);
createNode(260, 160);
createNode(280, 180);
createNode(300, 200);*/

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