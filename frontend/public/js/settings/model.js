'use strict';

var Immutable = require('Immutable');

var model = Immutable.List([
    Immutable.Map( {
        header: "Create node",
        callback: function(modelData) {
            console.log("Create node.");

            return modelData;
        }
    })
]);

module.exports = model;