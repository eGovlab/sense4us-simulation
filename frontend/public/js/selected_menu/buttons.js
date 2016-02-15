'use strict';

var Immutable = require('Immutable');

module.exports = Immutable.List([
    Immutable.Map({
        header: 'Delete selected',
        ignoreModelSettings: true,
        replacingObj:        true,
        callback: function(object) {
            return object.set('delete', true);
        }
    })
]);