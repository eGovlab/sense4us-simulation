'use strict';

var Immutable = require('Immutable');

module.exports = Immutable.List([
    Immutable.Map({
        header: 'Delete selected',
        callback: function(loadedModel) {
            console.log('Clicked Delete selected');
            return loadedModel;
        }
    })
]);