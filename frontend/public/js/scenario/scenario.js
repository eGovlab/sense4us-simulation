'use strict';

var FloatingWindow = require('./../floating_window/floating_window.js'),
    menuBuilder    = require('./../menu_builder');

var objectHelper   = require('./../object-helper.js');
var TimeTable      = require('./../structures/timetable.js');

function Scenario(loadedModel, syncId) {
    this.id     = loadedModel.generateId();
    this.syncId = syncId;

    this.container    = menuBuilder.div('mb-scenario');
    this.name         = 'New scenario';
    this.data         = {};

    this.measurement         = 'Week';
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
            tables: objectHelper.map.call(
                this.data,
                function(timeTable) {
                    return {
                        id:        timeTable.id,
                        syncId:    timeTable.syncId,
                        timetable: timeTable.timeTable
                    };
                }
            )
        };
    },

    generateScenarioContainer: function(loadedModel) {
        while(this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }

        objectHelper.forEach.call(
            loadedModel.nodeData,
            function(node) {
                if(node.type !== 'origin') {
                    return;
                }

                var data = this.data[node.id];
                if(!data) {
                    data = new TimeTable(node, function() {
                        /*loadedModel.refresh = true;
                        loadedModel.resetUI = true;
                        loadedModel.propagate();*/
                        loadedModel.emit(null, 'refresh', 'resetUI');
                    });
                    
                    this.data[node.id] = data;
                }
                
                this.container.appendChild(data.generateTimeTable());
            },
            this
        );

        /*loadedModel.refresh = true;
        loadedModel.propagate();*/

        loadedModel.emit('refresh');

        return this;
    }
};

module.exports = Scenario;