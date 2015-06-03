'use strict';

var Immutable = require('Immutable');

var createNode = function(model, type) {
    var id = model.get('nextId');
    model = model.set('nextId', id + 1);

    var nodeData = Immutable.Map({
        id:             id,
        value:          0,
        relativeChange: 0,
        simulateChange: 0,
        type:           type || 'intermediate',
        description:    ''
    });

    model = model.set('nodeData', model.get('nodeData').set(id, nodeData));

    var nodeGui = Immutable.Map({
        id:     id,
        x:      200,
        y:      100,
        radius: 75
    });

    model = model.set('nodeGui', model.get('nodeGui').set(id, nodeGui));

    return model;
};

var createOriginNode = function(model) {
    return createNode(model, 'origin');
};

var createActorNode = function(model) {
    return createNode(model, 'actor');
};

var model = Immutable.List([
    Immutable.Map( {
        header: "Create Intermediate",
        callback: createNode
    }),

    Immutable.Map( {
        header: "Create Origin",
        callback: createOriginNode
    }),

    Immutable.Map( {
        header: "Create Actor",
        callback: createActorNode
    })
]);

module.exports = model;