'use strict';

var middleware = require('./../middleware.js'),
    hitTest      = require('./../collisions.js').hitTest,
    linker       = require('./../linker.js'),
    Immutable    = require('Immutable'),
    modelLayer   = require('./../model_layer.js'),
    createLink   = require('../structures/create_link');

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
            data.nodeGui.filter(function(obj) { return obj.get('clicked') === true; })
                .map(function(obj) { return obj.delete('clicked').delete('offsetX').delete('offsetY'); })
    );

    return data;
}*/

function link(data) {
    data.nodeGui
        .filter(function(node) { return node.get('linking') === true; })
        .forEach(function(node) {
            var hit = data.nodeGui.filter(function(maybeCollidingNode) {
                return maybeCollidingNode.get('linking') !== true && hitTest(maybeCollidingNode, linker(node));
            }).slice(-1);

            hit = hit.forEach(function(collided) {
                var id;
                if(data.nextId !== undefined) {
                    id = data.nextId
                    data.nextId += 1;
                } else {
                    id = data.links.size;
                }

                var nodeLinks = node.get('links');
                if(nodeLinks === undefined) {
                    node = node.set('links', Immutable.List());
                }

                var collidedLinks = collided.get('links');
                if(collidedLinks === undefined) {
                    collided = collided.set('links', Immutable.List());
                }

                var nodeId     = node.get('id'),
                    collidedId = collided.get('id');

                data.nodeGui = data.nodeGui.set(nodeId, data.nodeGui.get(nodeId).merge(Immutable.Map({
                        links: node.get('links').push(id)
                    })
                )).set(collidedId, data.nodeGui.get(collidedId).merge(Immutable.Map({
                        links: collided.get('links').push(id)
                    })
                ));

                data.links = data.links.set(id, createLink(id, nodeId, collidedId));
            });
        });

    return data;
}

function stopLinking(data) {
    data.nodeGui = data.nodeGui.merge(
        data.nodeGui
        .filter(function(node) { return node.get('linking') === true; })
        .map(function(node) {
            return node.delete('linkerX').delete('linkerY').delete('linking');
        })
    );

    return data;
}

function stopMovingIcon(data) {
    data.nodeGui = data.nodeGui.merge(
        data.nodeGui
        .filter(function(node) { return node.get('movingIcon') === true; })
        .map(function(node) {
            return node.delete('movingIcon');
        })
    );

    return data;
}

function deselect(data) {
    data.nodeGui = data.nodeGui.merge(
        data.nodeGui.
            filter(function(node) { return node.get('selected') === true && !node.get('clicked')}).
            map(function(node)    { return node.delete('selected').delete('offsetX').delete('offsetY'); })
    );

    data.links = data.links.merge(
        data.links.
            filter(function(link) { return link.get('selected') === true && !link.get('clicked')}).
            map(function(link)    { return link.delete('selected').delete('offsetX').delete('offsetY'); })
    );

    return data;
}

function select(data, error, done) {
    var selectedNodes = data.nodeGui.filter(function(node) {
        return node.get('clicked');
    }).map(function(node) {
        if(node.get('msSinceClicked') !== undefined && node.get('msSinceClicked') + 300 > Date.now()) {
            return node.set('selected', true).delete('msSinceClicked');
        } else {
            return node.set('msSinceClicked', Date.now());
        }
    });

    var selectedLinks = data.links.filter(function(link) {
        return link.get('clicked');
    }).map(function(link) {
        if(link.get('msSinceClicked') !== undefined && link.get('msSinceClicked') + 300 > Date.now()) {
            return link.set('selected', true).delete('msSinceClicked');
        } else {
            return link.set('msSinceClicked', Date.now());
        }
    });

    data.nodeGui = data.nodeGui.merge(selectedNodes);
    data.links = data.links.merge(selectedLinks);

    return data;
}

module.exports = mouseDownWare;