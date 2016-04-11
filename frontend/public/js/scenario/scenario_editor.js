'use strict';

var FloatingWindow = require('./../floating_window/floating_window.js'),
    menuBuilder    = require('./../menu_builder'),
    Scenario       = require('./scenario.js');

var objectHelper   = require('./../object-helper.js');

function ScenarioEditor(loadedModel) {
    this.loadedModel     = loadedModel;
    this.floatingWindow  = new FloatingWindow(20, 20, 440, 400, 'mb-scenario-editor');
    this.floatingWindow.killButton.removeEventListener('click', this.floatingWindow.killCallback);
    var that = this;
    this.floatingWindow.killButton.killCallback = function() {
        that.destroyWindow();
    };
    this.floatingWindow.killButton.addEventListener('click', this.floatingWindow.killCallback);
    this.container       = this.floatingWindow.container;
    this.body            = this.floatingWindow.body;
    this.scenarios       = loadedModel.scenarios;
    this.currentScenario = undefined;

    this.options              = menuBuilder.div('options');
    this.options.style.height = '40px';

    this.selectedIndex = 0;

    this.scenarioContainer = menuBuilder.div('table-container');
    this.scenarioContainer.style.height = '360px';

    this.body.appendChild(this.options);
    this.body.appendChild(this.scenarioContainer);

    this.loadedModel.floatingWindows.push(this);
    this.generateOptions();

    document.body.appendChild(this.container);
}

ScenarioEditor.prototype = {
    destroyWindow: function() {
        this.floatingWindow.destroyWindow();
        this.container = null;
        this.body      = null;

        this.deleteScenario.deleteEvents();
        this.newScenario.deleteEvents();
        this.scenarioDropdown.deleteEvents();

        this.deleteScenario   = null;
        this.newScenario      = null;
        this.scenarioDropdown = null;

        var index = this.loadedModel.floatingWindows.indexOf(this);
        if(index === -1) {
            return;
        }

        this.loadedModel.floatingWindows.splice(index, 1);
    },

    createWindow: function() {
        this.floatingWindow.createWindow();
        this.container = this.floatingWindow.container;
        this.body      = this.floatingWindow.body;

        this.options              = menuBuilder.div('options');
        this.options.style.height = '40px';

        this.scenarioContainer = menuBuilder.div('table-container');
        this.scenarioContainer.style.height = '360px';

        this.body.appendChild(this.options);
        this.body.appendChild(this.scenarioContainer);
        this.generateOptions();

        document.body.appendChild(this.container);
    },

    generateOptions: function() {
        var that = this;
        this.scenarioDropdown = menuBuilder.select('text', function() {
            var value = parseInt(this.value);
            if(!that.scenarios[value]) {
                return;
            }

            that.setScenario(that.scenarios[value]);
            //that.scenarios[value].refresh(that.loadedModel);
            that.selectedIndex = value;

            that.loadedModel.emit('resetUI');
        });

        this.deleteScenario = menuBuilder.button('Delete scenario', function() {

        });

        this.newScenario = menuBuilder.button('New scenario', function() {
            var scenario = new Scenario(that.loadedModel);
            scenario.setName(objectHelper.size.call(that.scenarios) + ': New scenario');
            that.setScenario(scenario);
            that.scenarios[scenario.id] = scenario;
            //scenario.refresh(that.loadedModel);

            var option = menuBuilder.option(scenario.id, scenario.name);
            that.scenarioDropdown.appendChild(option);

            var index = that.scenarioDropdown.options.length - 1;
            that.scenarioDropdown.options[index].selected = true;
            that.selectedIndex = index;

            that.loadedModel.emit('resetUI');
        });

        this.scenarioDropdown.className = 'scenario-select';
        this.deleteScenario.className   = 'scenario-delete';
        this.newScenario.className      = 'scenario-new';

        this.options.appendChild(this.scenarioDropdown);
        this.options.appendChild(this.deleteScenario);
        this.options.appendChild(this.newScenario);

        objectHelper.forEach.call(
            this.loadedModel.scenarios,
            function(scenario) {
                var option = menuBuilder.option(scenario.id, scenario.name);
                if(scenario.id === this.currentScenario) {
                    option.selected = true;
                }

                this.scenarioDropdown.appendChild(option);
            },
            this
        );

        if(objectHelper.size.call(this.loadedModel.scenarios) === 0) {
            var scenario = new Scenario(this.loadedModel);
            scenario.setName(this.scenarios.size() + ': New scenario');

            this.setScenario(scenario);
            this.scenarios.push(scenario);

            var option = menuBuilder.option(that.loadedModel.scenarios.length - 1, scenario.name);
            this.scenarioDropdown.appendChild(option);
            this.selectedIndex = 0;
        } else {
            this.setScenario(this.loadedModel.loadedScenario);
            this.loadedModel.loadedScenario.refresh(this.loadedModel);
            /*this.setScenario(this.loadedModel.scenarios[this.selectedIndex]);
            this.loadedModel.scenarios[this.selectedIndex].refresh(this.loadedModel);*/
        }
    },

    setScenario: function(scenario) {
        this.currentScenario            = scenario;
        this.loadedModel.loadedScenario = scenario;
        //scenario.generateScenarioContainer();
        while(this.scenarioContainer.firstChild) {
            this.scenarioContainer.removeChild(this.scenarioContainer.firstChild);
        }

        this.scenarioContainer.appendChild(this.currentScenario.container);
    },

    refresh: function() {
        if(this.hidden) {
            return;
        }

        if(this.container === null && this.body === null) {
            this.createWindow();
        }

        this.currentScenario.refresh(this.loadedModel);
    }
};

module.exports = ScenarioEditor;