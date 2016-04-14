'use strict';

var hitTest      = require('./../collisions.js').hitTest,
    createLink   = require('../structures/create_link'),
    linker       = require('./../linker.js'),
    objectHelper = require('./../object-helper.js');

module.exports = function(loadedModel) {
    var nodeData = loadedModel.nodeData,
        nodeGui  = loadedModel.nodeGui,
        links    = loadedModel.links;

    var linkingNodes = objectHelper.filter.call(
        nodeGui,
        function(node) {
            return node.linking === true;
        }
    );

    objectHelper.forEach.call(
        linkingNodes,
        function(node) {
            var hit = objectHelper.filter.call(
                nodeGui,
                function(maybeCollidingNode) {
                    return maybeCollidingNode.linking !== true && hitTest(maybeCollidingNode, linker(node));
                }
            );

            objectHelper.forEach.call(
                hit,
                function(collided) {
                    if(node.links === undefined) {
                        node.links = [];
                    }

                    var collidedLinks = collided.links;
                    if(collidedLinks === undefined) {
                        collided.links = [];
                    }

                    var nodeId     = node.id,
                        collidedId = collided.id;

                    var sourceData = nodeData[node.id];
                    var destData   = nodeData[collidedId];
                    if(sourceData.type.toUpperCase() === 'ACTOR') {
                        if(destData.type.toUpperCase() !== 'ORIGIN') {
                            return;
                        }

                        loadedModel.resetUI = true;
                    }

                    try {
                        var sourceGui = nodeGui[nodeId];
                        for(var i = 0; i < sourceGui.links.length; i++) {
                            var link = links[sourceGui.links[i]];
                            if((link.node1 === nodeId && link.node2 === collidedId)
                                || (link.node1 === collidedId && link.node2 === nodeId)) {
                                return;
                            }
                        }

                        var newLink       = createLink(loadedModel, nodeId, collidedId);
                        links[newLink.id] = newLink;

                        nodeGui[nodeId].links.push(newLink.id);
                        nodeGui[collidedId].links.push(newLink.id);

                        loadedModel.emit(newLink, 'newLink');
                    } catch(e) {
                        console.error(nodeData);
                        console.error(nodeGui);
                        console.error(links);
                        
                        throw e;
                    }
                }
            );
        }
    );
};

