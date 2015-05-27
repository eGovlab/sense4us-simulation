'use strict';

var modelLayer      = require('./../model_layer.js'),
    modeLayer       = require('./../mode_layer.js'),
    menuLayer       = require('./menu_layer.js'),
    network         = require('./../network'),
    notificationBar = require('./../notification_bar'),
    breakout        = require('./../breakout.js'),
    menuBuilder     = require('./../menu_builder');

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
    element.addOption('save', 'Save Current');
    element.addOption('delete', 'Delete Current');

    if (state.loadedModel === null) {
        state.loadedModel = modelLayer.createModel();
        state.loadedModel.setOption(menuBuilder.option(state.loadedModel.getId(), state.loadedModel.getId() + ': New Model'));
        state.loadedModel.local = true;
        modelLayer.select(state.loadedModel);
    }

    modelLayer.iterateModels(function(model, index) {
        element.addOption(model.getId(), model.name);

        if (model.getId() === modelLayer.selected.getId()) {
            element.select(index + 3);
        }
    }, function() {
        element.refreshList();
        if(element.visible()) {
            element.toggle();
        }
        state.refresh();
    });
};

var saveModel = function(state) {
    if (state.loadedModel.synced) {
        var data = {
            modelId: state.loadedModel.syncId,
            model:   state.loadedModel.name,
            nodes:   breakout.nodes(state),
            links:   breakout.links(state)
        };

        network.postData('/models/save', data, function(response, err) {
            if (err) {
                console.log(response);
                return;
            }

            notificationBar.notify('Model['+state.loadedModel.name+'] saved.');
        });
        return;
    }

    var blackout = menuBuilder.div();
    blackout.className = 'blackout';

    var saveForm = menuBuilder.div();
    saveForm.className = 'save-form';

    var saveFormContainer = menuBuilder.div();
    saveFormContainer.className = 'save-form-container';

    var form = document.createElement('form');
    var nameDiv = document.createElement('div');

    var nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.name = 'model-name';
    nameInput.className = 'save-form-input';
    var nameLabel = document.createElement('label');
    nameLabel.innerHTML = 'Name';
    nameLabel.className = 'save-form-label';

    nameDiv.appendChild(nameLabel);
    nameDiv.appendChild(nameInput);

    var buttonContainer = menuBuilder.div();
    buttonContainer.className = 'save-form-button-container';

    var submitButton = document.createElement('input');
    submitButton.type = 'submit';
    submitButton.value = 'Save';

    var cancelButton = document.createElement('button');
    cancelButton.innerHTML = 'Cancel';

    cancelButton.addEventListener('click', function(e) {
        e.preventDefault();
        document.body.removeChild(blackout);
    });

    buttonContainer.appendChild(submitButton);
    buttonContainer.appendChild(cancelButton);

    form.appendChild(nameDiv);
    form.appendChild(buttonContainer);

    saveFormContainer.appendChild(form);

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        document.body.removeChild(blackout);

        var data = {
            modelId: null,
            model: nameInput.value,
            nodes: breakout.nodes(state),
            links: breakout.links(state)
        };

        network.postData('/models/save', data, function(response, err) {
            if (err) {
                return;
            }

            var id = response.response.id;
            var name = response.response.name;

            notificationBar.notify('Model['+name+'] saved.');
            state.loadedModel.synced = true;
            state.loadedModel.setSyncId(id);
            state.loadedModel.name = name;
            modelLayer.select(state.loadedModel);

            menuBuilder.updateAll();
        });
    });

    saveForm.appendChild(saveFormContainer);

    document.body.appendChild(blackout);
    blackout.appendChild(saveForm);
};

var deleteModel = function(state) {
    if (state.loadedModel.synced) {
        network.deleteData('/models/' + state.loadedModel.syncId, {}, function(response, err) {
            if (err) {
                console.log(err);
                return;
            }

            notificationBar.notify('Model['+state.loadedModel.name+'] deleted.');
            modelLayer.deleteModel(state.loadedModel);
            modelLayer.reselect();
            menuBuilder.updateAll();
            state.refresh();
        });
    } else {
        notificationBar.notify('Model['+state.loadedModel.getId()+'] deleted.');
        modelLayer.deleteModel(state.loadedModel);
        modelLayer.reselect();
        menuBuilder.updateAll();
        state.refresh();
    }
};

var modelDropdownChoose = function(state, e) {
    var id = this.value;

    switch(id) {
        case 'new':
            state.loadedModel = modelLayer.createModel();
            state.loadedModel.setOption(menuBuilder.option(state.loadedModel.getId(), state.loadedModel.getId() + ': New Model'));
            state.loadedModel.local = true;
            modelLayer.select(state.loadedModel, state);
            break;
        case 'save':
            saveModel(state);
            break;
        case 'delete':
            deleteModel(state);
            break;
        default:
            state.loadedModel = modelLayer.select(id, state);
    }

    this.update();
};

modeLayer.addMode('Model', function(state) {
    state.selectedMenu = null;

    menuLayer.activateSidebar('model');
    state.environment = 'model';
    state.refresh();
});

modeLayer.addMode('Simulate', function(state) {
    state.selectedMenu = null;

    menuLayer.activateSidebar('simulate');
    state.environment = 'simulate';
    state.refresh();
});

var modeUpdate = function(state) {
    var element = this;

    element.resetOptions();

    modeLayer.iterateModes(function(name, callback) {
        element.addOption(name.toUpperCase(), name, callback);
    });

    if(element.selected === false) {
        element.select(0);
    }

    element.refreshList();
    state.refresh();
};

var modeChoose = function(state, e) {
    var mode = this.value,
        id   = this.id;

    this.callback(state);
    this.parent.select(id);
    this.parent.toggle();
};

var upperMenu = [
    {
        header: 'Project',
        type: 'dropdown',
        update: modelDropdownUpdate,
        callback: modelDropdownChoose
    },

    {
        header: 'Mode',
        type: 'dropdown',
        update: modeUpdate,
        callback: modeChoose
    }
];

module.exports = [
    upperMenu
];