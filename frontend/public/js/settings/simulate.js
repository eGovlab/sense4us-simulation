'use strict';

var Immutable       = null,
    breakout        = require('./../breakout.js'),
    backendApi      = require('./../api/backend_api.js'),
    notificationBar = require('./../notification_bar');

var simulate = Immutable.List([
    Immutable.Map({
        header: 'Simulate',
        type:   'BUTTON',
        ajax:   true,
        callback: function(refresh, changeCallbacks) {
            var loadedModel = changeCallbacks.get('loadedModel'),
                newState    = loadedModel();

            var data = {
                timestep: newState.get('settings').get('maxIterations'),
                nodes:    breakout.nodes(newState),
                links:    breakout.links(newState)
            };

            var resetNodes = newState.get('nodeData').map(function(node) { return node.set('simulateChange', Immutable.List()); });
            newState = newState.set('nodeData', resetNodes);

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
                        var nodeData = newState.get('nodeData');
                        var currentNode = nodeData.get(node.id);
                        currentNode = currentNode.set('simulateChange', currentNode.get('simulateChange').push(node.relativeChange));
                        nodeData = nodeData.set(node.id, currentNode);
                        newState = newState.set('nodeData', nodeData);
                    });
                });

                /*nodes.forEach(function(node) {
                    var nodeData = newState.get('nodeData');
                    nodeData = nodeData.set(node.id, nodeData.get(node.id).set('simulateChange', node.relativeChange));
                    newState = newState.set('nodeData', nodeData);
                });*/

                loadedModel(newState);
                refresh();
            });
        }
    }),

    Immutable.Map({
        header: 'Linegraph',
        type:   'BUTTON',
        ajax:   true,
        callback: function(refresh, changeCallbacks) {
            var loadedModel = changeCallbacks.get('loadedModel'),
                newState    = loadedModel();

            var settings = newState.get('settings');
            if(!settings.get('linegraph')) {
                settings = settings.set('linegraph', true);
            } else {
                settings = settings.set('linegraph', false);
            }

            newState = newState.set('settings', settings);
            loadedModel(newState);

            refresh();
        }
    }),

    Immutable.Map( {
        header: 'Time step T',
        type:   'DROPDOWN',
        values: [
            'Week',
            'Month',
            'Year'
        ],
        /* This is a stupid name for a method. It sets the default selected value. */
        select: function(model, values) {
            var selected = model.get('settings').get('timeStepT');
            for(var i = 0; i < values.length; i++) {
                if(values[i] === selected) {
                    return i;
                }
            }

            return 0;
        },
        callback: function(model, attrs, value) {
            model = model.set('settings', model.get('settings').set('timeStepT', value));
            return model;
        }
    }),

    Immutable.Map({
        header: 'Time step N',
        type:   'SLIDER',

        defaultValue: function(model) {
            return model.get('settings').get('timeStepN');
        },

        range: function(model) {
            return [0, model.get('settings').get('maxIterations')];
        },

        onSlide: function(value, model) {
            model = model.set('settings', model.get('settings').set('timeStepN', value));
            return model;
        },

        callback: function(value, model) {
            model = model.set('settings', model.get('settings').set('timeStepN', value));
            return model;
        }
    })
]);

module.exports = simulate;
