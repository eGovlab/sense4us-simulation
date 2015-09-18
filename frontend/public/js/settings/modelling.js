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
            {src: 'img/avatars/instrument_financial.png',        header: 'Financial instrument'},
            {src: 'img/avatars/instrument_fiscal.png',           header: 'Fiscal instrument'},
            {src: 'img/avatars/instrument_market.png',           header: 'Market instrument'},
            {src: 'img/avatars/instrument_regulatory.png',       header: 'Regulatory instrument'},
            {src: 'img/avatars/instrument_informational.png',    header: 'Informational instrument'},
            {src: 'img/avatars/instrument_capacitybuilding.png', header: 'Capacity-building instrument'},
            {src: 'img/avatars/instrument_cooperation.png',      header: 'Cooperation instrument'}
        ]
    }),

    Immutable.Map({
        header:   'Uncontrollable sources',
        callback: createOriginNode,
        type:     'LIST',
        images: [
            {src: 'img/avatars/barriers_and_forces.png', header: 'Drivers and barriers'},
            {src: 'img/avatars/constraints.png',         header: 'External factors and constraints'},
            {src: 'img/avatars/social_change.png',       header: 'Social, demographic, and behavioural change'}
        ]
    }),

    Immutable.Map({
        header:   'Dependent variables',
        callback: createNode,
        type:     'LIST',
        images: [
            {src: 'img/avatars/Impact_node1.png',  header: 'Impact of change'},
            {src: 'img/avatars/Impact_node2.png',  header: 'Impact of change'},
            {src: 'img/avatars/Impact_node3.png',  header: 'Impact of change'},
            {src: 'img/avatars/Impact_node4.png',  header: 'Impact of change'},
            {src: 'img/avatars/Impact_node5.png',  header: 'Impact of change'},
            {src: 'img/avatars/Impact_node6.png',  header: 'Impact of change'},
            {src: 'img/avatars/Impact_node7.png',  header: 'Impact of change'},
            {src: 'img/avatars/Impact_node8.png',  header: 'Impact of change'},
            {src: 'img/avatars/Impact_node9.png',  header: 'Impact of change'},
            {src: 'img/avatars/Impact_node10.png', header: 'Impact of change'},
            {src: 'img/avatars/Impact_node11.png', header: 'Impact of change'},
            {src: 'img/avatars/Impact_node12.png', header: 'Impact of change'}
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