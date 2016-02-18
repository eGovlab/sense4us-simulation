"use strict";

var mouseMoveWare = require("./../mouse_handling/handle_drag.js");

function mouseMove(canvas, loadedModel, pos, deltaPos) {
    var _data = {
        pos:      pos,
        deltaPos: deltaPos,
        settings: loadedModel.settings,
        nodeGui:  loadedModel.nodeGui,
        links:    loadedModel.links
    };

    var data = mouseMoveWare(_data);

    data.nodeGui.forEach(function(node, id) {
        node.forEach(function(val, key) {
            loadedModel.nodeGui[id][key] = val;
        });
    });

    data.links.forEach(function(link, id) {
        link.forEach(function(val, key) {
            loadedModel.links[id][key] = val;
        });
    });

    loadedModel.refresh = true;

    //loadedModel.nodeGui  = loadedModel.nodeGui.merge(data.nodeGui);
    //loadedModel.links    = loadedModel.links.merge(data.links);
    
    loadedModel.settings.offsetX = data.settings.offsetX;
    loadedModel.settings.offsetY = data.settings.offsetY;
    //loadedModel.settings = loadedModel.settings.merge(data.settings);

    //refresh();
}

module.exports = mouseMove;