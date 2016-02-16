'use strict';

var Immutable       = null,
    breakout        = require('./../breakout.js'),
    backendApi      = require('./../api/backend_api.js'),
    notificationBar = require('./../notification_bar');

var simulate = [
    {
        header: 'Simulate',
        type:   'BUTTON',
        ajax:   true,
        callback: function(refresh, changeCallbacks) {
            var loadedModel = changeCallbacks.loadedModel,
                newState    = loadedModel();

            var data = {
                timestep: newState.settings.maxIterations,
                nodes:    breakout.nodes(newState),
                links:    breakout.links(newState)
            };

            var resetNodes = newState.nodeData.map(function(node) {
                node.simulateChange = [];
                return node;
            });

            newState.nodeData = resetNodes;

            backendApi('/models/simulate', data, function(response, err) {
                if(err) {
                    console.log(err);
                    console.log(response);
                    notificationBar.notify(response.response.message);
                    return;
                }

                var timeSteps = response.response;
                timeSteps.forEach(function(timeStep) {
                    timeStep.forEach(function(node) {
                        var nodeData = newState.nodeData;
                        var currentNode = nodeData[node.id];
                        currentNode.simulateChange = currentNode.simulateChange.push(node.relativeChange);
                        //nodeData = nodeData.set(node.id, currentNode);
                        newState.nodeData = nodeData;
                    });
                });

                /*nodes.forEach(function(node) {
                    var nodeData = newState.nodeData;
                    nodeData = nodeData.set(node.id, nodeData.get(node.id).set('simulateChange', node.relativeChange));
                    newState = newState.set('nodeData', nodeData);
                });*/

                loadedModel(newState);
                refresh();
            });
        }
    },

    {
        header: 'Linegraph',
        type:   'BUTTON',
        ajax:   true,
        callback: function(refresh, changeCallbacks) {
            var loadedModel = changeCallbacks.loadedModel,
                newState    = loadedModel();

            var settings = newState.settings;
            if(!settings.linegraph) {
                settings = settings.set('linegraph', true);
            } else {
                settings = settings.set('linegraph', false);
            }

            newState = newState.set('settings', settings);
            loadedModel(newState);

            refresh();
        }
    },

    {
        header: 'Time step T',
        type:   'DROPDOWN',
        values: [
            'Week',
            'Month',
            'Year'
        ],
        /* This is a stupid name for a method. It sets the default selected value. */
        select: function(model, values) {
            var selected = model.settings.timeStepT;
            for(var i = 0; i < values.length; i++) {
                if(values[i] === selected) {
                    return i;
                }
            }

            return 0;
        },
        callback: function(model, attrs, value) {
            model.settings.timeStepT = value;
            return model;
        }
    },

    {
        header: 'Time step N',
        type:   'SLIDER',

        defaultValue: function(model) {
            return model.settings.timeStepN;
        },

        range: function(model) {
            return [0, model.settings.maxIterations];
        },

        onSlide: function(value, model) {
            model = model.set('settings', model.settings.set('timeStepN', value));
            return model;
        },

        callback: function(value, model) {
            model = model.set('settings', model.settings.set('timeStepN', value));
            return model;
        }
    }
];

module.exports = simulate;
