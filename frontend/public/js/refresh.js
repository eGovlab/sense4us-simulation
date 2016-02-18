"use strict";

var curry = require('./curry');

var linker = require('./linker.js');

var aggregatedLink = require('./aggregated_link.js');

var colorValues   = require('./graphics/value_colors.js');

var drawNode      = require('./graphics/draw_node.js'),
    drawTimeTable = require('./graphics/draw_time_table.js');

var drawSelectedMenu = curry(require('./selected_menu').drawSelectedMenu, document.getElementById('sidebar')),
    drawLinker       = require('./graphics/draw_linker.js'),
    drawLink         = require('./graphics/draw_link.js'),   
    drawChange       = require('./graphics/draw_change.js'), 
    drawText         = require('./graphics/draw_text.js'),
    drawActor        = require('./graphics/draw_actor.js');

var updateSelected = require('./selected_menu').updateSelected;

function clearCanvasAndTransform(ctx, canvas, loadedModel, selectedMenu, next) {
    ctx.clearRect(
        (-loadedModel.settings.offsetX || 0) * (2 - loadedModel.settings.scaleX || 1),
        (-loadedModel.settings.offsetY || 0) * (2 - loadedModel.settings.scaleX || 1),
        canvas.width  * (2 - (loadedModel.settings.scaleX || 1)),
        canvas.height * (2 - (loadedModel.settings.scaleY || 1))
    );
    
    ctx.setTransform(
        loadedModel.settings.scaleX  || 1,
        0,
        0,
        loadedModel.settings.scaleY  || 1,
        loadedModel.settings.offsetX || 0,
        loadedModel.settings.offsetY || 0
    );

    next();
}

function drawNodes(ctx, canvas, loadedModel, selectedMenu, next) {
    // draw all the nodes

    loadedModel.nodeData.forEach(
        function drawEachNode(n) { 
            var nodeGui = n.merge(loadedModel.nodeGui[n.id]);
            if(!loadedModel.settings.linegraph) {
                nodeGui.linegraph = false;
            }

            drawNode(ctx, nodeGui);
        }
    );

    next();
}

function drawLinks(ctx, canvas, loadedModel, selectedMenu, next) {
    // draw the links and arrows
    var actors = {};
    loadedModel.links.forEach(function drawLinksAndArrows(link) {
        var nodeData = loadedModel.nodeData[link.node1];
        if(nodeData.type.toUpperCase() === "ACTOR") {
            if(!actors[link.node2]) {
                actors[link.node2] = 0;
            }

            actors[link.node2] += 1;
            var layer = actors[link.node2];
            drawActor(ctx, layer, link, loadedModel);
        } else {
            drawLink(ctx, aggregatedLink(link, loadedModel.nodeGui));
        }
    });

    next();
}

function drawNodeDescriptions(ctx, canvas, loadedModel, selectedMenu, next) {
    // draw all the node descriptions
    loadedModel.nodeData.forEach(
        function drawEachNodeText(n) { 
            var nodeGui = n.merge(loadedModel.nodeGui[n.id]);
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
            if(loadedModel.environment === 'simulate' ) {
                if(nodeGui.timeTable) {
                    drawTimeTable(ctx, nodeGui);
                } else if(nodeGui.type.toUpperCase() !== "ACTOR") {
                    drawChange(ctx, nodeGui.x, nodeGui.y + nodeGui.radius / 6, Math.round(n.simulateChange[loadedModel.settings.timeStepN] * 100) / 100);
                }
            }
        }
    );

    next();
}

function _drawLinker(ctx, canvas, loadedModel, selectedMenu, next) {
    // if there are nodes selected that aren't currently linking, we want to draw the linker
    loadedModel.nodeGui.filter(function drawLinkerOnSelectedNodes(node) {
        return node.selected === true && node.linking !== true;
    }).forEach(function(n){drawLinker(ctx, linker, n);});

    next();
}

function drawLinkingLine(ctx, canvas, loadedModel, selectedMenu, next) {
    // if we are currently linking, we want to draw the link we're creating
    loadedModel.nodeGui.filter(function drawLinkingArrow(node) {return node.linking === true; }).forEach(function(node) {
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
    });

    // if we are linking, we want to draw the dot above everything else
    loadedModel.nodeGui.filter(function drawLinkerDotWhileLinking(node) {return node.linking === true; }).forEach(function(d){drawLinker(ctx, linker, d)});
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