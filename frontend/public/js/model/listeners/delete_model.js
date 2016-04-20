'use strict';

var modelLayer   = require('./../../model_layer.js'),
    objectHelper = require('./../../object-helper.js');

function addDeleteModelListeners(savedModels, loadedModel) {
    loadedModel.addListener('deleteModel', function(id, syncId) {
        modelLayer.deleteModel(loadedModel.CONFIG.url, syncId || id, savedModels, function(message) {
            if(loadedModel.id === id || loadedModel.syncId === syncId) {
                var firstLocal = objectHelper.first.call(savedModels.local);

                if(firstLocal === undefined) {
                    firstLocal = modelLayer.newModel();
                }

                objectHelper.forEach.call(
                    firstLocal,
                    function(value, key) {
                        loadedModel[key] = value;
                    }
                );
            }

            loadedModel.emit(message || 'Deleted local model: ' + id, 'notification');
            loadedModel.emit([id, syncId], 'modelDeleted');
            loadedModel.emit(null, 'refresh', 'resetUI');
        });
    });
}

module.exports = addDeleteModelListeners;
