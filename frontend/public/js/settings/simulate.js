'use strict';

var Immutable = require('Immutable'),
    breakout  = require('./../breakout.js'),
    network   = require('./../network');

var simulate = Immutable.List([
    Immutable.Map( {
        header: 'Simulate',
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
    })
]);

module.exports = simulate;