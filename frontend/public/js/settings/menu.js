'use strict';

/*
** MERGING!
*/

var Immutable  = require('Immutable'),
    network    = require('./../network'),
    model      = require('./model.js'),
    simulate   = require('./simulate.js'),
    modelLayer = require('./../model_layer.js');

var modeUpdate = function(refresh, UIRefresh, changeCallbacks) {
    var element = this;

    element.resetOptions();
    element.addOption('edit', "Edit");
    element.addOption('simulate', "Simulate");

    element.refreshList();
};

var modeCallback = function(refresh, UIRefresh, changeCallbacks) {
    var option = this.value;

    var UIData      = changeCallbacks.get('UIData'),
        environment = changeCallbacks.get('environment'),
        ui          = UIData();

    this.parent.toggle();

    switch(option) {
        case 'edit':
            ui = ui.set('sidebar', model);
            environment('edit');
            UIData(ui);
            UIRefresh();
            refresh();
            break;
        case 'simulate':
            ui = ui.set('sidebar', simulate);
            environment('simulate');
            UIData(ui);
            UIRefresh();
            refresh();
            break;
    }
};

var projectUpdate = function(refresh, UIRefresh, changeCallbacks) {
    var element = this;

    var savedModels = changeCallbacks.get('savedModels'),
        loadedModel = changeCallbacks.get('loadedModel');

    element.resetOptions();
    element.addOption('new', 'New Model');
    element.addOption('save', 'Save Current');
    element.addOption('delete', 'Delete Current');

    network.getData('/models/all', function(response, error) {
        var sm = savedModels();
        sm.get('local').forEach(function(model) {
            if(model.get('synced') === true) {
                return;
            }

            var savedString = "";
            if(model.get('saved') === false) {
                savedString = " * ";
            }

            element.addOption(model.get('id'), '[' + model.get('id') + ']' +savedString + model.get('settings').get('name'));
        });

        sm.get('synced').forEach(function(model) {
            var savedString = "";
            if(model.get('saved') === false) {
                savedString = " * ";
            }

            element.addOption(model.get('syncId'), savedString + model.get('settings').get('name'));
        });

        if(error) {
            element.refreshList();
            return;
        }

        var models = response.response.models;

        var local  = sm.get('local'),
            synced = sm.get('synced');

        models.forEach(function(model) {
            element.addOption(model.id, model.name);
        });

        element.refreshList();
    });
};

var projectCallback = function(refresh, UIRefresh, changeCallbacks) {
    var option      = this.value,
        savedModels = changeCallbacks.get('savedModels'),
        loadedModel = changeCallbacks.get('loadedModel'),
        s           = savedModels(),
        text        = this.text.match(/^(\[\w+\])?(\s\*\s)?(.*)$/)[3],
        loaded      = loadedModel(),
        that        = this;

    if(loaded.get('synced') === true) {
        s = s.set('synced', s.get('synced').set(loaded.get('syncId'), loaded));
        savedModels(s)
    } else {
        s = s.set('local', s.get('local').set(loaded.get('id'), loaded));
        savedModels(s)
    }

    this.parent.toggle();

    switch(option) {
        case 'new':
            var m = modelLayer.newModel(),
                s = savedModels();

            s = s.set('local', s.get('local').set(m.get('id'), m));

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
            if(s.get('local').get(option) === undefined || s.get('local').get(option).get('settings').get('name') !== text) {
                if(s.get('synced').get(option) === undefined) {
                    modelLayer.loadSyncModel(option, function(newState) {
                        s = s.set('synced', s.get('synced').set(option, newState));
                        savedModels(s);
                        loadedModel(newState);
                        refresh();
                    });
                } else {
                    loadedModel(s.get('synced').get(option));
                    refresh();
                }
            } else {
                loadedModel(s.get('local').get(option));
                refresh();
            }
    }

    return loadedModel;
};

var menu = Immutable.List([
    Immutable.Map({
        header:   "Project",
        update:   projectUpdate,
        callback: projectCallback
    }),

    Immutable.Map({
        header:   "Mode",
        update:   modeUpdate,
        callback: modeCallback
    })
]);

module.exports = menu;