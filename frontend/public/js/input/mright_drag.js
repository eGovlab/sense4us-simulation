'use strict';

var arithmetics  = require('../canvas/arithmetics.js'),
    hitTest      = require('./../collisions.js').hitTest,
    generateLink = require('./../util/generate_link.js');

var objectHelper = require('./../object-helper.js');

function down(canvas, loadedModel, pos) {
    var nodeGui = loadedModel.nodeGui;
    var collidedNodes = objectHelper.filter.call(nodeGui, function(node) {
        return hitTest(node, pos);
    });

    collidedNodes = collidedNodes.slice(-1);
    objectHelper.forEach.call(collidedNodes, function(node) {
        node.offsetX = pos.x - (node.x || 0);
        node.offsetY = pos.y - (node.y || 0);

        node.linking = true;
    });

    if(Object.keys(collidedNodes).length === 0) {
        return false;
    }

    return true;
}

function move(canvas, loadedModel, pos, deltaPos) {
    var nodeGui      = loadedModel.nodeGui;
    var linkingNodes = objectHelper.filter.call(nodeGui, function(node) {
        return node.linking;
    });

    objectHelper.forEach.call(linkingNodes, function(node) {
        node.linkerX = pos.x;
        node.linkerY = pos.y;
    });

    loadedModel.refresh = true;
    /*model.propagate();*/
}

function up(canvas, loadedModel, pos) {
    generateLink(loadedModel);

    var nodeGui      = loadedModel.nodeGui;
    var linkingNodes = objectHelper.filter.call(nodeGui, function(node) {
        return node.linking;
    });

    objectHelper.forEach.call(linkingNodes, function(node) {
        node.linking = false;
        node.linkerX = 0;
        node.linkerY = 0;
    });

    loadedModel.refresh = true;
}

module.exports = {
    button:    2,
    mouseDown: down,
    mouseMove: move,
    mouseUp:   up
};