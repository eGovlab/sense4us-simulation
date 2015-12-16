'use strict';

var floatingWindow = require('./../floating_window/floating_window.js'),
    menuBuilder    = require('./../menu_builder');

function createScenario(nodes) {
    var scenario = Immutable.Map({});

    nodes.forEach(function(node) {
        if(!node.get('timeTable')) {
            return;
        }

        scenario = scenario.set(node.get('id'), node.get('timeTable'));
    });

    return scenario;
}

function createTimeTable(nodes, scenario, onUpdate) {
    var tables = document.createElement('div');
    tables.className = 'scenario-table';
    var iter = 0;
    scenario.forEach(function(timeTable, key) {
        var node  = document.createElement('div'),
            id    = document.createElement('div');

        id.innerHTML = nodes.get(key).get('name');

        node.className = 'node';
        id.className = 'node-header';

        node.appendChild(id);
        timeTable.forEach(function(value, step) {
            var stepState = step;
            var stepContainer = document.createElement('div'),
                valueDiv      = document.createElement('div'),
                stepDiv       = document.createElement('div'),
                valueLabel    = menuBuilder.label("V"),
                stepLabel     = menuBuilder.label("T"),
                valueInput    = menuBuilder.input('value', value, function(input, newValue) {
                    timeTable = timeTable.set(stepState, newValue);
                    scenario = scenario.set(key, timeTable);
                    onUpdate(scenario);
                }),
                stepInput     = menuBuilder.input('step',  step,  function(input, newStep) {
                    var newValue     = timeTable.get(step),
                        newTimeTable = timeTable.delete(step);

                    stepState = newStep;
                    scenario = scenario.set(key, newTimeTable.set(newStep, newValue));
                    onUpdate(scenario);
                });

            stepContainer.className = 'step-container';
            stepDiv.className  = 'step';
            valueDiv.className = 'value';

            stepDiv.appendChild(stepLabel);
            stepDiv.appendChild(stepInput);
            valueDiv.appendChild(valueLabel);
            valueDiv.appendChild(valueInput);

            stepContainer.appendChild(stepDiv);
            stepContainer.appendChild(valueDiv);
            node.appendChild(stepContainer);
        });

        tables.appendChild(node);

        if(iter % 2) {
            var clear = document.createElement('div');
            clear.style.clear = 'both';
            tables.appendChild(clear);
        }

        iter++;
    });

    return tables;
}

function createScenarioEditor(_loadedModel, refresh, UIRefresh, changeCallbacks) {
    var container = document.createElement('div'),
        options   = document.createElement('div');

    var loadedModel      = _loadedModel();
    var scenarios        = loadedModel.get('scenarios'),
        nodes            = loadedModel.get('nodeData'),
        loadedScenarioId = loadedModel.get('loadedScenario');

    if(!scenarios.get(loadedScenarioId)) {
        scenarios = scenarios.push(createScenario(nodes));
        loadedScenarioId = scenarios.size - 1;
    }

    console.log(scenarios);
    console.log(loadedScenarioId);

    var loadedScenario = scenarios.get(loadedScenarioId);
    var tables = createTimeTable(nodes, loadedScenario, function(updatedScenario) {
        scenarios = scenarios.set(loadedScenarioId, updatedScenario);
        loadedModel = loadedModel.set('scenarios', scenarios);

        _loadedModel(loadedModel);
    });

    var setScenarioCallback = function() {
        var currentModel = _loadedModel();
        var currentScenario = currentModel.get('scenarios').get(currentModel.get('loadedScenario'));
        var nodes = currentModel.get('nodeData');

        currentScenario.forEach(function(timeTable, key) {
            console.log(key);
            var node = nodes.get(key);
            node = node.set('timeTable', timeTable);

            nodes = nodes.set(key, node);
        });

        currentModel = currentModel.set('nodeData', nodes);
        _loadedModel(currentModel);
        refresh();
    };

    var saveScenarioCallback = function() {
    };

    var setScenario    = menuBuilder.button('Set Scenario', setScenarioCallback),
        deleteScenario = menuBuilder.button('Delete Scenario'),
        saveScenario   = menuBuilder.button('Save Scenario', saveScenarioCallback);

    options.appendChild(setScenario);
    options.appendChild(deleteScenario);
    options.appendChild(saveScenario);

    container.appendChild(options);
    container.appendChild(tables);

    container.className = 'scenario-editor';

    return container;
}

function update(refresh, UIRefresh, changeCallbacks) {
    var element = this;

    element.resetOptions();
    element.addOption('scenario', 'Scenario Editor');

    element.refreshList();
}

function callback(refresh, UIRefresh, changeCallbacks) {
    var option = this.value;

    var _loadedModel = changeCallbacks.get('loadedModel');
    var loadedModel  = _loadedModel();

    var _UIData = changeCallbacks.get('UIData');
    var UIData  = _UIData();

    this.parent.toggle();

    switch(option) {
        case 'scenario':
            console.log('Scenario');
            var scenarioEditor = floatingWindow.createWindow(20, 20, 440, 400);
            var scenarioContainer = createScenarioEditor(_loadedModel, refresh, UIRefresh, changeCallbacks);
            scenarioEditor.appendChild(scenarioContainer);
            document.body.appendChild(scenarioEditor);
            UIData = UIData.set('floatingWindows', UIData.get('floatingWindows').push(scenarioEditor));
            _UIData(UIData);
            break;
    }
}

module.exports = {
    header:   'Windows',
    type:     'DROPDOWN',
    update:   update,
    callback: callback
};
