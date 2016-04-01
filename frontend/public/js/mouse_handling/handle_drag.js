'use strict';

var middleware   = require('./../middleware.js');
var objectHelper = require('./../object-helper.js');

var mouseDownWare = middleware([
    moveLinker,
    moveIcon,
    moveClickedNodes,
    pan
]);

function pan(data) {
    data.settings.offsetX = (data.settings.offsetX || 0) - data.deltaPos.x;
    data.settings.offsetY = (data.settings.offsetY || 0) - data.deltaPos.y;
    
    return data;
}

function moveClickedNodes(data, error, done) {
    var movingNodes = objectHelper.filter.call(
        data.nodeGui,
        function(node) {
            return node.clicked === true;
        }
    );

    movingNodes = objectHelper.map.call(
        movingNodes,
        function(node) {
            return objectHelper.merge.call(
                node,
                {
                    x: data.pos.x - node.offsetX,
                    y: data.pos.y - node.offsetY
                }
            );
        }
    );

    data.nodeGui = objectHelper.merge.call(data.nodeGui, movingNodes);
    
    if (Object.keys(movingNodes).length > 0) {
        return done(data);
    }

    return data;
}

function moveLinker(data, error, done) {
    var movingLinker = objectHelper.filter.call(
        data.nodeGui,
        function(node) {
            return node.linking === true;
        }
    );

    movingLinker = objectHelper.map.call(
        movingLinker,
        function(node) {
            return objectHelper.merge.call(node, {
                linkerX: data.pos.x,
                linkerY: data.pos.y
            });
        }
    );

    data.nodeGui = objectHelper.merge.call(data.nodeGui, movingLinker);
    
    if (Object.keys(movingLinker).length > 0) {
        return done(data);
    }

    return data;
}

function moveIcon(data, error, done) {
    var movingIcons = objectHelper.filter.call(
        data.nodeGui,
        function(node) {
            return node.movingIcon === true;
        }
    );

    movingIcons = objectHelper.map.call(
        movingIcons,
        function(node) {
            return node.merge({
                iconXOffset: data.pos.x - node.x,
                iconYOffset: data.pos.y - node.y
            });
        }
    );

    data.nodeGui = objectHelper.merge.call(data.nodeGui, movingIcons);

    if (Object.keys(movingIcons).length > 0) {
        return done(data);
    }
    
    return data;
}

module.exports = mouseDownWare;