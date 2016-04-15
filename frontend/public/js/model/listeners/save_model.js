'use strict';

var modelLayer   = require('./../../model_layer.js'),
    objectHelper = require('./../../object-helper.js');

function addSaveModelListeners(savedModels, loadedModel) {
    loadedModel.addListener('saveModel', function() {
        var m = savedModels.synced[loadedModel.syncId] || savedModels.local[loadedModel.id];
        if(!m) {
            loadedModel.emit('Model was not stored in correct location. Saving failed.', 'notification');
            throw new Error('Couldn\'t save model.');
        }

        objectHelper.forEach.call(
            m,
            function(value, key) {
                loadedModel[key] = value;
            }
        );

        modelLayer.saveModel(loadedModel, function() {
            loadedModel.emit(null, 'refresh', 'resetUI');
        });
    });
}

module.exports = addSaveModelListeners;
