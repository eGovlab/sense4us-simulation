'use strict';

var Immutable  = null,
    backendApi = require('./../api/backend_api.js'),
    modelling  = require('./modelling.js'),
    simulate   = require('./simulate.js'),
    windows    = require('./windows.js'),
    modelLayer = require('./../model_layer.js');

var modeUpdate = function(loadedModel, savedModels) {
    var element = this;

    element.resetOptions();
    element.addOption('modelling', "Modelling");
    element.addOption('simulate',  "Simulate");

    element.refreshList();
};

var modeCallback = function(loadedModel, savedModels) {
    var option = this.value;

    this.parent.toggle();
    switch(option) {
        case 'modelling':
            loadedModel.sidebar     = modelling;
            loadedModel.environment = "modelling";
            break;
        case 'simulate':
            loadedModel.sidebar     = simulate;
            loadedModel.environment = "simulate";
            break;
    }

    loadedModel.refresh = true;
    loadedModel.resetUI = true;

    if(!loadedModel.selected) {
        loadedModel.selected = loadedModel.settings;
    }

    loadedModel.propagate();
};

var projectUpdate = function(loadedModel, savedModels) {
    var element = this;

    element.resetOptions();
    element.addOption('new',    'New Model');
    element.addOption('save',   'Save Current');
    element.addOption('delete', 'Delete Current');

    backendApi('/models/all', function(response, error) {
        savedModels.local.forEach(function(model) {
            if(model.synced === true) {
                return;
            }

            var savedString = "";
            if(model.saved === false) {
                savedString = " * ";
            }

            element.addOption(model.id, 'LOCAL' + savedString + model.settings.name);
        });

        savedModels.synced.forEach(function(model) {
            var savedString = "";
            if(model.saved === false) {
                savedString = " * ";
            }

            element.addOption(model.syncId, savedString + model.settings.name);
        });

        if(error) {
            element.refreshList();
            return;
        }

        var models = response.response;

        var local  = savedModels.local,
            synced = savedModels.synced;

        models.forEach(function(model) {
            element.addOption(model.id, model.name);
        });

        element.refreshList();
    });
};

var projectCallback = function(loadedModel, savedModels) {
    var option      = this.value,
        that        = this,
        text        = this.text.match(/^(LOCAL)?(\s\*\s)?(.*)$/)[3];

    modelLayer = require("./../model_layer.js");
    if(loadedModel.synced === true) {
        var m = modelLayer.newModel(loadedModel.copy());
        savedModels.synced[loadedModel.syncId] = m;
    } else {
        var m = modelLayer.newModel(loadedModel.copy());
        savedModels.local[loadedModel.id] = m;
    }

    this.parent.toggle();
    switch(option) {
        case 'new':
            var m = modelLayer.newModel();

            m.forEach(function(value, key) {
                loadedModel[key] = value;
            });

            that.parent.toggle();
            projectUpdate.call(this.parent, loadedModel, savedModels);
            break;
        case 'save':
            modelLayer.saveModel(loadedModel, function() {
                projectUpdate.call(that.parent, loadedModel, savedModels);
                loadedModel.refresh = true;
                loadedModel.propagate();
            });
            break;
        case 'delete':
            modelLayer.deleteModel(loadedModel, savedModels, function() {
                projectUpdate.call(that.parent, loadedModel, savedModels);
                loadedModel.refresh = true;
                loadedModel.propagate();
            });
            break;
        case undefined:
            break;
        default:
            if(savedModels.local[option] === undefined || savedModels.local[option].settings.name !== text) {
                if(savedModels.synced[option] === undefined) {
                    modelLayer.loadSyncModel(option, function(newState) {
                        loadedModel.nodeGui  = {};
                        loadedModel.nodeData = {};
                        loadedModel.propagate();

                        savedModels.synced[option] = modelLayer.newModel(newState.copy());
                        newState.forEach(function(value, key) {
                            loadedModel[key] = value;
                        });

                        loadedModel.refresh = true;
                        loadedModel.propagate();
                    });
                } else {
                    loadedModel.nodeGui  = {};
                    loadedModel.nodeData = {};
                    loadedModel.propagate();
                    var savedModel = savedModels.synced[option];
                    savedModel.forEach(function(value, key) {
                        loadedModel[key] = value;
                    });

                    loadedModel.refresh = true;
                }
            } else {
                loadedModel.nodeGui  = {};
                loadedModel.nodeData = {};
                loadedModel.propagate();
                
                var savedModel = savedModels.local[option];
                savedModel.forEach(function(value, key) {
                    loadedModel[key] = value;
                });

                loadedModel.refresh = true;
            }
    }

    loadedModel.resetUI = true;
    loadedModel.propagate();

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
