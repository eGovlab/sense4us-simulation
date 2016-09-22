'use strict';

function addResetUIListeners(sidebarManager, menu, savedModels, loadedModel) {
    /**
     * @description Redraw the UI.
     * @event resetUI
     * @memberof module:model/propagationEvents
     * @fires module:model/statusEvents.selected
     */
    loadedModel.addListener('resetUI', function() {
        sidebarManager.setEnvironment(loadedModel.environment);
        sidebarManager.addSidebar(loadedModel.sidebar, loadedModel);
        menu.resetMenu(loadedModel, savedModels);

        loadedModel.floatingWindows.forEach(function(floatingWindow) {
            floatingWindow.refresh();
        });

        loadedModel.emit('select');
    });
}

module.exports = addResetUIListeners;
