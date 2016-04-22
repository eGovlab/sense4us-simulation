'use strict';

var mleftDrag     = require('./../../input/mleft_drag.js'),
    mrightDrag    = require('./../../input/mright_drag.js');

var mouseMiddlewares = [
    mleftDrag,
    mrightDrag
];

function addMouseDownListener(loadedModel) {
    loadedModel.addListener('mouseDown', function(canvas, button, startPos, lastPos, mouseMove, mouseUp) {
        var middlewares = mouseMiddlewares.filter(function(input) {
            return input.button === button;
        });

        var activateMouseMove = false,
            activateMouseUp   = false;

        middlewares.forEach(function(middleware) {
            var startCallback  = middleware.mouseDown,
                updateCallback = middleware.mouseMove,
                endCallback    = middleware.mouseUp,
                missCallback   = middleware.miss;

            var result = startCallback(canvas, loadedModel, startPos);
            if (result) {
                if(updateCallback) {
                    activateMouseMove = true;
                }

                if (endCallback) {
                    activateMouseUp = true;
                }
            } else if (missCallback) {
                missCallback(canvas, loadedModel, startPos);
            }
        });

        if(activateMouseMove) {
            window.addEventListener('mousemove', mouseMove);
        }

        if(activateMouseUp) {
            window.addEventListener('mouseup', mouseUp);
        }

        this.emit('refresh');
    });

}

module.exports = addMouseDownListener;