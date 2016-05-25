'use strict';

module.exports = {
    keyCode: 86,
    onDown:  function(canvas, model) {
    },

    onUp: function(canvas, model) {
        model.emit('invertSidebar');
    }
};
