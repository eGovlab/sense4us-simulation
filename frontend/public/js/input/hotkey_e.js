'use strict';

var arithmetics = require('../canvas/arithmetics.js'),
    hitTest     = require('./../collisions.js').hitTest,
    linker      = require('./../linker.js'),
    createLink  = require('../structures/create_link');

module.exports = {
    keyCode: 69,
    onDown:  function(canvas, model, evt) {
        if(canvas.removeHotkeyEListeners) {
            canvas.removeHotkeyEListeners();
        }

        if(document.body !== document.activeElement) {
            return;
        }
        
        var selected = model.selected;
        if(!selected || selected.x === undefined || selected.y === undefined) {
            return;
        }

        model.nodeGui[selected.id].linking = true;

        var mouseMove = function(evt) {
            var pos = arithmetics.mouseToCanvas({x: evt.pageX, y: evt.pageY}, canvas);
            model.nodeGui[selected.id].linkerX = pos.x;
            model.nodeGui[selected.id].linkerY = pos.y;

            /*model.refresh = true;
            model.propagate();*/
            model.emit('refresh');
        };

        var mouseUp = function() {
            canvas.removeHotkeyEListeners();
        };

        canvas.removeHotkeyEListeners = function() {
            canvas.removeEventListener('mousemove', mouseMove);
            canvas.removeEventListener('mouseup',   mouseUp);

            delete canvas.removeHotkeyEListeners;
        };

        canvas.addEventListener('mousemove', mouseMove);
        canvas.addEventListener('mouseup',   mouseUp);
    },

    onUp: function(canvas, model, evt) {

    }
};