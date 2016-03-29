'use strict';

module.exports = function createNode(model, data, gui, type) {
    var id = model.generateId();

    var nodeData = {
        id:              id,
        syncId:          false,
        value:           0,
        relativeChange:  0,
        simulateChange:  [],
        type:            type || 'intermediate',
        initialValue:    0,
        measurementUnit: "",
        description:     ''
    };

    var nodeGui = {
        id:     id,
        x:      400,
        y:      100,
        radius: 45
    };

    if(data !== undefined) {
        nodeData = nodeData.merge(data);
    }

    if(gui !== undefined) {
        nodeGui = nodeGui.merge(gui);
    }

    model.nodeData[id] = nodeData;
    model.nodeGui[id]  = nodeGui;

    if(nodeData.timeTable) {
        model.scenarios.forEach(function(scenario) {
            scenario.refresh(model);
        });
    }

    model.resetUI = true;
    model.refresh = true;
    model.propagate();

    return model;
};
