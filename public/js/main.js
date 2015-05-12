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
    loadedModel   = null;

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
        type: type || "intermediate"
    }));

    loadedModel.setGui(Immutable.Map({
        id: id,
        x: x || 200,
        y: y || 100,
        radius: 75
    }));

    refresh();
};
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

var sendAllData = function() {
    network.postData("/models/print", {
        nodes: breakoutAllNodes(),
        links: loadedModel.links.toJSON()
    });
};

var requestMove = function() {
    var data = {
        nodes: loadedModel.nodeData.merge(loadedModel.nodeGui).toJSON(),
        links: loadedModel.links.toJSON()
    };

    network.postData("/models/move", data, function(response) {
        var nodes = response.response.nodes;

        Object.keys(nodes).forEach(function(id) {
            var node = nodes[id];
            loadedModel.nodeGui = loadedModel.nodeGui.set(node.id, Immutable.Map({
                id: node.id,
                x: node.x,
                y: node.y,
                radius: node.radius
            }));
        });

        refresh();
    });
};

var saveModel = function() {
    var data = {
        model: null,
        nodes: breakoutAllNodes(),
        links: loadedModel.links.toJSON()
    };

    var blackout = menuBuilder.div();
    blackout.className = "blackout";

    var saveForm = menuBuilder.div();
    saveForm.className = "save-form";

    var form = document.createElement("form");

    var nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.name = "name";
    nameInput.className = "save-form-input";
    var nameLabel = document.createElement("label");
    nameLabel.innerHTML = "Name";
    nameLabel.appendChild(nameInput);
    nameLabel.className = "save-form-label";

    var buttonContainer = menuBuilder.div();
    buttonContainer.className = "save-form-button-container";

    var submitButton = document.createElement("input");
    submitButton.type = "submit";
    submitButton.value = "Save";

    var cancelButton = document.createElement("input");
    cancelButton.type = "submit";
    cancelButton.value = "Cancel";

    buttonContainer.appendChild(submitButton);
    buttonContainer.appendChild(cancelButton);

    form.appendChild(nameLabel);
    form.appendChild(buttonContainer);
    saveForm.appendChild(form);

    document.body.appendChild(blackout);
    blackout.appendChild(saveForm);

    network.postData("/models/save", data, function(response, err) {
        if(err) {
            return;
        }
        console.log(response.response);
    });
};

var simulate = function() {

    console.log("simulate callback!");

    var data = {
        nodes: breakoutAllNodes(),
        links: loadedModel.links.toJSON()
    };

    network.postData("/models/simulate", data, function(response) {
        console.log("received callback response, need to update values of nodes!");
        /*var nodes = response.response.nodes;

        Object.keys(nodes).forEach(function(id) {
            var node = nodes[id];
            nodeGui = nodeGui.set(node.id, Immutable.Map({
                id: node.id,
                x: node.x,
                y: node.y,
                radius: node.radius
            }));
        });*/

        refresh();
    });
};

/*
** Create the main menu
*/

var menuBuilder = require("./menu_builder");
var menuLayer   = require("./create_menu.js");
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

            while(element.firstChild) {
                element.removeChild(element.firstChild);
            }

            /*var newModel = menuBuilder.option("new", "New Model");
            element.appendChild(newModel);
            var newModel1 = menuBuilder.option("new", "New Model");
            element.appendChild(newModel1);*/

            if(loadedModel === null) {
                loadedModel = modelLayer.createModel();
                loadedModel.setOption(menuBuilder.option(loadedModel.getId(), loadedModel.getId() + ": New Model"));
                modelLayer.select(loadedModel);
            }

            modelLayer.iterateModels(function(model, index) {
                element.addOption(model.getId(), model.name);
                if(model.getId() === modelLayer.selected.getId()) {
                    element.select(index);
                }
            }, function() {
                element.refreshList();
                refresh();
            });
        },

        callback: function(e){
            var id = this.value;
            if(id === "new") {
                console.log("Creating new model!");
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
            refresh();
        }
    },

    {
        header: "Simulate",
        callback: function() {
            selected_menu = null;

            menuLayer.activateSidebar("simulate");
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
        callback: requestMove
    },

    {
        header: "Save",
        callback: saveModel
    },

    {
        header: "Run simulation",
        callback: simulate
    }
);

menuLayer.createSidebar("simulate",
    {
        header: "Move all nodes left 50 pixels.",
        callback: requestMove
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
    if (newSelected.get('timelag') && newSelected.get('coefficient')) {
        var link = loadedModel.links.get(newSelected.get("id")),
            id = link.get("id"),
            n1 = link.get("node1"),
            n2 = link.get("node2"),
            x1 = link.get("x1"),
            y1 = link.get("y1"),
            x2 = link.get("x2"),
            y2 = link.get("y2"),
            coefficient = parseFloat(newSelected.get("coefficient")),
            timelag     = parseInt(newSelected.get("timelag")),
            type        = newSelected.get("type");

        if(isNaN(coefficient) || isNaN(timelag)) {
            console.log("Coefficient:", newSelected.get("coefficient"));
            console.log("Timelag:", newSelected.get("timelag"));
            return;
        }

        loadedModel.links = loadedModel.links.set(
            newSelected.get("id"),
            Immutable.Map({
                width: 14,
                node1:       n1,
                node2:       n2,
                x1:          x1,
                y1:          y1,
                x2:          x2,
                y2:          y2,
                coefficient: coefficient,
                timelag:     timelag,
                type:        type,
                id:          id
            })
        );
    } else {
        loadedModel.nodeData = loadedModel.nodeData.set(newSelected.get('id'), Immutable.Map({id: newSelected.get('id'), value: newSelected.get('value'), relativeChange: newSelected.get('relativeChange'), type: newSelected.get("type")}));
        loadedModel.nodeGui  = loadedModel.nodeGui.set(newSelected.get('id'), Immutable.Map({id: newSelected.get('id'), x: newSelected.get('x'), y: newSelected.get('y'), radius: newSelected.get('radius')}));
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

var aggregatedLink = function(link, nodes) {
    return Immutable.Map({
        x1: nodes.get(link.get('node1')).get('x'),
        y1: nodes.get(link.get('node1')).get('y'),
        x2: nodes.get(link.get('node2')).get('x'),
        y2: nodes.get(link.get('node2')).get('y'),
        width: link.get('width')
    });
};


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
        .map(function(node) { return node.merge(loadedModel.nodeGui.get(node.get('id'))); })
        .merge(
            loadedModel.links.filter(function(link) {return link.get('selected') === true;}).map(function(link){ return Immutable.Map({id: link.get("id"), timelag: link.get("timelag"), coefficient: link.get("coefficient"), type: link.get("type"), node1: link.get("node1"), node2: link.get("node2")}) })
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
        function(n) { return draw_node(n.merge(loadedModel.nodeGui.get(n.get('id')))); }
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