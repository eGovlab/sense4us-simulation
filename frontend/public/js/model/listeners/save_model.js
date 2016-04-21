'use strict';

var modelLayer   = require('./../../model_layer.js'),
    objectHelper = require('./../../object-helper.js');

function addSaveModelListeners(savedModels, loadedModel) {
    loadedModel.addListener('preSaveModel', function(id, syncId) {
        
    });

    loadedModel.addListener('saveModel', function(id, syncId) {
        var m = savedModels.synced[syncId] || savedModels.local[id];
        if(!m) {
            loadedModel.emit('Model was not stored in correct location. Saving failed.', 'notification');
            throw new Error('Couldn\'t save model.');
        }

        modelLayer.saveModel(loadedModel.CONFIG.url, loadedModel.CONFIG.userFilter, m, function() {
            loadedModel.emit([id, syncId], 'modelSaved');
        });
    });

    loadedModel.addListener('modelSaved', function(id, syncId) {
        var m = savedModels.synced[syncId] || savedModels.local[id];
        loadedModel.emit('Model \'' + m.settings.name + '\' saved.', 'notification');
        loadedModel.emit(null, 'refresh', 'resetUI');
    });
}

module.exports = addSaveModelListeners;
