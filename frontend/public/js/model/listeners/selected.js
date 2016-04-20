'use strict';

function addSelectedListeners(sidebarManager, loadedModel) {
    loadedModel.addListener('selected', function() {
        sidebarManager.setEnvironment(loadedModel.environment);
        sidebarManager.setLoadedModel(loadedModel);


        if(!this.selected) {
            sidebarManager.setSelectedMenu(loadedModel.settings);

            return;
        }

        if(this.selected.objectId === 'nodeGui') {
            var nodeData = loadedModel.nodeData[this.selected.id];
            var nodeGui  = loadedModel.nodeGui[this.selected.id];

            sidebarManager.setSelectedMenu(nodeData, nodeGui);
        } else if(this.selected.objectId === 'link') {
            sidebarManager.setSelectedMenu(this.selected);
        } else {
            sidebarManager.setSelectedMenu(loadedModel.settings);
        }
    });
}

module.exports = addSelectedListeners;
