'use strict';

var modelLayer   = require('./../../model_layer.js'),
    objectHelper = require('./../../object-helper.js');

function addStoreModelListeners(savedModels, loadedModel) {
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
