'use strict';

var modelLayer   = require('./../../model_layer.js'),
    objectHelper = require('./../../object-helper.js');

function addSaveModelListeners(savedModels, loadedModel) {
    /**
     * @description A model with given id was saved under given synchronized id.
     * @event modelSaved
     * @memberof module:model/statusEvents
     *
     * @param {integer} id - Local id
     * @param {integer} syncId - Synchronized id
     * @example tool.addListener('modelSaved', function(id, syncId) {
     *     console.log('Model with id:', id, syncId, 'was saved or updated.');
     * });
     */
     
    /**
     * @description Save a model matching either synchronized id or local id.
     * @event saveModel
     * @memberof module:model/propagationEvents
     *
     * @param {integer} id - Local id
     * @param {integer} syncId - Synchronized id
     */
    loadedModel.addListener('saveModel', function(id, syncId) {
        var m = savedModels.synced[syncId] || savedModels.local[id];
        if(!m || typeof m === 'string') {
            loadedModel.emit('Model was not stored in correct location. Saving failed.', 'notification');
            throw new Error('Couldn\'t save model.');
        }

        modelLayer.saveModel(
                loadedModel.CONFIG.url,
                loadedModel.CONFIG.userFilter,
                loadedModel.CONFIG.projectFilter,
                m,
                function() {

            savedModels.synced[m.syncId] = m;
            //delete savedModels.local[m.id];
            if(id === loadedModel.id) {
                loadedModel.syncId = m.syncId;
            }

            loadedModel.emit([m.id, m.syncId], 'modelSaved');
        });
    });

    loadedModel.addListener('modelSaved', function(id, syncId) {
        var m = savedModels.synced[syncId] || savedModels.local[id];
        if(!m || typeof m === 'string') {
            console.log(savedModels);
            loadedModel.emit('Model was not stored in correct location. Saving probably finished, but wut.', 'notification');
            throw new Error('Model data corrupted.');
        }

        loadedModel.emit('Model \'' + m.settings.name + '\' saved.', 'notification');
        loadedModel.emit(null, 'refresh', 'resetUI');
    });
}

module.exports = addSaveModelListeners;
