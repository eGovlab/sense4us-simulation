'use strict';

var Immutable       = null,
    breakout        = require('./../breakout.js'),
    backendApi      = require('./../api/backend_api.js'),
    objectHelper    = require('./../object-helper.js'),
    notificationBar = require('./../notification_bar');

var simulate = [
    {
        header: 'Simulate',
        type:   'BUTTON',
        ajax:   true,
        callback: function(loadedModel) {
            var data = {
                timestep: loadedModel.loadedScenario.maxIterations,
                nodes:    breakout.nodes(loadedModel),
                links:    breakout.links(loadedModel),
                scenario: loadedModel.loadedScenario.toJson()
            };

            objectHelper.forEach.call(
                loadedModel.nodeData,
                function(node) {
                    node.simulateChange = [];
                }
            );

            backendApi('/models/simulate', data, function(response, err) {
                if(err) {
                    console.log(err);
                    console.log(response);
                    notificationBar.notify(response.response.message);
                    return;
                }

                var timeSteps = response.response;
                var nodeData  = loadedModel.nodeData;
                timeSteps.forEach(function(timeStep) {
                    timeStep.forEach(function(node) {
                        var currentNode = nodeData[node.id];
                        currentNode.simulateChange.push(node.relativeChange);
                    });
                });

                loadedModel.refresh  = true;
                loadedModel.settings = loadedModel.settings;
                loadedModel.propagate();
            });
        }
    },

    {
        header: 'Linegraph',
        type:   'BUTTON',
        ajax:   true,
        callback: function(loadedModel) {
            var settings       = loadedModel.settings;
            settings.linegraph = !settings.linegraph

            loadedModel.refresh = true;
            loadedModel.propagate();
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

        setDefault: function(model, values) {
            var selected = model.loadedScenario.measurement;
            for(var i = 0; i < values.length; i++) {
                if(values[i] === selected) {
                    return i;
                }
            }

            return 0;
        },

        callback: function(model, value) {
            model.loadedScenario.measurement = value;
        }
    },

    {
        header: 'Time step N',
        type:   'SLIDER',

        defaultValue: function(model) {
            console.log(model.loadedScenario.timeStepN);
            return model.loadedScenario.timeStepN;
        },

        range: function(model) {
            console.log(model.loadedScenario.maxIterations);
            return [0, model.loadedScenario.maxIterations];
        },

        onSlide: function(model, value) {
            model.loadedScenario.timeStepN = value;

            model.refresh = true;
            model.propagate();
        },

        callback: function(model, value) {
            console.log(model.loadedModel);
            model.loadedScenario.timeStepN = value;
        }
    },

    {
        header: 'Max iterations',
        type:   'INPUT',

        defaultValue: function(model) {
            return model.loadedScenario.maxIterations;
        },

        onChange: function(model, value) {
            model.loadedScenario.maxIterations = parseInt(value);
        }
    }
];

module.exports = simulate;
