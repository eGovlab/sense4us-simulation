'use strict';

var down = require('./mleft_down.js'),
    move = require('./mleft_move.js'),
    up   = require('./mleft_up.js');

module.exports = {
    button:    0,
    mouseDown: down,
    mouseMove: move,
    mouseUp:   up
};