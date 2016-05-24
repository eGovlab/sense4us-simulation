'use strict';

var notification = require('./../../notification_bar');

function addDefaultNotificationListeners(container, loadedModel) {
    /**
     * @module model/propagationEvents
     */

    /**
     * @description Send a notification.
     * @event notification
     *
     * @param {string} message - Message to display in the notification tray.
     */
    loadedModel.addListener('notification', function(message) {
        var delay = 4000;
        if(typeof message === 'object') {
            delay   = message.delay;
            message = message.message;
        }

        notification.notify(container, message);
    });
};

module.exports = addDefaultNotificationListeners;
