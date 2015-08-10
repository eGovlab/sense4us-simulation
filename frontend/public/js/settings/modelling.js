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