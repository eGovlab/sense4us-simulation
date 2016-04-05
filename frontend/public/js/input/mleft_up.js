'use strict';

var mouseUpWare  = require('./../mouse_handling/handle_up.js');
var objectHelper = require('./../object-helper.js');

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