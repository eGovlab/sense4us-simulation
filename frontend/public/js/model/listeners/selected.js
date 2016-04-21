'use strict';

function addSelectedListeners(sidebarManager, loadedModel) {
    loadedModel.addListener('selected', function() {
        sidebarManager.setEnvironment(loadedModel.environment);
        sidebarManager.setLoadedModel(loadedModel);

        try {
            if(!this.selected) {
                sidebarManager.setSelectedMenu(loadedModel.settings);
                return;
            }

            if(this.selected.objectId === 'nodeGui' || this.selected.objectId === 'nodeData') {
                var nodeData = loadedModel.nodeData[this.selected.id];
                var nodeGui  = loadedModel.nodeGui[this.selected.id];

                sidebarManager.setSelectedMenu(nodeData, nodeGui);
            } else if(this.selected.objectId === 'link') {
                sidebarManager.setSelectedMenu(this.selected);
            } else {
                sidebarManager.setSelectedMenu(loadedModel.settings);
            }
        } catch(err) {
            console.error('Selected menu broke down.');
            console.error(err);
        }
    });
}

module.exports = addSelectedListeners;
