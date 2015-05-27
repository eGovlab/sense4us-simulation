'use strict';

var Immutable = require('Immutable');

var simulate = Immutable.List([
    Immutable.Map( {
        header: "Simulate",
        callback: function(modelData) {
            console.log("Simulate.");

            return modelData;
        }
    })
]);

module.exports = simulate;