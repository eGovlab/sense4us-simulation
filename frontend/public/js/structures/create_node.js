'use strict';

module.exports = function createNode(model, data, gui, type) {
    var id = model.nextId;
    model.nextId = id + 1;

    var nodeData = {
        id:              id,
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
        x:      200,
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

    console.log("THE NEW NODE:", nodeData);

    return model;
};
