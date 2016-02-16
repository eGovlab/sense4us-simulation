'use strict';

var Immutable  = null,
    backendApi = require('./../api/backend_api.js'),
    modelling  = require('./modelling.js'),
    simulate   = require('./simulate.js'),
    windows    = require('./windows.js'),
    modelLayer = require('./../model_layer.js');

var modeUpdate = function(refresh, loadedModel, savedModels, UIData) {
    var element = this;

    element.resetOptions();
    element.addOption('modelling', "Modelling");
    element.addOption('simulate',  "Simulate");

    element.refreshList();
};

var modeCallback = function(refresh, loadedModel, savedModels, UIData) {
    var option = this.value;

    var UIData      = changeCallbacks.UIData,
        environment = changeCallbacks.environment,
        ui          = UIData();

    this.parent.toggle();

    switch(option) {
        case 'modelling':
            ui.sidebar = modelling;
            environment('modelling');
            UIData(ui);
            UIRefresh();
            refresh();
            break;
        case 'simulate':
            ui.sidebar = simulate;
            environment('simulate');
            UIData(ui);
            UIRefresh();
            refresh();
            break;
    }
};

var projectUpdate = function(refresh, loadedModel, savedModels, UIData) {
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

            element.addOption(model.id, '[' + model.id + ']' +savedString + model.settings.name);
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

var projectCallback = function(refresh, loadedModel, savedModels, UIData) {
    var option      = this.value,
        savedModels = changeCallbacks.savedModels,
        loadedModel = changeCallbacks.loadedModel,
        s           = savedModels(),
        text        = this.text.match(/^(\[\w+\])?(\s\*\s)?(.*)$/)[3],
        loaded      = loadedModel(),
        that        = this;

    if(loaded.synced === true) {
        s = s.set('synced', s.synced.set(loaded.syncId, loaded));
        savedModels(s)
    } else {
        s = s.set('local', s.local.set(loaded.id, loaded));
        savedModels(s)
    }

    this.parent.toggle();

    switch(option) {
        case 'new':
            var m = modelLayer.newModel(),
                s = savedModels();

            s = s.set('local', s.local.set(m.id, m));

            savedModels(s);
            loadedModel(m);

            that.parent.toggle();
            projectUpdate.call(this.parent, refresh, UIRefresh, changeCallbacks);
            refresh();
            break;
        case 'save':
            modelLayer.saveModel(loadedModel, function() {
                projectUpdate.call(that.parent, refresh, UIRefresh, changeCallbacks);
                refresh();
            });
            break;
        case 'delete':
            modelLayer.deleteModel(loadedModel, savedModels, function() {
                projectUpdate.call(that.parent, refresh, UIRefresh, changeCallbacks);
                refresh();
            });
            break;
        case undefined:
            break;
        default:
            if(s.local.get(option) === undefined || s.local.get(option).settings.name !== text) {
                if(s.synced.get(option) === undefined) {
                    modelLayer.loadSyncModel(option, function(newState) {
                        s = s.set('synced', s.synced.set(option, newState));
                        savedModels(s);
                        loadedModel(newState);
                        refresh();
                    });
                } else {
                    loadedModel(s.synced.get(option));
                    refresh();
                }
            } else {
                loadedModel(s.local.get(option));
                refresh();
            }
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
