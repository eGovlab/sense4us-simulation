'use strict';

var modelLayer  = require('./../model_layer.js'),
    menuLayer   = require('./menu_layer.js'),
    menuBuilder = require('./../menu_builder');

/*
** modelDropdownUpdate
** modelDropdownChoose
** modelEnv
** simulateEnv
*/

var modelDropdownUpdate = function(state) {
    var element = this;

    element.resetOptions();
    element.addOption('new', 'New Model');

    if (state.loadedModel === null) {
        state.loadedModel = modelLayer.createModel();
        state.loadedModel.setOption(menuBuilder.option(state.loadedModel.getId(), state.loadedModel.getId() + ': New Model'));
        state.loadedModel.local = true;
        modelLayer.select(state.loadedModel);
    }

    modelLayer.iterateModels(function(model, index) {
        element.addOption(model.getId(), model.name);

        if (model.getId() === modelLayer.selected.getId()) {
            element.select(index + 1);
        }
    }, function() {
        element.refreshList();
        state.refresh();
    });
};

var modelDropdownChoose = function(state, e) {
    var id = this.value;
    if (id === 'new') {
        state.loadedModel = modelLayer.createModel();
        state.loadedModel.setOption(menuBuilder.option(state.loadedModel.getId(), state.loadedModel.getId() + ': New Model'));
        state.loadedModel.local = true;
        modelLayer.select(state.loadedModel, state);
    } else {
        state.loadedModel = modelLayer.select(id, state);
    }

    this.update();
};

var modelEnv = function(state) {
    state.selected_menu = null;

    menuLayer.activateSidebar('model');
    state.environment = 'model';
    state.refresh();
};

var simulateEnv = function(state) {
    state.selected_menu = null;

    menuLayer.activateSidebar('simulate');
    state.environment = 'simulate';
    state.refresh();
};

var upperMenu = [
    {
        header: 'Load'
    },

    {
        header: 'Model',
        type: 'dropdown',
        update: modelDropdownUpdate,
        callback: modelDropdownChoose
    },

    {
        header: 'Mode'
    },

    {
        header: 'Model',
        callback: modelEnv
    },

    {
        header: 'Simulate',
        callback: simulateEnv
    }
];

module.exports = [
    upperMenu
];