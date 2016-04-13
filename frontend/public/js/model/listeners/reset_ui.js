'use strict';

function addResetUIListeners(sidebarManager, menu, savedModels, loadedModel) {
    loadedModel.addListener('resetUI', function() {
        sidebarManager.setEnvironment(loadedModel.environment);
        sidebarManager.addSidebar(loadedModel.sidebar, loadedModel);
        menu.resetMenu(loadedModel, savedModels);

        loadedModel.floatingWindows.forEach(function(floatingWindow) {
            floatingWindow.refresh();
        });

        if(this.selected && this.selected.x !== undefined && this.selected.y !== undefined) {
            var nodeData = loadedModel.nodeData[this.selected.id];
            var nodeGui  = loadedModel.nodeGui[this.selected.id];

            sidebarManager.setSelectedMenu(nodeData, nodeGui);
        } else if(this.selected && this.selected.coefficient !== undefined) {
            sidebarManager.setSelectedMenu(this.selected);
        } else {
            sidebarManager.setSelectedMenu(loadedModel.settings);
        }
    });
}

module.exports = addResetUIListeners;
