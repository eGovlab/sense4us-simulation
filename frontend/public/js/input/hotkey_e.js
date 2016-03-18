"use strict";

var arithmetics = require('../canvas/arithmetics.js'),
    hitTest     = require('./../collisions.js').hitTest,
    linker      = require('./../linker.js'),
    createLink  = require('../structures/create_link');

module.exports = {
    keyCode: 69,
    onDown:  function(canvas, model) {
        if(document.body.removeHotkeyEListeners) {
            document.body.removeHotkeyEListeners();
        }
        
        var selected = model.selected;
        if(!selected || selected.x === undefined || selected.y === undefined) {
            return;
        }

        model.nodeGui[selected.id].linking = true;

        var mouseMove = function(evt) {
            var pos = arithmetics.mouseToCanvas({x: evt.clientX, y: evt.clientY}, canvas);
            model.nodeGui[selected.id].linkerX = pos.x;
            model.nodeGui[selected.id].linkerY = pos.y;

            model.refresh = true;
            model.propagate();
        };

        var mouseUp = function() {
            document.body.removeHotkeyEListeners();
        };

        document.body.removeHotkeyEListeners = function() {
            document.body.removeEventListener("mousemove", mouseMove);
            document.body.removeEventListener("mouseup",   mouseUp);

            delete document.body.removeHotkeyEListeners;
        };

        document.body.addEventListener("mousemove", mouseMove);
        document.body.addEventListener("mouseup",   mouseUp);
    },

    onUp: function(canvas, model) {

    }
};