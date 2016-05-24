'use strict';

var CONFIG = require("rh_config-parser");

var protocol = CONFIG.get("SENSE4US", "tool", "protocol"),
    hostname = CONFIG.get("SENSE4US", "tool", "hostname"),
    port     = CONFIG.get("SENSE4US", "tool", "port");

function root(req, res, next) {
    res.render("main", {locals: {
        protocol: protocol,
        hostname: hostname,
        port:     port
    }});
}

function wizard(req, res, next) {
    res.render("wizard");
}

function sidebarTesting(req, res, next) {
    res.render("sidebar/index");
}

module.exports = [
    {path: "/",        callback: root,           root: true},
    {path: "/wizard",  callback: wizard,         root: true},
    {path: "/sidebar", callback: sidebarTesting, root: true}
];
