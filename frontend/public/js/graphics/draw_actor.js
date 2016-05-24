'use strict';

function drawActor(ctx, layer, link, loadedModel) {
    var fromNode   = loadedModel.nodeGui[link.node1],
        targetNode = loadedModel.nodeGui[link.node2];

    var x1 = fromNode.x,
        x2 = targetNode.x,
        y1 = fromNode.y,
        y2 = targetNode.y;

    var fromRadius   = fromNode.radius + 8,
        targetRadius = targetNode.radius + (8 * layer);

    if(fromNode.color) {
        ctx.strokeStyle = fromNode.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x1, y1, fromRadius, 0, 360);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x2, y2, targetRadius, 0, 360);
        ctx.stroke();
    }
}

module.exports = drawActor;