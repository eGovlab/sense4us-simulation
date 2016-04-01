var FloatingWindow = require('./../floating_window/floating_window.js'),
    menuBuilder    = require('./../menu_builder');

var objectHelper = require('./../object-helper.js');

var timeTableId = -1;
function TimeTable(node, onChange) {
    timeTableId++;
    this.id     = timeTableId;
    this.syncId = false;

    this.node   = node;
    this.data   = objectHelper.copy.call(node);

    this.data.id = timeTableId;

    this.node.timeTable = this.data.timeTable;

    this.header   = node.name;
    this.onChange = onChange;

    this.container = menuBuilder.div('menu');

    this.timeTable = this.data.timeTable;

    this.timeTableDiv;
    this.rowContainer;
    this.rows = {};

    this.dropdowns  = {};
    this.inputs     = {};
}

TimeTable.prototype = {
    setTimeStep: function(timeStepInput, timeStep, newStep) {
        var storingValue = this.timeTable[timeStep];
        if(this.timeTable[newStep]) {
            return timeStepInput.value = timeStep;
        }

        this.timeTable[newStep] = this.timeTable[timeStep];
        delete this.timeTable[timeStep];

        this.node.timeTable[newStep] = this.node.timeTable[timeStep];
        delete this.node.timeTable[timeStep];

        this.rows[newStep] = this.rows[timeStep];
        delete this.rows[timeStep];

        timeStepInput.value = newStep;

        this.refreshTimeTable();

        this.onChange();
    },
    
    setTimeValue: function(timeValueInput, timeStep, newValue) {
        newValue = Number(newValue);
        this.timeTable[timeStep] = newValue;
        timeValueInput.value     = newValue;

        this.node.timeTable[timeStep] = newValue;

        this.onChange();
    },

    addTimeRow: function(timeStep, timeValue) {
        if(!this.timeTable) {
            this.timeTable = {};
        }

        var containerDiv = this.timeTableDiv;
        if(!containerDiv) {
            var containerDiv = menuBuilder.div();
                containerDiv.className = "mb-time-table";

            containerDiv.appendChild(menuBuilder.label(key));

            this.timeTableDiv = containerDiv;
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

        timeStepInput.className = "mb-time-step";

        var timeValueLabel = menuBuilder.span("V");
        timeValueLabel.className = "label";

        var timeValueInput = menuBuilder.input("time-value", timeValue, function(input, newValue) {
            that.setTimeValue(timeValueInput, timeStep, newValue);
        });

        timeValueInput.className = "mb-time-value";

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
        if (this.timeTable === undefined || this.timeTable === null || this.timeTable.size() === 0) {
            return;
        } else {
            this.timeTable = this.timeTable.slice(0, -1);
        }

        var element = this.rows.last();
        this.rowContainer.removeChild(element);

        delete this.rows[this.rows.lastKey()];

        this.node.timeTable = this.node.timeTable.slice(0, -1);

        this.onChange();
    },

    refreshTimeTable: function() {
        if(!this.rowContainer) {
            return;
        }

        while(this.rowContainer.firstChild) {
            this.rowContainer.removeChild(this.rowContainer.firstChild);
        }

        this.rows.forEach(function(row, key) {
            row.stepInput.deleteEvents();
            row.valueInput.deleteEvents();
        });

        this.rows = {};

        this.timeTable.forEach(function(timeValue, timeStep) {
            this.addTimeRow(timeStep, timeValue);
            this.node.timeTable[timeStep] = timeValue;
        }, this);
    },

    destroyTimeTable: function() {
        if(!this.rowContainer) {
            return;
        }

        while(this.rowContainer.firstChild) {
            this.rowContainer.removeChild(this.rowContainer.firstChild);
        }

        this.rows.forEach(function(row, key) {
            row.stepInput.deleteEvents();
            row.valueInput.deleteEvents();
        });

        this.rows = {};
    },

    generateTimeTable: function() {
        var containerDiv = this.timeTableDiv;
        if(!containerDiv) {
            var containerDiv = menuBuilder.div();
                containerDiv.className = "mb-time-table";

            containerDiv.appendChild(menuBuilder.label(this.node.name || 'TimeTable'));

            this.timeTableDiv = containerDiv;
        } else {
            while(this.timeTableDiv.firstChild) {
                this.timeTableDiv.removeChild(this.timeTableDiv.firstChild);
            }

            this.timeTableDiv.appendChild(menuBuilder.label(this.node.name || 'TimeTable'));

            this.rows.forEach(function(row, key) {
                row.stepInput.deleteEvents();
                row.valueInput.deleteEvents();
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

        if(!this.timeTable) {
            this.timeTable = {};
        }

        this.node.timeTable = this.timeTable;
        objectHelper.forEach.call(
            this.timeTable,
            function(timeValue, timeStep) {
                this.addTimeRow(timeStep, timeValue);
            },
            this
        );

        var that = this;
        containerDiv.appendChild(menuBuilder.button('Add row', function addTimeTableRow() {
            if (that.timeTable === undefined || that.timeTable === null) {
                that.addTimeRow(0, 0);
            } else {
                var highestIndex = 0;
                objectHelper.forEach.call(
                    that.timeTable,
                    function(value, key) {
                        var x;
                        if(!isNaN(x = parseInt(key)) && x > highestIndex) {
                            highestIndex = x;
                        }
                    }
                );

                var index = highestIndex + 1;
                var value = 0;
                that.timeTable[index] = value;
                that.addTimeRow(index, value);

                that.onChange();
            }
        }));

        containerDiv.appendChild(menuBuilder.button('Remove row', function removeTimeTableRow() {
            that.removeTimeRow();
        }));

        return containerDiv;
    }
};

function Scenario(loadedModel, syncId) {
    this.id     = loadedModel.generateId();
    this.syncId = syncId;

    this.container    = menuBuilder.div("scenario");
    this.name         = "New scenario";
    this.data         = {};

    this.measurement         = "Week";
    this.measurementAmount   = 1;
    this.maxIterations       = 4;
    this.timeStepN           = 0;

    this.changedTables = {};
}

Scenario.prototype = {
    setName: function(name) {
        this.name = name;

        return this;
    },

    refresh: function(loadedModel) {
        this.generateScenarioContainer(loadedModel);

        return this;
    },

    setNodes: function() {
        /*this.loadedModel.nodeData.forEach(function(data) {
            console.log(data);
        });*/

        return this;
    },

    toJson: function(loadedModel) {
        return {
            id:                this.id,
            syncId:            this.syncId,
            name:              this.name,
            maxIterations:     this.maxIterations,
            measurement:       this.measurement,
            measurementAmount: this.measurementAmount,
            timeStepN:         this.timeStepN,
            tables: this.data.map(function(timeTable) {
                return {
                    id:                timeTable.id,
                    syncId:            timeTable.syncId,
                    timetable:         timeTable.timeTable
                };
            })
        };
    },

    generateScenarioContainer: function(loadedModel) {
        while(this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }

        objectHelper.forEach.call(
            loadedModel.nodeData,
            function(node) {
                if(node.type !== "origin") {
                    return;
                }

                var data = this.data[node.id];
                if(!data) {
                    data = new TimeTable(node, function() {
                        loadedModel.refresh = true;
                        loadedModel.resetUI = true;
                        loadedModel.propagate();
                    });
                    this.data[node.id] = data;
                }
                
                this.container.appendChild(data.generateTimeTable());
            },
            this
        );

        loadedModel.refresh = true;
        loadedModel.propagate();

        return this;
    }
};

function ScenarioEditor(loadedModel) {
    this.loadedModel     = loadedModel;
    this.floatingWindow  = new FloatingWindow(20, 20, 440, 400, "mb-scenario-editor");
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

    this.options              = menuBuilder.div("options");
    this.options.style.height = "40px";

    this.selectedIndex = 0;

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

        this.options              = menuBuilder.div("options");
        this.options.style.height = "40px";

        this.scenarioContainer = menuBuilder.div('table-container');
        this.scenarioContainer.style.height = "360px";

        this.body.appendChild(this.options);
        this.body.appendChild(this.scenarioContainer);
        this.generateOptions();

        document.body.appendChild(this.container);
    },

    generateOptions: function() {
        var that = this;
        this.scenarioDropdown = menuBuilder.select("text", function() {
            var value = parseInt(this.value);
            if(!that.scenarios[value]) {
                return;
            }

            that.setScenario(that.scenarios[value]);
            //that.scenarios[value].refresh(that.loadedModel);
            that.selectedIndex = value;

            that.loadedModel.resetUI = true;
            that.loadedModel.propagate();
        });

        this.deleteScenario   = menuBuilder.button("Delete scenario", function() {

        });

        this.newScenario = menuBuilder.button("New scenario", function() {
            var scenario = new Scenario(that.loadedModel);
            scenario.setName(that.scenarios.size() + ": New scenario");
            that.setScenario(scenario);
            that.scenarios[scenario.id] = scenario;
            //scenario.refresh(that.loadedModel);

            var option = menuBuilder.option(scenario.id, scenario.name);
            that.scenarioDropdown.appendChild(option);

            var index = that.scenarioDropdown.options.length - 1;
            that.scenarioDropdown.options[index].selected = true;
            that.selectedIndex = index;

            that.loadedModel.resetUI = true;
            that.loadedModel.propagate();
        });

        this.scenarioDropdown.className = "scenario-select";
        this.deleteScenario.className   = "scenario-delete";
        this.newScenario.className      = "scenario-new";

        this.options.appendChild(this.scenarioDropdown);
        this.options.appendChild(this.deleteScenario);
        this.options.appendChild(this.newScenario);

        this.loadedModel.scenarios.forEach(function(scenario) {
            var option = menuBuilder.option(scenario.id, scenario.name);
            if(scenario.id === this.currentScenario) {
                option.selected = true;
            }

            this.scenarioDropdown.appendChild(option);
        }, this);

        if(this.loadedModel.scenarios.length === 0) {
            var scenario = new Scenario(this.loadedModel);
            scenario.setName(this.scenarios.size() + ": New scenario");

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

module.exports = {
    ScenarioEditor: ScenarioEditor,
    Scenario:       Scenario,
    TimeTable:      TimeTable
};