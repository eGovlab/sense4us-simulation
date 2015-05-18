'use strict';

var breakout = require("./../breakout.js"),
    network  = require("./../network/network_layer.js");

/*
** createNode
** createOriginNode
** createActorNode
** sendAllData
** requestRight
** requestLeft
** simulate
*/

var createNode = function(state, x, y, type) {
    if(typeof x !== "number") {
        x = false;
    }

    if(typeof y !== "number") {
        y = false;
    }

    if(typeof type !== "string") {
        type = false;
    }

    var id = state.loadedModel.generateId();
    state.loadedModel.setData(Immutable.Map({
        id: id,
        value: 0,
        relativeChange: 0,
        simulateChange: 0,
        type: type || "intermediate"
    }));

    state.loadedModel.setGui(Immutable.Map({
        id: id,
        x: x || 200,
        y: y || 100,
        radius: 75
    }));

    state.refresh();
};

var createOriginNode = function(state, x, y, type) {
    createNode(state, x, y, "origin");
};

var createActorNode = function(state, x, y, type) {
    createNode(state, x, y, "actor");
};

var sendAllData = function(state) {
    network.postData("/models/print", {
        nodes: breakout.nodes(state),
        links: breakout.links(state)
    });
};

var requestRight = function(state) {
    var data = {
        nodes: state.loadedModel.nodeData.merge(state.loadedModel.nodeGui).toJSON(),
        links: state.loadedModel.links.toJSON()
    };

    network.postData("/models/move-right", data, function(response) {
        var nodes = response.response.nodes;

        Object.keys(nodes).forEach(function(id) {
            var node = nodes[id];
            state.loadedModel.nodeGui = state.loadedModel.nodeGui.set(node.id, Immutable.Map({
                id: node.id,
                x: node.x,
                y: node.y,
                radius: node.radius
            }));
        });

        state.refresh();
    });
};

var requestLeft = function(state) {
    var data = {
        nodes: state.loadedModel.nodeData.merge(state.loadedModel.nodeGui).toJSON(),
        links: state.loadedModel.links.toJSON()
    };

    network.postData("/models/move-left", data, function(response) {
        var nodes = response.response.nodes;

        Object.keys(nodes).forEach(function(id) {
            var node = nodes[id];
            state.loadedModel.nodeGui = state.loadedModel.nodeGui.set(node.id, Immutable.Map({
                id: node.id,
                x: node.x,
                y: node.y,
                radius: node.radius
            }));
        });

        state.refresh();
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

var simulate = function(state) {
    var timestep = parseInt(document.getElementById("timelag").value);
    if(isNaN(timestep)) {
        timestep = 0;
    }

    var data = {
        timestep: timestep,
        nodes: breakout.nodes(state),
        links: state.loadedModel.links.toJSON()
    };

    network.postData("/models/simulate", data, function(response, err) {
        if(err) {
            return;
        }

        var nodes = response.response.nodes;
        nodes.forEach(function(node) {
            state.loadedModel.nodeData = state.loadedModel.nodeData.set(node.id, state.loadedModel.nodeData.get(node.id).set("simulateChange", node.relativeChange));
        });

        state.refresh();
    });
};

var modelSidebar = {
    name: "MODEL",
    menu: [
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
    ]
};

var simulateSidebar = {
    name: "SIMULATE",
    menu: [
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
    ]
};

module.exports = [
    modelSidebar,
    simulateSidebar
];