'use strict';

function root(req, res, next) {
    res.render("main");
}

module.exports = [
    {path: "/", callback: root, root: true}
];
