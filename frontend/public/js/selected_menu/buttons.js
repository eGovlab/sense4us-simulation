'use strict';

var Immutable = null;

module.exports = [
    {
        header: 'Delete selected',
        ignoreModelSettings: true,
        replacingObj:        true,
        callback: function(loadedModel, selectedData) {
            selectedData.forEach(function(data) {
                if(data.data.relativeChange !== undefined) {
                    delete loadedModel.nodeData[data.data.id];
                    var links = loadedModel.nodeGui[data.data.id];
                    links.forEach(function(link, key) {
                        delete loadedModel.links[link];
                    });
                    delete loadedModel.nodeGui[data.data.id];
                } else if(data.data.offsetX !== undefined || data.data.offsetY !== undefined) {
                    data.data.links.forEach(function(link, key) {
                        delete loadedModel.links[link];
                    });

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