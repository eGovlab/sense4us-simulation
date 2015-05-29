'use strict';

var Immutable  = require('Immutable'),
    network    = require('./../network'),
    modelLayer = require('./../model_layer.js');

var projectUpdate = function(loadedModel, selectedMenu, localModels, environment, UIData) {
    var element = this;

    element.resetOptions();
    element.addOption('new', 'New Model');
    element.addOption('save', 'Save Current');
    element.addOption('delete', 'Delete Current');

    network.getData('/models/all', function(response, error) {
        localModels().forEach(function(model) {
            element.addOption(model.get('id'), model.get('settings').get('name'));
        });

        if(error) {
            element.refreshList();
            return;
        }

        var models = response.response.models;

        models.forEach(function(model) {
            element.addOption(model.id, model.name);
        });

        element.refreshList();
    });

    console.log(element);
    console.log(loadedModel().get('settings').get('name'));
};

var projectCallback = function(loadedModel, selectedMenu, localModels, environment, UIData) {
    var option = this.value;

    switch(option) {
        case 'new':
            console.log('New model!');
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
            var local = localModels()[option];
            if(local === undefined) {
                console.log("Remote model!");
                modelLayer.loadSyncModel(option, function(newState) {
                    console.log(newState);
                });
            } else {
                console.log(option);
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