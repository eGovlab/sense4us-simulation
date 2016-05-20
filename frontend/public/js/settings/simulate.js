'use strict';

var Immutable       = null,
    network         = require('./../network'),
    breakout        = require('./../breakout.js'),
    objectHelper    = require('./../object-helper.js');

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

            network(loadedModel.CONFIG.url, '/models/' + loadedModel.CONFIG.userFilter + '/' + loadedModel.CONFIG.projectFilter + '/simulate', data, function(response, err) {
                if(err) {
                    console.error(err);
                    console.error(response);
                    loadedModel.emit(response.response.message, 'notification');
                    return;
                }

                console.log(response.response);

                var timeSteps = response.response;
                var nodeData  = loadedModel.nodeData;
                timeSteps.forEach(function(timeStep) {
                    timeStep.forEach(function(node) {
                        var currentNode = nodeData[node.id];
                        currentNode.simulateChange.push(node.relativeChange);
                    });
                });

                //loadedModel.refresh  = true;
                loadedModel.settings = loadedModel.settings;
                //loadedModel.propagate();

                loadedModel.emit(null, 'settings', 'refresh');
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

            /*loadedModel.refresh = true;
            loadedModel.propagate();*/

            loadedModel.emit('refresh');
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

        defaultValue: function(model, values) {
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
            return model.loadedScenario.timeStepN;
        },

        range: function(model) {
            return [0, model.loadedScenario.maxIterations];
        },

        onSlide: function(model, value) {
            model.loadedScenario.timeStepN = value;

            model.emit('refresh');
        },

        callback: function(model, value) {
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
