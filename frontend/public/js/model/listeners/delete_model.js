'use strict';

var modelLayer   = require('./../../model_layer.js'),
    objectHelper = require('./../../object-helper.js');

function addDeleteModelListeners(savedModels, loadedModel) {
    loadedModel.addListener('deleteModel', function() {
        modelLayer.deleteModel(loadedModel, savedModels, function() {
            loadedModel.emit(null, 'refresh', 'resetUI');
        });
    });
}

module.exports = addDeleteModelListeners;
