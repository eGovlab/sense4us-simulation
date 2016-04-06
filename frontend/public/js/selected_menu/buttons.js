'use strict';

var objectHelper = require('./../object-helper');

module.exports = [
    {
        header: 'Delete selected',
        ignoreModelSettings: true,
        replacingObj:        true,
        callback: function(loadedModel, selectedData) {
            selectedData.forEach(function(data) {

                if(data.data.simulateChange !== undefined) {
                    delete loadedModel.nodeData[data.data.id];
                    var links = loadedModel.nodeGui[data.data.id].links;
                    objectHelper.forEach.call(
                        links,
                        function(link, key) {
                            delete loadedModel.links[link];
                        }
                    );
                    delete loadedModel.nodeGui[data.data.id];
                } else if(data.data.x !== undefined || data.data.y !== undefined) {
                    if(data.data.links) {
                        data.data.links.forEach(function(link, key) {
                            delete loadedModel.links[link];
                        });
                    }

                    delete loadedModel.nodeGui[data.data.id];
                } else if(data.data.coefficient !== undefined) {
                    delete loadedModel.links[data.data.id];
                }

                loadedModel.selected = false;

                loadedModel.refresh = true;
                loadedModel.resetUI = true;
                loadedModel.propagate();
            });
        }
    }
];