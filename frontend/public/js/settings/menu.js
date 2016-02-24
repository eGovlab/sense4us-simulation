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
        var m = modelLayer.moveModel(loadedModel);
        savedModels.synced[loadedModel.syncId] = m;

        console.log("Saved synced:", m, loadedModel.syncId);
    } else {
        var m = modelLayer.moveModel(loadedModel);
        savedModels.local[loadedModel.id] = m;

        console.log("Saved local:", m, loadedModel.id);
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
                    console.log("Loading remotely.");
                    modelLayer.loadSyncModel(option, function(newState) {
                        loadedModel.nodeGui  = {};
                        loadedModel.nodeData = {};
                        loadedModel.propagate();

                        //savedModels.synced[option] = modelLayer.moveModel(newState);
                        newState.forEach(function(value, key) {
                            loadedModel[key] = value;
                        });

                        loadedModel.refresh = true;
                        loadedModel.propagate();
                    });
                } else {
                    console.log("Found in sync:", option);
                    loadedModel.nodeGui  = {};
                    loadedModel.nodeData = {};
                    loadedModel.propagate();

                    var savedModel = savedModels.synced[option];
                    console.log(savedModel);
                    savedModel.forEach(function(value, key) {
                        loadedModel[key] = value;
                    });

                    loadedModel.refresh = true;
                }
            } else {
                console.log("Found locally.");

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
