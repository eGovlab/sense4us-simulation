'use strict';

var mleftDrag     = require('./../../input/mleft_drag.js'),
    mrightDrag    = require('./../../input/mright_drag.js');

var mouseMiddlewares = [
    mleftDrag,
    mrightDrag
];

function addMouseUpListener(loadedModel) {
    loadedModel.addListener('mouseUp', function(canvas, button, endPos) {
        var middlewares = mouseMiddlewares.filter(function(input) {
            return input.button === button;
        });

        middlewares.forEach(function(middleware) {
            middleware.mouseUp(canvas, loadedModel, endPos);
        });

        this.emit('refresh');
    });
}

module.exports = addMouseUpListener;
