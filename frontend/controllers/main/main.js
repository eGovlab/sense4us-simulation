"use strict";

var FEController = require("rh_fe-controller");

function Main() {
    this.getRoutes = function() {
        return [
            {path: "/", fp: this.root, root:true}
        ];
    };

    this.root = function(req, res, next) {
        this.render(res, "main");
    }
}

Main.prototype = new FEController();
Main.prototype.constructor = Main;

module.exports = Main;
