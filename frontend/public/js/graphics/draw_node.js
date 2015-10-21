'use strict';

var drawPicture     = require('./draw_picture'),
    drawCircle      = require('./draw_circle');

var settings = [
    {
        color: 'rgba(255, 85, 85, 1)',
        conditions: [
            function(node) { return node.get('type') === 'actor'; },
            function(node) { return node.get('selected') === true; }
        ]
    },
    {
        color: 'rgba(255, 75, 75, 0.9)',
        conditions: [
            function(node) { return node.get('type') === 'actor'; }
        ]
    },
    {
        color: 'rgba(195, 85, 255, 1)',
        conditions: [
            function(node) { return node.get('type') === 'origin'; },
            function(node) { return node.get('selected') === true; }
        ]
    },
    {
        color: 'rgba(175, 75, 255, 0.9)',
        conditions: [
            function(node) { return node.get('type') === 'origin'; }
        ]
    },
    {
        color: 'rgba(255, 195, 85, 1)',
        conditions: [
            function(node) { return node.get('selected') === true; }
        ]
    },
    {
        color: 'rgba(255, 175, 75, 0.9)',
        conditions: []
    }
];

module.exports = function drawNode(ctx, map) {
    /*
    if (map.get('selected') === true) {
        ctx.fillStyle = 'rgba(255, 175, 75, 0.8)';
    } else {
        ctx.fillStyle = 'rgba(255, 175, 75, 0.6)';
    }
    */

    var colors = settings.filter(function(style) {
        for (var i = 0; i < style.conditions.length; i++) {
            if (!style.conditions[i](map)) {
                return false;
            }
        }
        
        return true;
    });

    if (map.get('avatar')) {
        drawPicture(ctx, map.get('avatar'), map, function(_ctx, _imagePath, _map, _refresh) {
            drawNode(ctx, map);
        });
    } else {
        ctx.fillStyle = colors[0].color;
        
        ctx.beginPath();
        ctx.arc(map.get('x'), map.get('y'), map.get('radius'), 0, 360);
        ctx.fill();
    }
    
    if (map.get('icon')) {
        var iconCircle = require('../icon')(map);
        
        drawCircle(ctx, iconCircle, colors[0].color);
        drawPicture(ctx, map.get('icon'), iconCircle, function() {
            drawNode(ctx, map);
        });
    }

    return;
    
    var text = map.get('description');
    if(!text) {
        return;
    }
    /*if (map.get('type') === 'actor') {
        text = 'Actor' + map.get('id');
    } else if (map.get('type') === 'origin') {
        text = map.get('relativeChange') + '';
    } else {
        if (env === 'modelling') {
            text = map.get('value') + '';
        } else if (env === 'simulate') {
            text = map.get('simulateChange') + '';
        }
    }*/

    /*ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';*/

    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(80, 80, 80, 1.0)';
    
    var size = 48 - text.length * 2.4;
    size = size < 16 ? 16 : size;
    ctx.font = size + 'px sans-serif';
    var textData = ctx.measureText(text);
    ctx.fillText(text, map.get('x') - textData.width / 2, map.get('y') + map.get('radius') + 4);

    /*
    // Draw node description above the node
    var descriptionSize = 22;
    ctx.font = descriptionSize + 'px sans-serif';
    ctx.textBaseline = 'bottom';
    var description = map.get('description');
    var descriptionData = ctx.measureText(description)
    ctx.fillText(description, map.get('x') - descriptionData.width / 2, map.get('y') - map.get('radius'));
    */
};