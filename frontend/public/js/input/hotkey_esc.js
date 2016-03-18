"use strict";

var arithmetics = require('../canvas/arithmetics.js'),
    hitTest     = require('./../collisions.js').hitTest,
    linker      = require('./../linker.js'),
    createLink  = require('../structures/create_link');

module.exports = {
    keyCode: 27,
    onDown:  function(canvas, model) {
        var selected = model.selected;
        if(!selected || selected.x === undefined || selected.y === undefined) {
            return;
        }

        if(!model.nodeGui[selected.id].linking) {
            return;
        }

        var node = model.nodeGui[selected.id];
        delete node.linkerX;
        delete node.linkerY;
        delete node.linking;

        document.body.removeHotkeyEListeners();

        model.refresh = true;
        model.propagate();
    },

    onUp: function(canvas, model) {

    }
};
