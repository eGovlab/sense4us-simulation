'use strict';

var modelLayer   = require('./../../model_layer.js');
var objectHelper = require('./../../object-helper.js');

function addLoadModelListeners(savedModels, loadedModel) {
    loadedModel.addListener('loadModel', function(option) {
        if(savedModels.local[option] === undefined) {
            if(typeof savedModels.synced[option] === 'string') {
                modelLayer.loadSyncModel(option, function(newState) {
                    if(typeof newState === 'number') {
                        loadedModel.syncId = newState;
                        loadedModel.id     = newState;

                        loadedModel.emit(
                            {
                                delay: 10000,
                                message: 'Model with id ' + modelId + ' is corrupt. Its id is loaded and may be deleted from running \'Delete current\'. Otherwise, contact sysadmin.'
                            },
                            'notification'
                        );

                        loadedModel.emit(null, 'refresh', 'resetUI');
                        return;
                    }

                    loadedModel.nodeGui  = {};
                    loadedModel.nodeData = {};

                    savedModels.synced[option] = newState;
                    objectHelper.forEach.call(
                        newState,
                        function(value, key) {
                            loadedModel[key] = value;
                        }
                    );

                    loadedModel.emit(null, 'refresh', 'resetUI');
                });
            } else {
                loadedModel.nodeGui  = {};
                loadedModel.nodeData = {};

                var savedModel = savedModels.synced[option];
                objectHelper.forEach.call(
                    savedModel,
                    function(value, key) {
                        loadedModel[key] = value;
                    }
                );

                loadedModel.emit(null, 'refresh', 'resetUI');
            }
        } else {
            loadedModel.nodeGui  = {};
            loadedModel.nodeData = {};
            
            var savedModel = savedModels.local[option];
            objectHelper.forEach.call(
                savedModel,
                function(value, key) {
                    loadedModel[key] = value;
                }
            );

            loadedModel.emit(null, 'refresh', 'resetUI');
        }
    });
}

module.exports = addLoadModelListeners;
