'use strict';

function addDeleteSelectedListeners(loadedModel) {
    loadedModel.addListener('deleteNode', function(id) {
        var selectedNodeData = loadedModel.nodeData[id];
        var selectedNodeGui  = loadedModel.nodeGui[id];

        delete loadedModel.nodeData[selectedNodeData.id];
        /**
         * @description NodeData was deleted.
         * @event deletedNodeData
         * @memberof module:model/statusEvents
         *
         * @param {object} nodeData - The deleted nodeData object.
         * @example tool.addListener('deletedNodeData', function(data) {
         *     console.log('Node data with id:', data.id, 'was deleted');
         * })
         */
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

        selectedNodeGui.links = [];

        delete loadedModel.nodeGui[selectedNodeGui.id];
        /**
         * @description Renders a new frame for the canvas.
         * @event deletedNodeGui
         * @memberof module:model/statusEvents
         *
         * @param {object} nodeGui - The deleted nodeGui object.
         * @example tool.addListener('deletedNodeGui', function(data) {
         *     console.log('Node gui with id:', data.id, 'was deleted');
         * })
         */
        loadedModel.emit(selectedNodeGui, 'deletedNodeGui');
    });

    loadedModel.addListener('deleteLink', function(id) {
        var selectedData = loadedModel.links[id];

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
        /**
         * @description Link was deleted.
         * @event deletedLink
         * @memberof module:model/statusEvents
         *
         * @param {object} link - The deleted link object.
         * @example tool.addListener('deletedLink', function(link) {
         *     console.log('Link with id:', link.id, 'was deleted');
         * })
         */
        loadedModel.emit(selectedData, 'deletedLink');
    });

    loadedModel.addListener('deleteSelected', function() {
        var selectedData = loadedModel.selected;

        if(selectedData.objectId === 'nodeData' || selectedData.objectId === 'nodeGui') {
            var historyData = {
                action: 'deleteNode',
                data: {
                    data:  loadedModel.nodeData[selectedData.id],
                    gui:   loadedModel.nodeGui[selectedData.id],
                    links: []
                }
            };

            historyData.data.gui.links.forEach(function(link) {
                historyData.data.links.push(loadedModel.links[link]);
            });

            loadedModel.history.push(historyData);

            loadedModel.emit(selectedData.id, 'deleteNode');
        } else if(selectedData.objectId === 'link') {
            loadedModel.history.push({
                action: 'deleteLink',
                data: {
                    link: selectedData
                }
            });

            loadedModel.emit(selectedData.id, 'deleteLink');
        }

        loadedModel.revertedHistory = [];

        loadedModel.selected = false;
        loadedModel.emit(null, 'refresh', 'resetUI', 'select');
    });
}

module.exports = addDeleteSelectedListeners;
