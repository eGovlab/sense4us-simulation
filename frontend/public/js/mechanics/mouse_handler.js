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

    canvas.addEventListener("contextmenu", stopContextMenu);
    var mouseDown = function(event) {
        var button = event.button;
        var middlewares = inputs.filter(function(input) {
            return input.button === button;
        });

        active = true;

        startPos = arithmetics.mouseToCanvas({x: event.clientX, y: event.clientY}, canvas);
        lastPos = {x: startPos.x, y: startPos.y};

        loadedModel.didDrag = false;

        middlewares.forEach(function(middleware) {
            var startCallback  = middleware.mouseDown,
                updateCallback = middleware.mouseMove,
                endCallback    = middleware.mouseUp,
                missCallback   = middleware.miss;

            var result = startCallback(canvas, loadedModel, startPos);
            if (result) {
                if (updateCallback) {
                    window.addEventListener('mousemove', mouseMove);
                }

                if (endCallback) {
                    window.addEventListener('mouseup', mouseUp);
                }
            } else if (missCallback) {
                missCallback(canvas, loadedModel, startPos);
            }
        });

        loadedModel.propagate();
    };

    canvas.addEventListener('mousedown', mouseDown);

    var mouseMove = function(event) {
        var button = event.button;
        var middlewares = inputs.filter(function(input) {
            return input.button === button;
        });

        active = true;

        endPos = arithmetics.mouseToCanvas({x: event.clientX, y: event.clientY}, canvas);

        deltaPos.x = lastPos.x - endPos.x;
        deltaPos.y = lastPos.y - endPos.y;

        startPos.x = endPos.x;
        startPos.y = endPos.y;

        loadedModel.didDrag = true;

        middlewares.forEach(function(middleware) {
            middleware.mouseMove(canvas, loadedModel, endPos, deltaPos);
        });

        loadedModel.propagate();
        
        lastPos = {x: endPos.x, y: endPos.y};
    };

    var mouseUp = function(event) {
        var button = event.button;
        var middlewares = inputs.filter(function(input) {
            return input.button === button;
        });

        active = false;

        endPos = arithmetics.mouseToCanvas({x: event.clientX, y: event.clientY}, canvas);

        window.removeEventListener('mousemove', mouseMove);
        window.removeEventListener('mouseup', mouseUp);

        middlewares.forEach(function(middleware) {
            middleware.mouseUp(canvas, loadedModel, endPos);
        });
        
        loadedModel.propagate();
    };
};