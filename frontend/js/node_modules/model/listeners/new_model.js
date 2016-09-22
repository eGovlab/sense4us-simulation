'use strict';

var modelLayer   = require('./../../model_layer.js'),
    objectHelper = require('./../../object-helper.js');

function addNewModelListeners(savedModels, loadedModel) {
    /**
     * @description Load and replace the current model with a new local model.
     * @event newModel
     * @memberof module:model/propagationEvents
     */   
    loadedModel.addListener('newModel', function() {
        var m = modelLayer.newModel();
        objectHelper.forEach.call(
            m,
            function(value, key) {
                loadedModel[key] = value;
            }
        );

        savedModels.local[loadedModel.id] = m;

        loadedModel.emit([m.id, m.syncId], 'modelLoaded');
        loadedModel.emit(null, 'refresh', 'resetUI');
    });
}

module.exports = addNewModelListeners;
