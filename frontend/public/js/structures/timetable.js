'use strict';

var menuBuilder  = require('./../menu_builder');
var objectHelper = require('./../object-helper.js');

var timeTableId = -1;
function TimeTable(node, onChange, reference, loadedModel) {
    this.id             = ++timeTableId;
    this.syncId         = false;

    this.node           = node;

    if(reference) {
        this.data = reference;
    } else {
        this.data = objectHelper.copy.call(node);
    }

    this.data.id        = timeTableId;

    this.node.timeTable = this.data.timeTable;

    this.header         = node.name;
    this.onChange       = onChange;

    this.container      = menuBuilder.div('menu');

    this.timeTable      = this.data.timeTable;

    this.timeTableDiv;
    this.rowContainer;
    this.rows           = {};

    this.dropdowns      = {};
    this.inputs         = {};
}

TimeTable.prototype = {
    setTimeStep: function(timeStepInput, timeStep, newStep) {
        if(this.timeTable[newStep] !== undefined) {
            return timeStepInput.value = timeStep;
        }

        this.timeTable[newStep] = this.timeTable[timeStep];
        delete this.timeTable[timeStep];

        this.rows[newStep] = this.rows[timeStep];
        delete this.rows[timeStep];

        timeStepInput.value = newStep;

        this.refreshTimeTable();

        this.onChange(newStep, this.timeTable[newStep]);
    },
    
    setTimeValue: function(timeValueInput, timeStep, newValue) {
        newValue = Number(newValue);
        if(isNaN(newValue)) {
            timeValueInput.value = this.timeTable[timeStep];
            return;
        }

        this.timeTable[timeStep] = newValue;
        timeValueInput.value     = newValue;

        this.node.timeTable[timeStep] = newValue;

        this.onChange(timeStep, newValue);
    },

    addTimeRow: function(timeStep, timeValue) {
        if(!this.timeTable) {
            this.timeTable = {};
        }

        var containerDiv = this.timeTableDiv;
        if(!containerDiv) {
            var containerDiv = menuBuilder.div();
                containerDiv.className = 'mb-time-table';

            containerDiv.appendChild(menuBuilder.label(key));

            this.timeTableDiv = containerDiv;
        }

        var rowContainer = this.rowContainer;
        if(!rowContainer) {
            rowContainer      = menuBuilder.div('row-container');
            this.rowContainer = rowContainer;

            containerDiv.appendChild(rowContainer);
        }

        var that = this;

        var rowDiv = menuBuilder.div('time-row');
        this.rows[timeStep] = rowDiv;

        var timeStepLabel       = menuBuilder.span('T');
        timeStepLabel.className = 'time-label';

        var timeStepInput = menuBuilder.input('time-step', timeStep, function(input, newStep) {
            that.setTimeStep(timeStepInput, timeStep, newStep);
        });

        timeStepInput.className = 'time-step';

        var timeValueLabel = menuBuilder.span('C');
        timeValueLabel.className = 'time-label';

        var timeValueInput = menuBuilder.input('time-value', timeValue, function(input, newValue) {
            that.setTimeValue(timeValueInput, timeStep, newValue);
        });

        timeValueInput.className = 'time-value';

        rowDiv.appendChild(timeStepLabel);
        rowDiv.appendChild(timeStepInput);
        rowDiv.appendChild(timeValueLabel);
        rowDiv.appendChild(timeValueInput);

        var percentLabel = menuBuilder.span('%');
        percentLabel.className = 'time-label';

        rowDiv.appendChild(percentLabel);

        rowDiv.stepInput  = timeStepInput;
        rowDiv.valueInput = timeValueInput;

        rowContainer.appendChild(rowDiv);

        this.node.timeTable[timeStep] = timeValue;
    },

    removeTimeRow: function() {
        var size = objectHelper.size.call(this.timeTable);
        if (this.timeTable === undefined || this.timeTable === null || size === 0) {
            return;
        }
        
        var iter = 0;
        var lastKey = objectHelper.lastKey.call(this.timeTable);
        delete this.timeTable[lastKey];

        var element = objectHelper.last.call(this.rows);
        this.rowContainer.removeChild(element);

        delete this.rows[objectHelper.lastKey.call(this.rows)];

        //this.node.timeTable = objectHelper.slice.call(this.node.timeTable, 0, -1);

        this.onChange();
    },

    refreshTimeTable: function() {
        if(!this.rowContainer) {
            return;
        }

        while(this.rowContainer.firstChild) {
            this.rowContainer.removeChild(this.rowContainer.firstChild);
        }

        objectHelper.forEach.call(this.rows, function(row, key) {
            row.stepInput.deleteEvents();
            row.valueInput.deleteEvents();
        });

        this.rows = {};
        objectHelper.forEach.call(this.timeTable, function(timeValue, timeStep) {
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

        objectHelper.forEach.call(this.rows, function(row, key) {
            row.stepInput.deleteEvents();
            row.valueInput.deleteEvents();
        });

        this.rows = {};
    },

    generateTimeTable: function() {
        var containerDiv = this.timeTableDiv;
        if(!containerDiv) {
            var containerDiv = menuBuilder.div();
                containerDiv.className = 'mb-time-table';

            containerDiv.appendChild(menuBuilder.label(this.node.name || 'TimeTable'));

            this.timeTableDiv = containerDiv;
        } else {
            while(this.timeTableDiv.firstChild) {
                this.timeTableDiv.removeChild(this.timeTableDiv.firstChild);
            }

            this.timeTableDiv.appendChild(menuBuilder.label(this.node.name || 'TimeTable'));

            objectHelper.forEach.call(
                this.rows,
                function(row, key) {
                    row.stepInput.deleteEvents();
                    row.valueInput.deleteEvents();
                }
            );

            this.rows = {};
            this.rowContainer = null;
        }

        var rowContainer = this.rowContainer;
        if(!rowContainer) {
            rowContainer      = menuBuilder.div('row-container');
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
                var highestIndex = -1;
                objectHelper.forEach.call(
                    that.timeTable,
                    function(value, key) {
                        var x;
                        if(!isNaN(x = parseInt(key)) && x > highestIndex) {
                            highestIndex = x;
                        }
                    }
                );

                var index = highestIndex === -1 ? 0 : highestIndex + 1;
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

module.exports = TimeTable;
