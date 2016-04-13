'use strict';

var notification = require('./../../notification_bar');

function addDefaultNotificationListeners(container, loadedModel) {
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
