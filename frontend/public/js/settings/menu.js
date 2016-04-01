'use strict';

var Immutable  = null,
    backendApi = require('./../api/backend_api.js'),
    modelling  = require('./modelling.js'),
    simulate   = require('./simulate.js'),
    windows    = require('./windows.js'),
    modelLayer = require('./../model_layer.js');

var objectHelper = require('./../object-helper.js');

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
        if(error) {
            console.log(error);
            throw new Error("projectUpdate: /models/all crashed");
        }

        objectHelper.forEach.call(
            savedModels.local,
            function(model) {
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
                if(typeof model === "string") {
                    element.addOption(key, model);
                } else {
                    element.addOption(model.syncId, model.settings.name);
                }
            }
        );

        if(error) {
            element.refreshList();
            return;
        }

        element.refreshList();
    });
};

var projectCallback = function(loadedModel, savedModels) {
    var option      = this.value,
        that        = this,
        text        = this.text.match(/^(\s\*\s)?(.*)$/)[2];

    modelLayer = require("./../model_layer.js");
    var m;
    if(loadedModel.synced === true) {
        m = modelLayer.moveModel(loadedModel);
        savedModels.synced[loadedModel.syncId] = m;
    } else {
        m = modelLayer.moveModel(loadedModel);
        savedModels.local[loadedModel.id] = m;
    }

    this.parent.toggle();
    switch(option) {
        case 'new':
            var m = modelLayer.newModel();

            objectHelper.forEach.call(
                m,
                function(value, key) {
                    loadedModel[key] = value;
                }
            );

            savedModels.local[loadedModel.id] = m;

            that.parent.toggle();
            projectUpdate.call(this.parent, loadedModel, savedModels);
            break;
        case 'save':
            objectHelper.forEach.call(
                m,
                function(value, key) {
                    loadedModel[key] = value;
                }
            );

            modelLayer.saveModel(loadedModel, function() {
                projectUpdate.call(that.parent, loadedModel, savedModels);

                loadedModel.refresh = true;
                loadedModel.resetUI = true;
                loadedModel.propagate();
            });
            return;
            break;
        case 'delete':
            modelLayer.deleteModel(loadedModel, savedModels, function() {
                projectUpdate.call(that.parent, loadedModel, savedModels);
                loadedModel.refresh = true;
                loadedModel.resetUI = true;
                loadedModel.propagate();
            });
            return;
            break;
        case undefined:
            break;
        default:
            if(savedModels.local[option] === undefined || savedModels.local[option].settings.name !== text) {
                if(typeof savedModels.synced[option] === "string") {
                    modelLayer.loadSyncModel(option, function(newState) {
                        if(typeof newState === "number") {
                            loadedModel.syncId = newState;
                            loadedModel.id     = newState;

                            loadedModel.refresh = true;
                            loadedModel.resetUI = true;
                            loadedModel.propagate();
                            return;
                        }

                        loadedModel.nodeGui  = {};
                        loadedModel.nodeData = {};
                        loadedModel.propagate();

                        savedModels.synced[option] = newState;
                        objectHelper.forEach.call(
                            newState,
                            function(value, key) {
                                loadedModel[key] = value;
                            }
                        );

                        loadedModel.refresh = true;
                        loadedModel.propagate();
                    });
                } else {
                    loadedModel.nodeGui  = {};
                    loadedModel.nodeData = {};
                    loadedModel.propagate();

                    var savedModel = savedModels.synced[option];
                    objectHelper.forEach.call(
                        savedModel,
                        function(value, key) {
                            loadedModel[key] = value;
                        }
                    );

                    loadedModel.refresh = true;
                }
            } else {
                loadedModel.nodeGui  = {};
                loadedModel.nodeData = {};
                loadedModel.propagate();
                
                var savedModel = savedModels.local[option];
                objectHelper.forEach.call(
                    savedModel,
                    function(value, key) {
                        loadedModel[key] = value;
                    }
                );

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
