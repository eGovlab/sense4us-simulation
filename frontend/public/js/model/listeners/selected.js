'use strict';

function addSelectedListeners(sidebarManager, loadedModel) {
    /**
     * @description Select a new item under model.selected;
     * @event select
     * @memberof module:model/propagationEvents
     */
    loadedModel.addListener('select', function() {
        sidebarManager.setEnvironment(loadedModel.environment);
        sidebarManager.setLoadedModel(loadedModel);

        try {
            if(!this.selected) {
                this.selected = {};
            }

            if(this.selected.objectId === 'nodeGui' || this.selected.objectId === 'nodeData') {
                var nodeData = loadedModel.nodeData[this.selected.id];
                var nodeGui  = loadedModel.nodeGui[this.selected.id];

                sidebarManager.setSelectedMenu(nodeData, nodeGui);
                /**
                 * @description Item was selected.
                 * @event selected
                 * @memberof module:model/statusEvents
                 *
                 * @param {object} selected - The currently selected object.
                 * @example tool.addListener('selected', function(object) {
                 *     if(object.objectId !== "nodeData" && object.objectId !== "nodeGui") {
                 *         return console.log("Not a node.");
                 *     }
                 *     
                 *     var nodeData = this.nodeData[this.selected.id];
                 *     var nodeGui  = this.nodeGui[this.selected.id];
                 *     console.log("Node selected", nodeData, nodeGui);
                 * });
                 */
                loadedModel.emit(this.selected, 'selected');
            } else if(this.selected.objectId === 'link') {
                sidebarManager.setSelectedMenu(this.selected);
                loadedModel.emit(this.selected, 'selected');
            } else {
                sidebarManager.setSelectedMenu(loadedModel.settings);
                /**
                 * @description Item was deselected by any means.
                 * @event deselected
                 * @memberof module:model/statusEvents
                 *
                 * @example tool.addListener('deselected', function() {
                 *     console.log("Nothing is selected.");
                 * });
                 */
                loadedModel.emit('deselected');
            }
        } catch(err) {
            console.error('Selected menu broke down.');
            console.error(err);
        }
    });
}

module.exports = addSelectedListeners;
