"use strict";

var mouseDownWare = require("./../mouse_handling/handle_down.js");

function mouseDown(canvas, loadedModel, pos) {
    var _data = {
        env:       loadedModel.environment,
        pos:       pos,
        nodeGui:   loadedModel.nodeGui,
        links:     loadedModel.links,
        linegraph: loadedModel.settings.linegraph
    };

    var data = mouseDownWare(_data);

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

    //loadedModel.nodeGui = loadedModel.nodeGui.merge(data.nodeGui);
    //loadedModel.links   = loadedModel.links.merge(data.links);

    if(loadedModel.settings.linegraph) {
        loadedModel.settings = loadedModel.settings;
    }

    //refresh();

    /*if(loadedModel.settings.linegraph) {
        linegraphRefresh();
    }*/

    return true;
}

module.exports = mouseDown;