'use strict';

var Popup = require('./popup.js');

module.exports = {
    notify: function(container, text, delay) {
        if (container === null) {
            return false;
        }

        var popup = new Popup(text);
        container.appendChild(popup.element);
        setTimeout(function() {
            popup.fadeOut(function() {
                container.removeChild(popup.element);
            });
        }, delay || 4000);
    }
};