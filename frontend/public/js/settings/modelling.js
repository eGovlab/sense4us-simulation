'use strict';

var Immutable = require('Immutable');

var createNode = function(model, type, attrs, gui) {
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

    if (attrs !== undefined) {
        nodeData = nodeData.merge(attrs);
    } else {
        console.log(attrs);
    }

    model = model.set('nodeData', model.get('nodeData').set(id, nodeData));

    var nodeGui = Immutable.Map({
        id:     id,
        x:      200,
        y:      100,
        radius: 75
    });

    if(gui) {
        nodeGui = nodeGui.merge(gui);
    }

    model = model.set('nodeGui', model.get('nodeGui').set(id, nodeGui));

    return model;
};

var createOriginNode = function(model, attrs) {
    attrs = attrs.set('timeTable', Immutable.Map({
        0: 0,
        1: 10,
        2: -4
    }));

    var gui = Immutable.Map({
        tableWidth: 110,
        tableHeight: 72
    });
    
    return createNode(model, 'origin', attrs, gui);
};

var createActorNode = function(model, attrs) {
    return createNode(model, 'actor', attrs);
};

var model = Immutable.List([
/*    Immutable.Map( {
        header: 'Create Intermediate',
        callback: createNode
    }),

    Immutable.Map( {
        header: 'Create Origin',
        callback: createOriginNode
    }),

    Immutable.Map( {
        header: 'Create Actor',
        callback: createActorNode
    }),
*/
    Immutable.Map({
        header: 'Policy Instruments',
        callback: createActorNode,
        images: [
            {
                src: 'img/avatars/barriers_and_forces.png'
            },
            {
                src: 'img/avatars/instrument_financial.png'
            },
            {
                src: 'img/avatars/instrument_regulatory.png'
            },
            {
                src: 'img/avatars/constraints.png'
            },
            {
                src: 'img/avatars/instrument_fiscal.png'
            },
            {
                src: 'img/avatars/social_change.png'
            }
        ]
    }),

    Immutable.Map({
        header: 'Controllable actors',
        callback: createOriginNode,
        images: [
            {
                src: 'img/avatars/instrument_capacitybuilding.png'
            },
            {
                src: 'img/avatars/instrument_informational.png'
            },
            {
                src: 'img/avatars/instrument_cooperation.png'
            },
            {
                src: 'img/avatars/instrument_market.png'
            }
        ]
    })
]);

module.exports = model;