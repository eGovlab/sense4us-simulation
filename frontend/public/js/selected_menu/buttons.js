'use strict';

var objectHelper = require('./../object-helper');

module.exports = [
    {
        header: 'Delete selected',
        ignoreModelSettings: true,
        replacingObj:        true,
        callback: function(loadedModel, selectedData) {
            selectedData.forEach(function(data) {
                if(data.data.objectId === 'nodeData') {
                    delete loadedModel.nodeData[data.data.id];
                } else if(data.data.objectId === 'nodeGui') {
                    if(data.data.links) {
                        data.data.links.forEach(function(link, key) {
                            var linkObject = loadedModel.links[link];

                            var upstream   = loadedModel.nodeGui[linkObject.node1];
                            var downstream = loadedModel.nodeGui[linkObject.node2];

                            var index = upstream.links.indexOf(linkObject.id);
                            if(index !== -1 && upstream.id !== data.data.id) {
                                upstream.links.splice(index, 1);
                            }

                            index = downstream.links.indexOf(linkObject.id);
                            if(index !== -1 && downstream.id !== data.data.id) {
                                downstream.links.splice(index, 1);
                            }

                            delete loadedModel.links[link];
                        });
                    }

                    delete loadedModel.nodeGui[data.data.id];
                } else if(data.data.objectId === 'link') {
                    var upstream   = loadedModel.nodeGui[data.data.node1];
                    var downstream = loadedModel.nodeGui[data.data.node2];

                    var index = upstream.links.indexOf(data.data.id);
                    if(index !== -1) {
                        upstream.links.splice(index, 1);
                    }

                    var index = downstream.links.indexOf(data.data.id);
                    if(index !== -1) {
                        downstream.links.splice(index, 1);
                    }

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