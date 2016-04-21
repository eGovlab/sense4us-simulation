'use strict';

var arithmetics = require('../canvas/arithmetics.js');

module.exports = function(canvas, loadedModel, inputs) {
    var active = false;

    var startPos = {x: 0, y: 0},
        endPos   = {x: 0, y: 0},
        lastPos  = {x: 0, y: 0};

    var deltaPos = {x: 0, y: 0};

    var stopContextMenu = function(evt) {
        evt.preventDefault();
        evt.stopPropagation();
        return false;
    };

    canvas.addEventListener('contextmenu', stopContextMenu);
    var mouseDown = function(event) {
        var button = event.button;
        active     = true;

        startPos   = arithmetics.mouseToCanvas({x: event.pageX, y: event.pageY}, canvas);
        lastPos    = {x: startPos.x, y: startPos.y};

        loadedModel.didDrag = false;

        loadedModel.emit([canvas, button, startPos, lastPos, mouseMove, mouseUp], 'mouseDown');
    };

    canvas.addEventListener('mousedown', mouseDown);

    var mouseMove = function(event) {
        var button = event.button;

        active = true;

        endPos = arithmetics.mouseToCanvas({x: event.pageX, y: event.pageY}, canvas);

        deltaPos.x = lastPos.x - endPos.x;
        deltaPos.y = lastPos.y - endPos.y;

        startPos.x = endPos.x;
        startPos.y = endPos.y;

        loadedModel.didDrag = true;

        lastPos = {x: endPos.x, y: endPos.y};

        loadedModel.emit([canvas, button, startPos, lastPos, endPos, deltaPos], 'mouseMove');
    };

    var mouseUp = function(event) {
        var button = event.button;

        active = false;

        endPos = arithmetics.mouseToCanvas({x: event.pageX, y: event.pageY}, canvas);

        window.removeEventListener('mousemove', mouseMove);
        window.removeEventListener('mouseup',   mouseUp);

        loadedModel.emit([canvas, button, endPos], 'mouseUp');
    };
};
