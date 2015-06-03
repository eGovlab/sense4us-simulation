'use strict';

var Immutable = require('Immutable'),
    model     = require('./model.js'),
    simulate  = require('./simulate.js'),
    menu      = require('./menu.js');

var avatars = [
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
];

var data = {
    sidebar: model,
    menu:    menu
};

module.exports = data;
