'use strict';

var Immutable = require('Immutable'),
    breakout  = require('./../breakout.js'),
    network   = require('./../network');

var simulate = Immutable.List([
    Immutable.Map( {
        header: 'Simulate',
        type:   'BUTTON',
        ajax:   true,
        callback: function(refresh, changeCallbacks) {
            var loadedModel = changeCallbacks.get('loadedModel'),
                newState    = loadedModel();

            var data = {
                timestep: 1,
                nodes: breakout.nodes(newState),
                links: breakout.links(newState)
            };

            network.postData('/models/simulate', data, function(response, err) {
                if(err) {
                    console.log(err);
                    console.log(response);
                    return;
                }

                var nodes = response.response.nodes;
                nodes.forEach(function(node) {
                    var nodeData = newState.get('nodeData');
                    nodeData = nodeData.set(node.id, nodeData.get(node.id).set('simulateChange', node.relativeChange));
                    newState = newState.set('nodeData', nodeData);
                });

                loadedModel(newState);
                refresh();
            });
        }
    }),

    Immutable.Map( {
        header: 'Time step T',
        type:   'DROPDOWN',
        values: [
            "Week",
            "Month",
            "Year"
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
        header: "Time step N",
        type:   "SLIDER",
        range: function(model) {
            return [0, 100];
        },

        callback: function(model) {
            return model;
        }
    })
]);

module.exports = simulate;