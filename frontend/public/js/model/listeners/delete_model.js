'use strict';

var modelLayer   = require('./../../model_layer.js'),
    objectHelper = require('./../../object-helper.js');

function addDeleteModelListeners(savedModels, loadedModel) {
    /**
     * @description A model was deleted.
     * @event modelDeleted
     * @memberof module:model/statusEvents
     *
     * @param {integer} id - The local model id that was deleted.
     * @param {integer} syncId - The synchronized model id that was deleted.
     * @example tool.addListener('modelDeleted', function(id, syncId) {
     *     console.log('Model with id:', id, syncId, 'deleted.');
     * });
     */

    /**
     * @description Delete a model, either local or remote.
     * @event deleteModel
     * @memberof module:model/propagationEvents
     *
     * @param {integer} id - Local id
     * @param {integer} syncId - Synchronized id
     */
    loadedModel.addListener('deleteModel', function(id, syncId) {
        modelLayer.deleteModel(
                loadedModel.CONFIG.url,
                loadedModel.CONFIG.userFilter,
                loadedModel.CONFIG.projectFilter,
                syncId || id,
                savedModels,
                function(message) {
            if(loadedModel.id === id || loadedModel.syncId === syncId) {
                var firstLocal = objectHelper.first.call(savedModels.local);
                if(firstLocal && (firstLocal.id === loadedModel.id || firstLocal.syncId === loadedModel.syncId)) {
                    delete savedModels.local[firstLocal.id];
                    firstLocal = undefined;
                }

                if(firstLocal === undefined) {
                    loadedModel.emit('newModel');
                    //firstLocal = modelLayer.newModel();
                    //savedModels.local[firstLocal.id] = firstLocal;
                } else {
                    objectHelper.forEach.call(
                        firstLocal,
                        function(value, key) {
                            loadedModel[key] = value;
                        }
                    );
                }
            }

            loadedModel.emit(message || 'Deleted local model: ' + id, 'notification');
            loadedModel.emit([id, syncId], 'modelDeleted');
            loadedModel.emit(null, 'refresh', 'resetUI');
        });
    });
}

module.exports = addDeleteModelListeners;
