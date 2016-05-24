'use strict';

var mleftDrag     = require('./../../input/mleft_drag.js'),
    mrightDrag    = require('./../../input/mright_drag.js');

var mouseMiddlewares = [
    mleftDrag,
    mrightDrag
];

function addMouseMoveListener(loadedModel) {
    loadedModel.addListener('mouseMove', function(canvas, button, startPos, lastPos, endPos, deltaPos) {
        var middlewares = mouseMiddlewares.filter(function(input) {
            return input.button === button;
        });

        middlewares.forEach(function(middleware) {
            middleware.mouseMove(canvas, loadedModel, endPos, deltaPos);
        });

        this.emit('refresh');
    });
}

module.exports = addMouseMoveListener;
