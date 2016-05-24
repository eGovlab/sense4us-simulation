'use strict';

var curry = require('./curry');

var linker = require('./linker.js');

var aggregatedLink = require('./aggregated_link.js');

var colorValues    = require('./graphics/value_colors.js');
var objectHelper   = require('./object-helper.js');

var drawNode       = require('./graphics/draw_node.js'),
    drawTimeTable  = require('./graphics/draw_time_table.js');

var drawSelectedMenu = curry(require('./selected_menu').drawSelectedMenu, document.getElementById('sidebar')),
    drawLinker       = require('./graphics/draw_linker.js'),
    drawLink         = require('./graphics/draw_link.js'),   
    drawChange       = require('./graphics/draw_change.js'), 
    drawText         = require('./graphics/draw_text.js'),
    drawActor        = require('./graphics/draw_actor.js');

var updateSelected = require('./selected_menu').updateSelected;

function clearCanvasAndTransform(ctx, canvas, loadedModel, selectedMenu, next) {
    ctx.clearRect(
        -loadedModel.settings.offsetX,
        -loadedModel.settings.offsetY,
        canvas.width,
        canvas.height
    );

    /*ctx.clearRect(
        (-loadedModel.settings.offsetX || 0) * (2 - loadedModel.settings.scaleX || 1),
        (-loadedModel.settings.offsetY || 0) * (2 - loadedModel.settings.scaleX || 1),
        canvas.width  * (2 - (loadedModel.settings.scaleX || 1)),
        canvas.height * (2 - (loadedModel.settings.scaleY || 1))
    );*/
    
    ctx.setTransform(
        loadedModel.settings.scaleX  || 1,
        0,
        0,
        loadedModel.settings.scaleY  || 1,
        loadedModel.settings.offsetX || 0,
        loadedModel.settings.offsetY || 0
    );

    next();
}

function drawNodes(ctx, canvas, loadedModel, selectedMenu, next) {
    objectHelper.forEach.call(
        loadedModel.nodeData,
        function drawEachNode(n) { 
            var nodeGui = objectHelper.merge.call(n, loadedModel.nodeGui[n.id]);
            if(!loadedModel.settings.linegraph) {
                nodeGui.linegraph = false;
            }

            nodeGui.url = loadedModel.CONFIG.url;

            drawNode(ctx, nodeGui);
        }
    );

    next();
}

function drawLinks(ctx, canvas, loadedModel, selectedMenu, next) {
    // draw the links and arrows
    var actors = {};
    objectHelper.forEach.call(
        loadedModel.links,
        function drawLinksAndArrows(link) {
            var nodeData = loadedModel.nodeData[link.node1];
            if(nodeData.type.toUpperCase() === 'ACTOR') {
                if(!actors[link.node2]) {
                    actors[link.node2] = 0;
                }

                actors[link.node2] += 1;
                var layer = actors[link.node2];

                drawActor(ctx, layer, link, loadedModel);
            } else {
                drawLink(ctx, aggregatedLink(link, loadedModel.nodeGui));
            }
        }
    );

    next();
}

function drawNodeDescriptions(ctx, canvas, loadedModel, selectedMenu, next) {
    // draw all the node descriptions
    objectHelper.forEach.call(
        loadedModel.nodeData,
        function drawEachNodeText(n) { 
            var nodeGui = objectHelper.merge.call(n, loadedModel.nodeGui[n.id]);
            drawText(
                ctx,
                nodeGui.name,
                nodeGui.x,
                nodeGui.y + nodeGui.radius + 4,
                colorValues.neutral,
                true
            );
            /*
            ** If you add more environment specific code, please bundle
            ** it up into another method.
            **
            ** e.g. drawNodeInSimulation(nodeGui)
            */
            if(loadedModel.static.showSimulate) {
                if(nodeGui.timeTable) {
                    drawTimeTable(ctx, nodeGui);
                } else if(nodeGui.type.toUpperCase() !== 'ACTOR') {
                    drawChange(ctx, nodeGui.x, nodeGui.y + nodeGui.radius / 6, nodeGui.radius, Math.round(n.simulateChange[loadedModel.loadedScenario.timeStepN] * 100) / 100);
                }
            }
        }
    );

    next();
}

function _drawLinker(ctx, canvas, loadedModel, selectedMenu, next) {
    // if there are nodes selected that aren't currently linking, we want to draw the linker
    var filteredNodes = objectHelper.filter.call(
        loadedModel.nodeGui,
        function drawLinkerOnSelectedNodes(node) {
            return node.selected === true && node.linking !== true;
        }
    );

    objectHelper.forEach.call(
        filteredNodes,
        function(n) {
            drawLinker(ctx, linker, n);
        }
    );

    next();
}

function drawLinkingLine(ctx, canvas, loadedModel, selectedMenu, next) {
    // if we are currently linking, we want to draw the link we're creating
    var linkingNodes = objectHelper.filter.call(
        loadedModel.nodeGui,
        function drawLinkingArrow(node) {
            return node.linking === true;
        }
    );

    objectHelper.forEach.call(
        linkingNodes,
        function(node) {
            var linkerForNode = linker(node);
            drawLink(ctx, {
                    type:         'fullchannel',
                    x1:           node.x,
                    y1:           node.y,
                    x2:           node.linkerX,
                    y2:           node.linkerY,
                    fromRadius:   node.radius,
                    targetRadius: 0,
                    width:        8
                }
            );
        }
    );

    // if we are linking, we want to draw the dot above everything else
    linkingNodes = objectHelper.filter.call(
        loadedModel.nodeGui,
        function drawLinkerDotWhileLinking(node) {
            return node.linking === true;
        }
    );

    objectHelper.forEach.call(
        linkingNodes,
        function(d){
            drawLinker(ctx, linker, d)
        }
    );
    
    next();
}

module.exports = {
    clearCanvasAndTransform: clearCanvasAndTransform,
    drawNodes:               drawNodes,
    drawLinks:               drawLinks,
    drawNodeDescriptions:    drawNodeDescriptions,
    _drawLinker:             _drawLinker,
    drawLinkingLine:         drawLinkingLine
};
