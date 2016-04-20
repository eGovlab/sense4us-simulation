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

        /*objectHelper.forEach.call(
            m,
            function(value, key) {
                loadedModel[key] = value;
            }
        );*/

        modelLayer.saveModel(m, function() {
            /*if(loadedModel.syncId === syncId || loadedModel.id === id) {
                objectHelper.forEach.call(m, function(v, k){loadedModel[k] = v;});
            }*/

            loadedModel.emit([id, syncId], 'modelSaved');
        });
    });

    loadedModel.addListener('modelSaved', function(syncId) {
        console.log('Saved model:', syncId);
        loadedModel.emit(null, 'refresh', 'resetUI');
    });
}

module.exports = addSaveModelListeners;
