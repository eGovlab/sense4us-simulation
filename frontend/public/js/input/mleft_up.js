"use strict";

var mouseUpWare = require("./../mouse_handling/handle_up.js");

function mouseUp(canvas, loadedModel, pos) {
    var _data = {
        pos:         pos,
        loadedModel: loadedModel,
        nodeData:    loadedModel.nodeData,
        nodeGui:     loadedModel.nodeGui,
        links:       loadedModel.links,
        didDrag:     loadedModel.didDrag,
        selected:    loadedModel.selected,
        linegraph:   loadedModel.settings.linegraph
    };

    var data = mouseUpWare(_data);

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

    //loadedModel.nodeGui = newState;
    //loadedModel.links   = loadedModel.links.merge(data.links);
    //loadedModel.nextId  = data.nextId;

    if(loadedModel.selected !== data.selected) {
        loadedModel.selected = data.selected;
    }

    loadedModel.refresh = true;
    if(data.resetUI) {
        loadedModel.resetUI = true;
    }

    canvas.panX = -loadedModel.settings.offsetX;
    canvas.panY = -loadedModel.settings.offsetY;

    //refresh();
}

module.exports = mouseUp;