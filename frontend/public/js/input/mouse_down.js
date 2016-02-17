"use strict";

var mouseDownWare = require("./../mouse_handling/handle_down.js");

function mouseDown(canvas, loadedModel, environment, pos) {
    var _data = {
        env:       environment,
        pos:       pos,
        nodeGui:   loadedModel.nodeGui,
        links:     loadedModel.links,
        linegraph: loadedModel.settings.linegraph
    };

    var data = mouseDownWare(_data, environment);

    loadedModel.nodeGui = loadedModel.nodeGui.merge(data.nodeGui);
    loadedModel.links   = loadedModel.links.merge(data.links);
    
    if(data.selected) {
        loadedModel.selected = data.selected;
    }

    //refresh();

    /*if(loadedModel.settings.linegraph) {
        linegraphRefresh();
    }*/

    return true;
}

module.exports = mouseDown;