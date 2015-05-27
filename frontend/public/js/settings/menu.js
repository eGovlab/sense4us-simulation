'use strict';

var Immutable = require('Immutable');

var menu = Immutable.List([
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

module.exports = menu;