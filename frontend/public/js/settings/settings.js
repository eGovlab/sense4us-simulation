'use strict';

var edit      = require('./edit.js'),
    menu      = require('./menu.js');

var data = {
    avatars: [
        {
            header: 'Policy Instruments',
            type: 'actor',
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
                },
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
        },
        {
            header: 'Controlling actors',
            type: 'origin',
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
                },
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
        }
    ],

    sidebar: edit,
    menu:    menu
};

module.exports = data;
