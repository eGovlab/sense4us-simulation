"use strict";

var mouseUpWare = require("./../mouse_handling/handle_up.js");

function mouseUp(canvas, loadedModel, environment, pos) {
    var _data = {
        pos:     pos,
        nextId:  loadedModel.nextId,
        nodeGui: loadedModel.nodeGui,
        links:   loadedModel.links
    };

    var data = mouseUpWare(_data);
    loadedModel.nodeGui = loadedModel.nodeGui.merge(data.nodeGui);
    loadedModel.links   = loadedModel.links.merge(data.links);
    loadedModel.nextId  = data.nextId;

    canvas.panX = -loadedModel.settings.offsetX;
    canvas.panY = -loadedModel.settings.offsetY;

    //refresh();
}

module.exports = mouseUp;