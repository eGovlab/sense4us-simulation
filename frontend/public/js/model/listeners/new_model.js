'use strict';

var modelLayer   = require('./../../model_layer.js'),
    objectHelper = require('./../../object-helper.js');

function addNewModelListeners(savedModels, loadedModel) {
    loadedModel.addListener('newModel', function() {
        var m = modelLayer.newModel();
        objectHelper.forEach.call(
            m,
            function(value, key) {
                loadedModel[key] = value;
            }
        );

        savedModels.local[loadedModel.id] = m;

        loadedModel.emit(null, 'refresh', 'resetUI');
    });
}

module.exports = addNewModelListeners;
