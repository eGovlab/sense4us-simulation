'use strict';

var objectHelper = require('./../object-helper.js');

module.exports = function createNode(model, data, gui, type) {
    var id = model.generateId();

    var nodeData = {
        syncId:          false,
        value:           0,
        simulateChange:  [],
        type:            type || 'intermediate',
        initialValue:    0,
        measurementUnit: '',
        description:     '',

        objectId: 'nodeData'
    };

    var x      = 600;
    var y      = 100;
    var radius = gui ? gui.radius || 45 : 45;

    var offsetX     = model.settings.offsetX;
    var offsetY     = model.settings.offsetY;
    var modelWidth  = model.static.width  || -1;
    var modelHeight = model.static.height || -1;

    objectHelper.forEach.call(model.nodeGui, function(n) {
        if(n.x < Math.abs(offsetX) || n.x > modelWidth + Math.abs(offsetX)) {
            return;
        }

        if(n.x > x) {
            x = n.x;
        }
    });

    x += radius;

    var nodeGui = {
        x:        x,
        y:        y,
        radius:   radius,
        links:    [],
        color:    '',

        objectId: 'nodeGui'
    };


    if(data !== undefined) {
        nodeData = objectHelper.merge.call(nodeData, data);
    }

    if(gui !== undefined) {
        nodeGui = objectHelper.merge.call(nodeGui, gui);
    }

    nodeData.id = id;
    nodeGui.id  = id;
    
    model.history.push({
        action: 'newNode',
        data:   {
            data: nodeData,
            gui:  nodeGui
        }
    });
    model.revertedHistory = [];

    model.nodeData[id] = nodeData;
    model.nodeGui[id]  = nodeGui;

    if(nodeData.timeTable) {
        objectHelper.forEach.call(
            model.scenarios,
            function(scenario) {
                scenario.refresh(model);
            }
        );
    }

    model.emit(null, 'resetUI', 'refresh');

    /**
     * @description A new node has been created.
     * @event newNode
     * @memberof module:model/statusEvents
     *
     * @param {integer} id - New node id.
     * @param {object} nodeData - Data relevant to the new node.
     * @param {object} nodeGui - Gui data relevant to the new node.
     * @example tool.addListener('newNode', function(id, nodeData, nodeGui) {
     *     console.log(nodeData, nodeGui);
     * })
     */
    model.emit([id, nodeData, nodeGui], 'newNode');

    return model;
};
