'use strict';

var Immutable = null;

module.exports = [
    {
        header: 'Delete selected',
        ignoreModelSettings: true,
        replacingObj:        true,
        callback: function(object) {
            return object.set('delete', true);
        }
    }
];