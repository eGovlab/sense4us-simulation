'use strict';

function addDeleteSelectedListeners(loadedModel) {
    loadedModel.addListener('deleteSelected', function() {
        var selectedData = loadedModel.selected;

        if(selectedData.objectId === 'nodeData' || selectedData.objectId === 'nodeGui') {
            var selectedNodeData = loadedModel.nodeData[selectedData.id];
            var selectedNodeGui  = loadedModel.nodeGui[selectedData.id];

            delete loadedModel.nodeData[selectedNodeData.id];
            loadedModel.emit(selectedNodeData, 'deletedNodeData');

            if(selectedNodeGui.links) {
                selectedNodeGui.links.forEach(function(link, key) {
                    var linkObject = loadedModel.links[link];

                    var upstream   = loadedModel.nodeGui[linkObject.node1];
                    var downstream = loadedModel.nodeGui[linkObject.node2];

                    var index = upstream.links.indexOf(linkObject.id);
                    if(index !== -1 && upstream.id !== selectedNodeGui.id) {
                        upstream.links.splice(index, 1);
                    }

                    index = downstream.links.indexOf(linkObject.id);
                    if(index !== -1 && downstream.id !== selectedNodeGui.id) {
                        downstream.links.splice(index, 1);
                    }

                    delete loadedModel.links[link];
                    loadedModel.emit(linkObject, 'deletedLink');
                });
            }

            delete loadedModel.nodeGui[selectedNodeGui.id];
            loadedModel.emit(selectedNodeGui, 'deletedNodeGui');
        } else if(selectedData.objectId === 'link') {
            var upstream   = loadedModel.nodeGui[selectedData.node1];
            var downstream = loadedModel.nodeGui[selectedData.node2];

            var index = upstream.links.indexOf(selectedData.id);
            if(index !== -1) {
                upstream.links.splice(index, 1);
            }

            var index = downstream.links.indexOf(selectedData.id);
            if(index !== -1) {
                downstream.links.splice(index, 1);
            }

            delete loadedModel.links[selectedData.id];
            loadedModel.emit(selectedData, 'deletedLink');
        }

        loadedModel.selected = false;
        loadedModel.emit(null, 'refresh', 'resetUI', 'selected');
    });
}

module.exports = addDeleteSelectedListeners;
