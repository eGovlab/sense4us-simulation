'use strict';

var Immutable  = require('Immutable'),
    network    = require('./../network'),
    modelLayer = require('./../model_layer.js');

var projectUpdate = function(refresh, loadedModel, selectedMenu, savedModels, environment, UIData) {
    var element = this;

    element.resetOptions();
    element.addOption('new', 'New Model');
    element.addOption('save', 'Save Current');
    element.addOption('delete', 'Delete Current');

    network.getData('/models/all', function(response, error) {
        var sm = savedModels();
        sm.get('local').forEach(function(model) {
            var savedString = "";
            if(model.get('saved') === false) {
                savedString = " * ";
            }

            element.addOption(model.get('id'), savedString + model.get('settings').get('name'));
        });

        sm.get('synced').forEach(function(model) {
            var savedString = "";
            if(model.get('saved') === false) {
                savedString = " * ";
            }

            element.addOption(model.get('id'), savedString + model.get('settings').get('name'));
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

var projectCallback = function(refresh, loadedModel, selectedMenu, savedModels, environment, UIData) {
    var option = this.value,
        s      = savedModels(),
        text   = this.text.match(/^(\s\*\s)?(.*)$/)[2],
        loaded = loadedModel();

    if(loaded.get('synced') === true) {
        s = s.set('synced', s.get('synced').set(loaded.get('id'), loaded));
        savedModels(s)
    } else {
        s = s.set('local', s.get('local').set(loaded.get('id'), loaded));
        savedModels(s)
    }

    switch(option) {
        case 'new':
            console.log('New model!');
            var m = modelLayer.newModel(),
                s = savedModels();

            s = s.set('local', s.get('local').set(m.get('id'), m));

            savedModels(s);
            loadedModel(m);

            projectUpdate.call(this.parent, refresh, loadedModel, selectedMenu, savedModels, environment, UIData);
            refresh();
            break;
        case 'save':
            console.log('Save model!');
            break;
        case 'delete':
            console.log('Delete model!');
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
    })
]);

module.exports = menu;