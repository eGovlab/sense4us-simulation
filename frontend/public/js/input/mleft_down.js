"use strict";

var mouseDownWare = require("./../mouse_handling/handle_down.js"),
    objectHelper  = require('./../object-helper.js');

function mouseDown(canvas, loadedModel, pos) {
    var _data = {
        env:       loadedModel.environment,
        pos:       pos,
        nodeGui:   loadedModel.nodeGui,
        links:     loadedModel.links,
        linegraph: loadedModel.settings.linegraph
    };

    document.activeElement.blur();

    var data = mouseDownWare(_data);

    objectHelper.forEach.call(
        data.nodeGui,
        function(node, id) {
            objectHelper.forEach.call(
                node,
                function(val, key) {
                    loadedModel.nodeGui[id][key] = val;
                }
            );
        }
    );

    objectHelper.forEach.call(
        data.links,
        function(link, id) {
            objectHelper.forEach.call(
                link,
                function(val, key) {
                    loadedModel.links[id][key] = val;
                }
            );
        }
    );

    loadedModel.refresh = true;

    return true;
}

module.exports = mouseDown;