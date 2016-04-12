'use strict';

var ScenarioEditor = require('./../scenario').ScenarioEditor;

function update(loadedModel, savedModels) {
    var element = this;

    element.resetOptions();
    element.addOption('scenario', 'Scenario Editor');

    element.refreshList();
}

function callback(loadedModel, savedModels) {
    var option = this.value;

    this.parent.toggle();

    loadedModel.emit(option, 'newWindow');
    return;

    switch(option.toUpperCase()) {
        case 'SCENARIO':
            loadedModel.emit('SCENARIO', 'newWindow');
            //var scenarioEditor = new ScenarioEditor(loadedModel);
            /*var scenarioEditor = floatingWindow.createWindow(20, 20, 440, 400);
            var scenarioContainer = createScenarioEditor(loadedModel, savedModels);
            scenarioEditor.appendChild(scenarioContainer);
            document.body.appendChild(scenarioEditor);*/
            break;
    }
}

module.exports = {
    header:   'Windows',
    type:     'DROPDOWN',
    update:   update,
    callback: callback
};
