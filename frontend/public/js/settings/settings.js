'use strict';

var Immutable = require('Immutable'),
    model     = require('./model.js'),
    simulate  = require('./simulate.js'),
    menu      = require('./menu.js');

var data = {
    sidebar: model,
    menu:    menu
};

module.exports = data;