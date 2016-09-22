'use strict';

var drawPicture     = require('./draw_picture'),
    drawCircle      = require('./draw_circle');

var settings = [
    {
        color: 'rgba(255, 85, 85, 1)',
        conditions: [
            function(node) { return node.type === 'actor'; },
            function(node) { return node.selected === true; }
        ]
    },
    {
        color: 'rgba(255, 75, 75, 0.9)',
        conditions: [
            function(node) { return node.type === 'actor'; }
        ]
    },
    {
        color: 'rgba(195, 85, 255, 1)',
        conditions: [
            function(node) { return node.type === 'origin'; },
            function(node) { return node.selected === true; }
        ]
    },
    {
        color: 'rgba(175, 75, 255, 0.9)',
        conditions: [
            function(node) { return node.type === 'origin'; }
        ]
    },
    {
        color: 'rgba(255, 195, 85, 1)',
        conditions: [
            function(node) { return node.selected === true; }
        ]
    },
    {
        color: 'rgba(255, 175, 75, 0.9)',
        conditions: []
    }
];

module.exports = function drawNode(ctx, map) {
    /*
    if (map.selected === true) {
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

    if (map.avatar) {
        drawPicture(ctx, map.avatar, map, function(_ctx, _imagePath, _map, _refresh) {
            drawNode(ctx, map);
        });
    } else {
        ctx.fillStyle = colors[0].color;
        
        ctx.beginPath();
        ctx.arc(map.x, map.y, map.radius, 0, 360);
        ctx.fill();
    }

    if(map.linegraph && map.color) {
        ctx.strokeStyle = map.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(map.x, map.y, map.radius + 8, 0, 360);
        ctx.stroke();
    }
    
    if (map.icon) {
        var iconCircle = require('../icon')(map);
        
        drawCircle(ctx, iconCircle, colors[0].color);
        drawPicture(ctx, map.icon, iconCircle, function() {
            drawNode(ctx, map);
        });
    }

    return;
    
    var text = map.description;
    if(!text) {
        return;
    }
    /*if (map.type === 'actor') {
        text = 'Actor' + map.id;
    } else if (map.type === 'origin') {
        text = map.relativeChange + '';
    } else {
        if (env === 'modelling') {
            text = map.value + '';
        } else if (env === 'simulate') {
            text = map.simulateChange + '';
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
    ctx.fillText(text, map.x - textData.width / 2, map.y + map.radius + 4);

    /*
    // Draw node description above the node
    var descriptionSize = 22;
    ctx.font = descriptionSize + 'px sans-serif';
    ctx.textBaseline = 'bottom';
    var description = map.description;
    var descriptionData = ctx.measureText(description)
    ctx.fillText(description, map.x - descriptionData.width / 2, map.y - map.radius);
    */
};
