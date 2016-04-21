'use strict';

function addResetUIListeners(sidebarManager, menu, savedModels, loadedModel) {
    loadedModel.addListener('resetUI', function() {
        sidebarManager.setEnvironment(loadedModel.environment);
        sidebarManager.addSidebar(loadedModel.sidebar, loadedModel);
        menu.resetMenu(loadedModel, savedModels);

        loadedModel.floatingWindows.forEach(function(floatingWindow) {
            floatingWindow.refresh();
        });

        loadedModel.emit('selected');
    });
}

module.exports = addResetUIListeners;
