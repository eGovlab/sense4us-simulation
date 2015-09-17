'use strict';

var Immutable        = require('Immutable'),
    createNode       = require('../structures/create_node'),
    createOriginNode = require('../structures/create_origin'),
    createActorNode  = require('../structures/create_actor');

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
        header:   'Independent variables',
        callback: createOriginNode,
        type:     'LIST',
        images: [
            {src: 'img/avatars/instrument_financial.png'},
            {src: 'img/avatars/instrument_fiscal.png'},
            {src: 'img/avatars/instrument_market.png'},
            {src: 'img/avatars/instrument_regulatory.png'},
            {src: 'img/avatars/instrument_informational.png'},
            {src: 'img/avatars/instrument_capacitybuilding.png'},
            {src: 'img/avatars/instrument_cooperation.png'}
        ]
    }),

    Immutable.Map({
        header:   'Uncontrollable sources',
        callback: createOriginNode,
        type:     'LIST',
        images: [
            {src: 'img/avatars/barriers_and_forces.png'},
            {src: 'img/avatars/constraints.png'},
            {src: 'img/avatars/social_change.png'}
        ]
    }),

    Immutable.Map({
        header:   'Dependent variables',
        callback: createNode,
        type:     'LIST',
        images: [
            {src: 'img/avatars/Impact_node1.png'},
            {src: 'img/avatars/Impact_node4.png'},
            {src: 'img/avatars/Impact_node7.png'}
        ]
    })

    /*Immutable.Map({
        header: 'Policy Instruments',
        callback: createActorNode,
        type: 'LIST',
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
        type: 'LIST',
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
    })*/
]);

module.exports = model;