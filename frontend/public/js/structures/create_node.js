'use strict';

var Immutable = require('Immutable');

module.exports = function createNode(model, data, gui, type) {
    var id = model.get('nextId');
    model = model.set('nextId', id + 1);

    var nodeData = Immutable.Map({
        id:              id,
        value:           0,
        relativeChange:  0,
        simulateChange:  Immutable.List(),
        type:            type || 'intermediate',
        initialValue:    0,
        measurementUnit: "",
        description:     ''
    });

    var nodeGui = Immutable.Map({
        id:     id,
        x:      200,
        y:      100,
        radius: 45
    });

    if(data !== undefined) {
        nodeData = nodeData.merge(data);
    }

    if(gui !== undefined) {
        nodeGui = nodeGui.merge(gui);
    }

    model = model.set('nodeData', model.get('nodeData').set(id, nodeData));
    model = model.set('nodeGui', model.get('nodeGui').set(id, nodeGui));

    return model;
};
