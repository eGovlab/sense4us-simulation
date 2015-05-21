'use strict';

var Popup = require('./popup.js');

function NotificationBar() {
    if (!(this instanceof NotificationBar)) {
        throw new Error('Accessing NotificationBar as a generic method.');
    }

    this.container = null;
}

NotificationBar.prototype = {
    setContainer: function(container) {
        this.container = container;
    },

    notify: function(text) {
        if (this.container === null) {
            return false;
        }

        var popup = new Popup(text);
        var that = this;
        this.container.appendChild(popup.element);
        setTimeout(function() {
            popup.fadeOut(function() {
                that.container.removeChild(popup.element);
            });
        }, 4000);
    }
};

module.exports = new NotificationBar();