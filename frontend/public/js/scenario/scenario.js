var FloatingWindow = require('./../floating_window/floating_window.js'),
    menuBuilder    = require('./../menu_builder');

function TimeTable(loadedModel, node) {
    this.node = node;
    this.data = node.copy();

    this.header = node.name;

    this.container = menuBuilder.div('menu');
    this.filter = filter;

    this.loadedModel = loadedModel;

    this.timetable   = this.data.timeTable;
    this.timetableDiv;
    this.rowContainer;
    this.rows = {};

    this.dropdowns  = {};
    this.inputs     = {};
}

TimeTable.prototype = {
    setTimeStep: function(timeStepInput, timeStep, newStep) {
        var storingValue = this.timetable[timeStep];
        if(this.timetable[newStep]) {
            return timeStepInput.value = timeStep;
        }

        this.timetable[newStep] = this.timetable[timeStep];
        delete this.timetable[timeStep];

        this.node.timeTable[newStep] = this.node.timeTable[timeStep];
        delete this.node.timeTable[timeStep];

        this.rows[newStep] = this.rows[timeStep];
        delete this.rows[timeStep];

        timeStepInput.value = newStep;

        this.refreshTimeTable();

        this.loadedModel.refresh = true;
        this.loadedModel.propagate();
    },
    
    setTimeValue: function(timeValueInput, timeStep, newValue) {
        this.timetable[timeStep] = newValue;
        timeValueInput.value     = newValue;

        this.node.timeTable[timeStep] = newValue;

        this.loadedModel.refresh = true;
        this.loadedModel.propagate();
    },

    addTimeRow: function(timeStep, timeValue) {
        if(!this.timetable) {
            this.timetable = {};
        }

        var containerDiv = this.timetableDiv;
        if(!containerDiv) {
            var containerDiv = menuBuilder.div();
                containerDiv.className = "time-table";

            containerDiv.appendChild(menuBuilder.label(key));

            this.timetableDiv = containerDiv;
        }

        var rowContainer = this.rowContainer;
        if(!rowContainer) {
            rowContainer      = menuBuilder.div("row-container");
            this.rowContainer = rowContainer;

            containerDiv.appendChild(rowContainer);
        }

        var that = this;

        var rowDiv = menuBuilder.div("time-row");
        this.rows[timeStep] = rowDiv;

        var timeStepLabel       = menuBuilder.span("T");
        timeStepLabel.className = "label";

        var timeStepInput = menuBuilder.input("time-step", timeStep, function(input, newStep) {
            that.setTimeStep(timeStepInput, timeStep, newStep);
        });

        timeStepInput.className = "time-step";

        var timeValueLabel = menuBuilder.span("V");
        timeValueLabel.className = "label";

        var timeValueInput = menuBuilder.input("time-value", timeValue, function(input, newValue) {
            that.setTimeValue(timeValueInput, timeStep, newValue);
        });

        timeValueInput.className = "time-value";

        rowDiv.appendChild(timeStepLabel);
        rowDiv.appendChild(timeStepInput);
        rowDiv.appendChild(timeValueLabel);
        rowDiv.appendChild(timeValueInput);

        rowDiv.stepInput  = timeStepInput;
        rowDiv.valueInput = timeValueInput;

        rowContainer.appendChild(rowDiv);

        this.node.timeTable[timeStep] = timeValue;
    },

    removeTimeRow: function() {
        if (this.timetable === undefined || this.timetable === null || this.timetable.size() === 0) {
            return;
        } else {
            this.timetable = this.timetable.slice(0, -1);
        }

        var element = this.rows.last();
        this.rowContainer.removeChild(element);

        delete this.rows[this.rows.lastKey()];

        this.node.timeTable = this.node.timeTable.slice(0, -1);

        this.loadedModel.refresh = true;
        this.loadedModel.propagate();
    },

    refreshTimeTable: function() {
        if(!this.rowContainer) {
            return;
        }

        while(this.rowContainer.firstChild) {
            this.rowContainer.removeChild(this.rowContainer.firstChild);
        }

        this.rows.forEach(function(row, key) {
            row.stepInput.deleteEvent();
            row.valueInput.deleteEvent();
        });

        this.rows = {};

        this.timetable.forEach(function(timeValue, timeStep) {
            this.addTimeRow(timeStep, timeValue);
            this.node.timeTable[timeStep] = timeValue;
        }, this);

        this.loadedModel.refresh = true;
        this.loadedModel.propagate();
    },

    destroyTimeTable: function() {
        if(!this.rowContainer) {
            return;
        }

        while(this.rowContainer.firstChild) {
            this.rowContainer.removeChild(this.rowContainer.firstChild);
        }

        this.rows.forEach(function(row, key) {
            row.stepInput.deleteEvent();
            row.valueInput.deleteEvent();
        });

        this.rows = {};
    },

    generateTimeTable: function() {
        var containerDiv = this.timetableDiv;
        if(!containerDiv) {
            var containerDiv = menuBuilder.div();
                containerDiv.className = "time-table";

            containerDiv.appendChild(menuBuilder.label(this.header || 'TimeTable'));

            this.timetableDiv = containerDiv;
        } else {
            while(this.timetableDiv.firstChild) {
                this.timetableDiv.removeChild(this.timetableDiv.firstChild);
            }

            this.timetableDiv.appendChild(menuBuilder.label(this.header || 'TimeTable'));

            this.rows.forEach(function(row, key) {
                row.stepInput.deleteEvent();
                row.valueInput.deleteEvent();
            });

            this.rows = {};
            this.rowContainer = null;
        }

        var rowContainer = this.rowContainer;
        if(!rowContainer) {
            rowContainer      = menuBuilder.div("row-container");
            this.rowContainer = rowContainer;

            containerDiv.appendChild(rowContainer);
        }

        this.node.timeTable = {};
        this.timetable.forEach(function(timeValue, timeStep) {
            this.addTimeRow(timeStep, timeValue);
        }, this);

        var that = this;
        containerDiv.appendChild(menuBuilder.button('Add row', function addTimeTableRow() {
            if (that.timetable === undefined || that.timetable === null) {
                that.addTimeRow(0, 0);
            } else {
                var highestIndex = 0;
                that.timetable.forEach(function(value, key) {
                    var x;
                    if(!isNaN(x = parseInt(key)) && x > highestIndex) {
                        highestIndex = x;
                    }
                });

                var index = highestIndex + 1;
                var value = 0;
                that.timetable[index] = value;
                that.addTimeRow(index, value);

                that.loadedModel.refresh = true;
                that.loadedModel.propagate();
            }
        }));

        containerDiv.appendChild(menuBuilder.button('Remove row', function removeTimeTableRow() {
            that.removeTimeRow();
        }));

        return containerDiv;
    }
};

function Scenario(loadedModel, node) {
    this.container    = menuBuilder.div("scenario");
    this.name         = "New scenario";
    this.data         = {};

    this.changedTables = {};

    this.loadedModel = loadedModel;
    //this.generateScenarioContainer();
}

Scenario.prototype = {
    setName: function(name) {
        this.name = name;
    },

    refresh: function() {
        this.generateScenarioContainer();
    },

    setNodes: function() {
        this.loadedModel.nodeData.forEach(function(data) {
            console.log(data);
        });
    },

    generateScenarioContainer: function() {
        while(this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }

        this.loadedModel.nodeData.forEach(function(node) {
            if(!node.timeTable) {
                return;
            }

            var data = this.data[node.id];
            if(!data) {
                data = new TimeTable(this.loadedModel, node);
                this.data[node.id] = data;
            }
            
            this.container.appendChild(data.generateTimeTable());
        }, this);

        this.loadedModel.refresh = true;
        this.loadedModel.propagate();
    }
};

function ScenarioEditor(loadedModel) {
    this.loadedModel     = loadedModel;
    this.floatingWindow  = new FloatingWindow(20, 20, 440, 400, "scenario-editor");
    this.container       = this.floatingWindow.container;
    this.body            = this.floatingWindow.body;
    this.scenarios       = loadedModel.scenarios;
    this.currentScenario = undefined;

    this.options              = menuBuilder.div("options");
    this.options.style.height = "40px";

    this.scenarioContainer = menuBuilder.div('table-container');
    this.scenarioContainer.style.height = "360px";

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
    },

    createWindow: function() {
        this.floatingWindow.createWindow();
        this.container = this.floatingWindow.container;
        this.body      = this.floatingWindow.body;
    },

    generateOptions: function() {
        var that = this;
        this.scenarioDropdown = menuBuilder.select("text", function() {
            var value = parseInt(this.value);
            console.log(value, that.scenarios);
            if(!that.scenarios[value]) {
                return;
            }

            console.log(value, that.scenarios[value]);

            that.setScenario(that.scenarios[value]);
            that.scenarios[value].refresh();
        });

        this.deleteScenario   = menuBuilder.button("Delete scenario", function() {

        });

        this.newScenario = menuBuilder.button("New scenario",    function() {
                var scenario = new Scenario(that.loadedModel);
                scenario.setName(that.scenarios.size() + ": New scenario");
                that.setScenario(scenario);
                that.scenarios.push(scenario);
                scenario.refresh();

                var option = menuBuilder.option(that.loadedModel.scenarios.length - 1, scenario.name);
                that.scenarioDropdown.appendChild(option);

                that.scenarioDropdown.options[that.scenarioDropdown.options.length - 1].selected = true;
            });

        this.scenarioDropdown.className = "scenario-select";
        this.deleteScenario.className   = "scenario-delete";
        this.newScenario.className      = "scenario-new";

        this.options.appendChild(this.scenarioDropdown);
        this.options.appendChild(this.deleteScenario);
        this.options.appendChild(this.newScenario);

        this.loadedModel.scenarios.forEach(function(scenario, index) {
            var option = menuBuilder.option(index, scenario.name);
            this.scenarioDropdown.appendChild(option);
        }, this);

        if(this.loadedModel.scenarios.length === 0) {
            var scenario = new Scenario(this.loadedModel);
            scenario.setName(this.scenarios.size() + ": New scenario");

            this.setScenario(scenario);
            this.scenarios.push(scenario);

            var option = menuBuilder.option(that.loadedModel.scenarios.length - 1, scenario.name);
            this.scenarioDropdown.appendChild(option);
        } else {
            this.setScenario(this.loadedModel.scenarios[0]);
            this.loadedModel.scenarios[0].refresh();
        }
    },

    setScenario: function(scenario) {
        this.currentScenario = scenario;
        //scenario.generateScenarioContainer();
        while(this.scenarioContainer.firstChild) {
            this.scenarioContainer.removeChild(this.scenarioContainer.firstChild);
        }

        this.scenarioContainer.appendChild(this.currentScenario.container);
    },

    refresh: function() {
        /*this.scenarios.forEach(function(scenario) {
            scenario.refresh();
        });*/
        this.currentScenario.refresh();
    }
};

module.exports = {
    ScenarioEditor: ScenarioEditor,
    Scenario:       Scenario
};