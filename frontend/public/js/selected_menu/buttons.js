'use strict';

var Immutable = null;

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