'use strict';

var middleware = require('./../middleware.js'),
    hitTest    = require('./../collisions.js').hitTest,
    linker     = require('./../linker.js'),
    Immutable  = null,
    modelLayer = require('./../model_layer.js'),
    createLink = require('../structures/create_link');

var mouseDownWare = middleware([
    link,
    //stopClicked,
    stopLinking,
    stopMovingIcon,
    deselect,
    select
]);

/*function stopClicked(data) {
    data.nodeGui = data.nodeGui.merge(
            data.nodeGui.filter(function(obj) { return obj.clicked === true; })
                .map(function(obj) { return obj.delete('clicked').delete('offsetX').delete('offsetY'); })
    );

    return data;
}*/

function link(data) {
    data.nodeGui
        .filter(function(node) { return node.linking === true; })
        .forEach(function(node) {
            var hit = data.nodeGui.filter(function(maybeCollidingNode) {
                return maybeCollidingNode.linking !== true && hitTest(maybeCollidingNode, linker(node));
            }).slice(-1);

            hit.forEach(function(collided) {
                var id;
                if(data.nextId !== undefined) {
                    id = data.nextId
                    data.nextId += 1;
                } else {
                    id = data.links.size;
                }

                var nodeLinks = node.links;
                if(nodeLinks === undefined) {
                    node.links = [];
                }

                var collidedLinks = collided.links;
                if(collidedLinks === undefined) {
                    collided.links = [];
                }

                var nodeId     = node.id,
                    collidedId = collided.id;

                data.nodeGui[nodeId].links.push(id);
                data.nodeGui[collidedId].links.push(id);

                data.links[id] = createLink(id, nodeId, collidedId);
            });
        });

    return data;
}

function stopLinking(data) {
    data.nodeGui = data.nodeGui.merge(
        data.nodeGui
        .filter(function(node) { return node.linking === true; })
        .map(function(node) {
            delete node.linkerX;
            delete node.linkerY;
            delete node.linking;
            return node;
        })
    );

    return data;
}

function stopMovingIcon(data) {
    data.nodeGui = data.nodeGui.merge(
        data.nodeGui
        .filter(function(node) { return node.movingIcon === true; })
        .map(function(node) {
            return node.delete('movingIcon');
        })
    );

    return data;
}

function deselect(data) {
    data.nodeGui = data.nodeGui.merge(
        data.nodeGui.
            filter(function(node) {
                return node.selected === true && !node.clicked
            }).
            map(function(node)    {
                delete node.selected;
                delete node.offsetX;
                delete node.offsetY;

                return node;
            })
    );

    data.links = data.links.merge(
        data.links.
            filter(function(link) { return link.selected === true && !link.clicked}).
            map(function(link)    {
                delete link.selected;
                delete link.offsetX;
                delete link.offsetY;
                return link;
            })
    );

    return data;
}

function select(data, error, done) {
    var selectedNodes = data.nodeGui.filter(function(node) {
        return node.clicked;
    }).map(function(node) {
        if(node.msSinceClicked !== undefined && node.msSinceClicked + 300 > Date.now()) {
            data.selected = node;
            node.selected = true;
            delete node.msSinceClicked;
            return node;
        } else {
            node.msSinceClicked = Date.now();
            return node;
        }
    });

    var selectedLinks = data.links.filter(function(link) {
        return link.clicked;
    }).map(function(link) {
        if(link.msSinceClicked !== undefined && link.msSinceClicked + 300 > Date.now()) {
            data.selected = link;
            link.selected = true;
            delete link.msSinceClicked;
            return link;
        } else {
            link.msSinceClicked = Date.now();
            return link;
        }
    });

    data.nodeGui = data.nodeGui.merge(selectedNodes);
    data.links = data.links.merge(selectedLinks);

    return data;
}

module.exports = mouseDownWare;