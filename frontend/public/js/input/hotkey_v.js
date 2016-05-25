'use strict';

module.exports = {
    keyCode: 86,
    global:  true,
    onDown:  function(canvas, model, evt) {
        if(model.static.modifiers.indexOf(18) === -1) {
            return;
        }
        
        evt.preventDefault();
    },

    onUp: function(canvas, model, evt) {
        if(model.static.modifiers.indexOf(18) === -1) {
            return;
        }

        model.emit('invertSidebar');
        evt.preventDefault();
    }
};
