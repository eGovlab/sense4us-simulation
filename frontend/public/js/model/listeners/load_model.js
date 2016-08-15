'use strict';

var modelLayer   = require('./../../model_layer.js');
var objectHelper = require('./../../object-helper.js');

function addLoadModelListeners(savedModels, loadedModel) {
    /**
     * @module model/statusEvents
     */

    /**
     * @description A model with the given id should be loaded.
     * @event loadModel
     * @memberof module:model/propagationEvents
     *
     * @param {integer} id - New model id.
     */

    /**
     * @description Once a model has been replaced, either from a local source or a remote source.
     * @event modelLoaded
     *
     * @param {integer} id - New model id.
     * @example tool.addListener('modelLoaded', function(id, syncId) {
     *     console.log('Model got replaced by:', id, syncId);
     * });
     */
    loadedModel.addListener('loadModel', function(option, syncId) {
        option = syncId || option;
        var previousId     = loadedModel.id;
        var previousSyncId = loadedModel.syncId;

        if(savedModels.local[option] === undefined) {
            if(typeof savedModels.synced[option] === 'string' || savedModels.synced[option] === undefined) {
                modelLayer.loadSyncModel(
                        loadedModel.CONFIG.url,
                        loadedModel.CONFIG.userFilter,
                        loadedModel.CONFIG.projectFilter,
                        option,
                        function(newState) {
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
                    } else if(newState instanceof Error) {
                        loadedModel.emit(newState, 'notification');
                        loadedModel.emit([option, option], 'errorLoadingModel');
                        return;
                    }

                    loadedModel.nodeGui  = {};
                    loadedModel.nodeData = {};

                    newState.selected = false;
                    loadedModel.floatingWindows.forEach(function(floatingWindow) {
                        floatingWindow.destroyWindow();

                        if(floatingWindow.hide) {
                            floatingWindow.hide();
                        }
                    });

                    savedModels.synced[option] = newState;
                    objectHelper.forEach.call(
                        newState,
                        function(value, key) {
                            loadedModel[key] = value;
                        }
                    );

                    objectHelper.forEach.call(loadedModel.scenarios, function(scenario) {
                        objectHelper.forEach.call(scenario.data, function(timeTable) {
                            timeTable.onChange = function() {
                                loadedModel.emit(null, 'refresh', 'resetUI');
                            };
                        });
                    });

                    loadedModel.emit([loadedModel.id, loadedModel.syncId, previousId, previousSyncId], 'modelLoaded');
                    loadedModel.emit(null, 'refresh', 'resetUI');
                });
            }  else {
                loadedModel.nodeGui  = {};
                loadedModel.nodeData = {};

                var savedModel = savedModels.synced[option];

                if(loadedModel.id !== savedModel.id && loadedModel.syncId !== savedModel.syncId) {
                    savedModel.selected = false;
                    loadedModel.floatingWindows.forEach(function(floatingWindow) {
                        floatingWindow.destroyWindow();

                        if(floatingWindow.hide) {
                            floatingWindow.hide();
                        }
                    });
                }

                objectHelper.forEach.call(
                    savedModel,
                    function(value, key) {
                        loadedModel[key] = value;
                    }
                );

                loadedModel.emit([loadedModel.id, loadedModel.syncId, previousId, previousSyncId], 'modelLoaded');
                loadedModel.emit(null, 'refresh', 'resetUI');
            }
        } else {
            loadedModel.nodeGui  = {};
            loadedModel.nodeData = {};
            
            var savedModel = savedModels.local[option];
            if(loadedModel.id !== savedModel.id && loadedModel.syncId !== savedModel.syncId) {
                savedModel.selected = false;
                loadedModel.floatingWindows.forEach(function(floatingWindow) {
                    floatingWindow.destroyWindow();

                    if(floatingWindow.hide) {
                        floatingWindow.hide();
                    }
                });
            }

            objectHelper.forEach.call(
                savedModel,
                function(value, key) {
                    loadedModel[key] = value;
                }
            );

            loadedModel.emit([loadedModel.id, loadedModel.syncId, previousId, previousSyncId], 'modelLoaded');
            loadedModel.emit(null, 'refresh', 'resetUI');
        }
    });

    loadedModel.addListener('errorLoadingModel', function() {
        if(objectHelper.size.call(savedModels.local) === 0) {
            return loadedModel.emit('newModel');
        }

        loadedModel.emit(objectHelper.first.call(savedModels.local).id, 'loadModel');
    });
}

module.exports = addLoadModelListeners;
