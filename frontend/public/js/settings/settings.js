'use strict';

var Immutable = require('Immutable'),
    model     = require('./model.js'),
    simulate  = require('./model.js'),
    menu      = require('./model.js'),

var model    = Immutable.List([
    Immutable.Map( {
        header: "Create node",
        callback: function(modelData) {
            console.log("Create node.");

            return modelData;
        }
    })
]), simulate = Immutable.List([
    Immutable.Map( {
        header: "Simulate",
        callback: function(modelData) {
            console.log("Simulate.");

            return modelData;
        }
    })
]), menu    = Immutable.List([
    Immutable.Map({
        header: "Project",
        callback: function(UIData) {
            console.log("Project");

            UIData = UIData.merge(Immutable.Map({
                sidebar: simulate
            }));

            return UIData;
        }
    })
]);

var data = {
    sidebar: model,
    menu:    menu
};

module.exports = data;