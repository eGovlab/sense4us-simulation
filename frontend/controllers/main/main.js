'use strict';

function root(req, res, next) {
    res.render("main");
}

function wizard(req, res, next) {
    res.render("wizard");
}

module.exports = [
    {path: "/",       callback: root,   root: true},
    {path: "/wizard", callback: wizard, root: true}
];
