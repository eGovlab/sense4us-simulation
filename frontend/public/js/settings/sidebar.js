'use strict';

var breakout        = require('./../breakout.js'),
    network         = require('./../network'),
    menuBuilder     = require('./../menu_builder'),
    modelLayer      = require('./../model_layer.js'),
    notificationBar = require('./../notification_bar');

/*
** createNode
** createOriginNode
** createActorNode
** sendAllData
** requestRight
** requestLeft
** save
** simulate
*/

var createNode = function(state, x, y, type, description) {
    if (typeof x !== 'number') {
        x = false;
    }

    if (typeof y !== 'number') {
        y = false;
    }

    if (typeof type !== 'string') {
        type = false;
    }

    if (typeof description !== 'string') {
        description = false;
    }

    var id = state.loadedModel.generateId();
    state.loadedModel.setData(Immutable.Map({
        id: id,
        value: 0,
        relativeChange: 0,
        simulateChange: 0,
        type: type || 'intermediate',
        description: description || ''
    }));

    state.loadedModel.setGui(Immutable.Map({
        id: id,
        x: x || 200,
        y: y || 100,
        radius: 75,
        selected: true
    }));

    state.refresh();
};

var createOriginNode = function(state, x, y, type) {
    createNode(state, x, y, 'origin');
};

var createActorNode = function(state, x, y, type) {
    createNode(state, x, y, 'actor');
};

var sendAllData = function(state) {
    network.postData('/models/print', {
        nodes: breakout.nodes(state),
        links: breakout.links(state)
    });
};

var requestRight = function(state) {
    var data = {
        nodes: state.loadedModel.nodeData.merge(state.loadedModel.nodeGui).toJSON(),
        links: state.loadedModel.links.toJSON()
    };

    network.postData('/models/move-right', data, function(response) {
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

    network.postData('/models/move-left', data, function(response) {
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

var simulate = function(state) {
    var timestep = parseInt(document.getElementById('timelag').value);
    if (isNaN(timestep)) {
        timestep = 0;
    }

    var data = {
        timestep: timestep,
        nodes: breakout.nodes(state),
        links: breakout.links(state)
    };

    network.postData('/models/simulate', data, function(response, err) {

        data.links.forEach(function(link) {
            var retrievedLink = state.loadedModel.links.get(link.id);
            state.loadedModel.links = state.loadedModel.links.set(link.id, retrievedLink.set('loop', false));
        });

        if (err) {
            notificationBar.notify(response.response.message);

            var route = response.response.route;

            route.forEach(function(linkId) {
                var retrievedLink = state.loadedModel.links.get(linkId);
                state.loadedModel.links = state.loadedModel.links.set(linkId, retrievedLink.set('loop', true));
            });

            state.refresh();
            return;
        }

        var nodes = response.response.nodes;
        nodes.forEach(function(node) {
            state.loadedModel.nodeData = state.loadedModel.nodeData.set(node.id, state.loadedModel.nodeData.get(node.id).set('simulateChange', node.relativeChange));
        });

        state.refresh();
    });
};

var modelSidebar = {
    name: 'MODEL',
    menu: [
        {
            header: 'Create node',
            callback: createNode
        },

        {
            header: 'Create origin',
            callback: createOriginNode
        },

        {
            header: 'Create actor',
            callback: createActorNode
        },

        {
            header: 'Send all data',
            callback: sendAllData
        },

        {
            header: 'Move all nodes right 50 pixels.',
            callback: requestRight
        }
    ]
};

var simulateSidebar = {
    name: 'SIMULATE',
    menu: [
        {
            header: 'Move all nodes left 50 pixels.',
            callback: requestLeft
        },

        {
            header: 'Run simulation',
            callback: simulate
        },

        {
            type: 'input',
            header: 'Timelag',
            id: 'timelag',
            default: 0
        }
    ]
};

module.exports = [
    modelSidebar,
    simulateSidebar
];