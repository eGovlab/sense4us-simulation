'use strict';

var SHIFT = 16,
    CTRL  = 17,
    ALT   = 18,
    ALTGR = 225;

module.exports = {
    keyCode: 89,
    onDown:  function(canvas, model, evt) {
        if(model.static.modifiers.indexOf(CTRL) === -1) {
            return;
        }

        model.revert();
    },

    onUp: function(canvas, model, evt) {

    }
};
