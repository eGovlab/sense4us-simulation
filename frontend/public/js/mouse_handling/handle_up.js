'use strict';

var middleware   = require('./../middleware.js'),
    hitTest      = require('./../collisions.js').hitTest,
    linker       = require('./../linker.js'),
    Immutable    = null,
    modelLayer   = require('./../model_layer.js'),
    generateLink = require('./../util/generate_link.js'),
    objectHelper = require('./../object-helper.js'),
    createLink   = require('../structures/create_link');

var mouseDownWare = middleware([
    link,
    deselect,
    stopLinking,
    stopMovingIcon,
    select
]);

function generateHexColor() {
    return Math.round(Math.random() * 255).toString(16);
}

function generateColor() {
    return '#' + generateHexColor() + generateHexColor() + generateHexColor();
}

function link(data) {
    generateLink(data.loadedModel);

    return data;
}

function stopLinking(data) {
    var linkers = objectHelper.filter.call(
        data.nodeGui,
        function(node) {
            return node.linking === true;
        }
    );

    linkers = objectHelper.map.call(
        linkers,
        function(node) {
            delete node.linkerX;
            delete node.linkerY;
            delete node.linking;
            
            node.clicked = true;
            return node;
        }
    );

    data.nodeGui = objectHelper.merge.call(data.nodeGui);

    return data;
}

function stopMovingIcon(data) {
    var icons = objectHelper.filter.call(
        data.nodeGui,
        function(node) {
            return node.movingIcon === true;
        }
    );

    icons = objectHelper.map.call(
        icons,
        function(node) {
            return node.delete('movingIcon');
        }
    );

    data.nodeGui = objectHelper.merge.call(data.nodeGui, icons);

    return data;
}

function deselect(data) {
    if(data.didDrag) {
        return data;
    }

    var selectedNodes = objectHelper.filter.call(
        data.nodeGui,
        function(node) {
            return node.selected === true && !node.clicked && !node.linking
        }
    );

    selectedNodes = objectHelper.map.call(
        selectedNodes,
        function(node) {
            data.selected = {};
            delete node.selected;
            delete node.offsetX;
            delete node.offsetY;

            return node;
        }
    );

    data.nodeGui = objectHelper.merge.call(data.nodeGui, selectedNodes);

    var selectedLinks = objectHelper.filter.call(
        data.links,
        function(link) {
            return link.selected === true && !link.clicked;
        }
    );

    selectedLinks = objectHelper.map.call(
        selectedLinks,
        function(link) {
            data.selected = {};
            delete link.selected;
            delete link.offsetX;
            delete link.offsetY;
            return link;
        }
    );

    data.links = objectHelper.merge.call(data.links, selectedLinks);

    return data;
}

function select(data, error, done) {
    var selectedNodes = objectHelper.filter.call(
        data.nodeGui,
        function(node) {
            return node.clicked;
        }
    );
    
    selectedNodes = objectHelper.map.call(
        selectedNodes,
        function(node) {
            if(node.msSinceClicked !== undefined && node.msSinceClicked + 300 > Date.now()) {
                data.selected = node;
                node.selected = true;
                delete node.msSinceClicked;
                return node;
            }

            node.linegraph  = data.linegraph ? !node.linegraph : false,
            node.graphColor = generateColor();
            node.msSinceClicked = Date.now();
            return node;
        }
    );

    var selectedLinks = objectHelper.filter.call(
        data.links,
        function(link) {
            return link.clicked;
        }
    );

    selectedLinks = objectHelper.map.call(
        selectedLinks,
        function(link) {
            if(link.msSinceClicked !== undefined && link.msSinceClicked + 300 > Date.now()) {
                data.selected = link;
                link.selected = true;
                delete link.msSinceClicked;
                return link;
            }

            link.msSinceClicked = Date.now();
            return link;
        }
    );

    data.nodeGui = objectHelper.merge.call(data.nodeGui, selectedNodes);
    data.links   = objectHelper.merge.call(data.links,   selectedLinks);

    return data;
}

module.exports = mouseDownWare;
