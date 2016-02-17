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
    drawText         = require('./graphics/draw_text.js');

var updateSelected = require('./selected_menu').updateSelected;

function clearCanvasAndTransform(ctx, canvas, loadedModel, selectedMenu, environment, next) {
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

function drawNodes(ctx, canvas, loadedModel, selectedMenu, environment, next) {
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

function drawLinks(ctx, canvas, loadedModel, selectedMenu, environment, next) {
    // draw the links and arrows
    loadedModel.links.forEach(function drawLinksAndArrows(link) {
        drawLink(ctx, aggregatedLink(link, loadedModel.nodeGui));
    });

    next();
}

function drawNodeDescriptions(ctx, canvas, loadedModel, selectedMenu, environment, next) {
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
            if(environment === 'simulate' ) {
                if(nodeGui.timeTable) {
                    drawTimeTable(ctx, nodeGui);
                } else {
                    drawChange(ctx, nodeGui.x, nodeGui.y + nodeGui.radius / 6, Math.round(n.simulateChange[loadedModel.settings.timeStepN] * 100) / 100);
                }
            }
        }
    );

    next();
}

function _drawLinker(ctx, canvas, loadedModel, selectedMenu, environment, next) {
    // if there are nodes selected that aren't currently linking, we want to draw the linker
    loadedModel.nodeGui.filter(function drawLinkerOnSelectedNodes(node) {
        return node.selected === true && node.linking !== true;
    }).forEach(function(n){drawLinker(ctx, linker, n);});

    next();
}

function drawLinkingLine(ctx, canvas, loadedModel, selectedMenu, environment, next) {
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

function getSelectedObjects(ctx, canvas, loadedModel, selectedMenu, environment, next) {
    /*var selected = loadedModel.nodeData
    .filter(function filterNodesForSelection(node) {
        return loadedModel.nodeGui[node.id].selected === true;
    })
    .map(function removeUnnecessaryDataFromSelectedNodes(node) {
        return node.merge(
            {
                radius: loadedModel.nodeGui[node.id].radius,
                avatar: loadedModel.nodeGui[node.id].avatar,
                icon:   loadedModel.nodeGui[node.id].icon
            }
        );
    })
    .merge(
        loadedModel.links.filter(function filterLinksForSelection(link) {return link.selected === true;})
        .map(function removeUnnecessaryDataFromSelectedLinks(link) {
            return {
                id:          link.id,
                timelag:     link.timelag,
                coefficient: link.coefficient,
                threshold:   link.threshold,
                type:        link.type,
                node1:       link.node1,
                node2:       link.node2
            };
        })
    );

    if(selected.size() > 0) {
        loadedModel.selected = selected;
    }*/

    next();
}

function updateSelectedMenu(ctx, canvas, loadedModel, selectedMenu, environment, next) {
    //update the menu
    var selected = loadedModel.selected;
    var sidebar = document.getElementById('sidebar');
    if(sidebar.firstElementChild) {
        if(selected.last()) {
            sidebar.firstElementChild.style.display = 'none';
        } else {
            sidebar.firstElementChild.style.display = 'block';
        }
    }

    switch(environment) {
        case 'modelling':
            if(selected.last()) {
                selectedMenu.menu = drawSelectedMenu(loadedModel, selectedMenu.menu, selected.last(), updateSelected, ['timeTable', 'name', 'description', 'type', 'threshold', 'coefficient', 'timelag']);
            } else {
                selectedMenu.menu = drawSelectedMenu(loadedModel, selectedMenu.menu, loadedModel.settings, updateSelected, ['name']);
            }
            break;
        case 'simulate':
            if(selected.last()) {
                selectedMenu.menu = drawSelectedMenu(loadedModel, selectedMenu.menu, selected.last(), updateSelected, ['timeTable', 'coefficient', 'timelag', 'type', 'threshold']);
            } else {
                selectedMenu.menu = drawSelectedMenu(loadedModel, selectedMenu.menu, loadedModel.settings, updateSelected, ['maxIterations']);
                //selectedMenu = drawSelectedMenu(selectedMenu, null, null, null);
            }
            break;
    }

    next();
}

module.exports = {
    clearCanvasAndTransform: clearCanvasAndTransform,
    getSelectedObjects:      getSelectedObjects,
    drawNodes:               drawNodes,
    drawLinks:               drawLinks,
    drawNodeDescriptions:    drawNodeDescriptions,
    _drawLinker:             _drawLinker,
    drawLinkingLine:         drawLinkingLine,
    updateSelectedMenu:      updateSelectedMenu
};