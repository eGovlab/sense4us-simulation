'use strict';

var objectHelper = require('./../object-helper.js');

module.exports = function createNode(model, data, gui, type) {
    var id = model.generateId();

    var nodeData = {
        id:              id,
        syncId:          false,
        value:           0,
        simulateChange:  [],
        type:            type || 'intermediate',
        initialValue:    0,
        measurementUnit: '',
        description:     '',

        objectId: 'nodeData'
    };

    var nodeGui = {
        id:       id,
        x:        400,
        y:        100,
        radius:   45,

        objectId: 'nodeGui'
    };

    if(data !== undefined) {
        nodeData = objectHelper.merge.call(nodeData, data);
    }

    if(gui !== undefined) {
        nodeGui = objectHelper.merge.call(nodeGui, gui);
    }

    model.nodeData[id] = nodeData;
    model.nodeGui[id]  = nodeGui;

    if(nodeData.timeTable) {
        objectHelper.forEach.call(
            model.scenarios,
            function(scenario) {
                scenario.refresh(model);
            }
        );
    }

    model.resetUI = true;
    model.refresh = true;
    model.propagate();

    model.emit(null, 'resetUI', 'refresh');

    return model;
};
