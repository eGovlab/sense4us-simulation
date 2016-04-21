'use strict';

var modelLayer   = require('./../../model_layer.js'),
    objectHelper = require('./../../object-helper.js');

function addStoreModelListeners(savedModels, loadedModel) {
    /**
     * @description A new model should be stored and moved away from the currently loaded one.
     * @event storeModel
     * @memberof module:model/propagationEvents
     */
    loadedModel.addListener('storeModel', function() {
        var m;
        if(loadedModel.synced === true) {
            m = modelLayer.moveModel(loadedModel);
            savedModels.synced[loadedModel.syncId] = m;
        } else {
            m = modelLayer.moveModel(loadedModel);
            savedModels.local[loadedModel.id] = m;
        }
    });
}

module.exports = addStoreModelListeners;
