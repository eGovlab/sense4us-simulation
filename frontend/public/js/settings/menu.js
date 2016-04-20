'use strict';

var Immutable  = null,
    backendApi = require('./../api/backend_api.js'),
    modelling  = require('./modelling.js'),
    simulate   = require('./simulate.js'),
    windows    = require('./windows.js');


var modelLayer   = require('./../model_layer.js');
var objectHelper = require('./../object-helper.js');

function modeUpdate(loadedModel, savedModels) {
    var element = this;

    element.resetOptions();
    element.addOption('modelling', 'Modelling');
    element.addOption('simulate',  'Simulate');

    element.refreshList();
};

function modeCallback(loadedModel, savedModels) {
    var option = this.value;

    this.parent.toggle();
    switch(option) {
        case 'modelling':
            loadedModel.sidebar     = modelling;
            loadedModel.environment = 'modelling';
            break;
        case 'simulate':
            loadedModel.sidebar     = simulate;
            loadedModel.environment = 'simulate';
            break;
    }

    if(!loadedModel.selected) {
        loadedModel.selected = loadedModel.settings;
    }

    loadedModel.emit(null, 'refresh', 'resetUI');
};

function projectUpdate(loadedModel, savedModels) {
    var element = this;

    element.resetOptions();
    element.addOption('new',    'New Model');
    element.addOption('save',   'Save Current');
    element.addOption('delete', 'Delete Current');

    modelLayer = require('./../model_layer.js');
    modelLayer.getAllModels().then(
        function(models) {
            objectHelper.forEach.call(
                savedModels.local,
                function(model) {
                    element.addOption(model.id, model.settings.name);
                }
            );

            models.forEach(function(model) {
                if(!savedModels.synced[model.id]) {
                    savedModels.synced[model.id] = model.name;
                }
            });

            objectHelper.forEach.call(
                savedModels.synced,
                function(model, key) {
                    if(typeof model === 'string') {
                        element.addOption(key, model);
                    } else {
                        element.addOption(model.syncId, model.settings.name);
                    }
                }
            );

            element.refreshList();
        },

        function(error, response) {
            objectHelper.forEach.call(
                savedModels.local,
                function(model) {
                    console.log(model);
                    element.addOption(model.id, model.settings.name);
                }
            );

            objectHelper.forEach.call(
                savedModels.synced,
                function(model, key) {
                    if(typeof model === 'string') {
                        element.addOption(key, model);
                    } else {
                        element.addOption(model.syncId, model.settings.name);
                    }
                }
            );

            element.refreshList();
        }
    );

    /*backendApi('/models/all', function(response, error) {
        if(error) {
            console.error(error);
            loadedModel.emit('Couldn\'t fetch all models.', 'notification');
            response = {
                response: []
            };

            //throw new Error('projectUpdate: /models/all crashed');
        }

        objectHelper.forEach.call(
            savedModels.local,
            function(model) {
                console.log(model);
                element.addOption(model.id, model.settings.name);
            }
        );

        var models = response.response;
        models.forEach(function(model) {
            if(!savedModels.synced[model.id]) {
                savedModels.synced[model.id] = model.name;
            }
        });

        objectHelper.forEach.call(
            savedModels.synced,
            function(model, key) {
                if(typeof model === 'string') {
                    element.addOption(key, model);
                } else {
                    element.addOption(model.syncId, model.settings.name);
                }
            }
        );

        element.refreshList();
    });*/
};

function projectCallback(loadedModel, savedModels) {
    var option = this.value;

    if(option === undefined) {
        return;
    }

    if(typeof option === 'number') {
        option = '' + option;
    }

    loadedModel.emit('storeModel');

    this.parent.toggle();
    switch(option.toUpperCase()) {
        case 'NEW':
            loadedModel.emit([loadedModel.id, loadedModel.syncId], 'preNewModel');
            loadedModel.emit('newModel');
            break;
        case 'SAVE':
            loadedModel.emit([loadedModel.id, loadedModel.syncId], 'preSaveModel');
            loadedModel.emit([loadedModel.id, loadedModel.syncId], 'saveModel');
            break;
        case 'DELETE':
            loadedModel.emit([loadedModel.id, loadedModel.syncId], 'deleteModel');
            break;
        default:
            loadedModel.emit(option, 'loadModel');
            break;
    }

    return loadedModel;
};

var menu = [
    {
        header:   'Project',
        type:     'DROPDOWN',
        update:   projectUpdate,
        callback: projectCallback
    },

    {
        header:   'Mode',
        type:     'DROPDOWN',
        update:   modeUpdate,
        callback: modeCallback
    },

    windows
];

module.exports = menu;
