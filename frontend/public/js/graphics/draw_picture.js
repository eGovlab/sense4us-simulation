'use strict';

var images = {};

function drawImage(ctx, image, map) {
    console.log(map);
    // Save the state, so we can undo the clipping
    ctx.save();
    
    // Create a circle
    ctx.beginPath();
    ctx.arc(map.get('x'), map.get('y'), map.get('radius'), 0, 360);
    
    // Clip to the current path
    ctx.clip();
    
    ctx.drawImage(image, map.get('x') - map.get('radius'), map.get('y') - map.get('radius'), map.get('radius') * 2, map.get('radius') * 2);	
    
    // Undo the clipping
    ctx.restore();   
}

function drawAvatar(ctx, imagePath, map, env) {
    var img = null;
    if (images.hasOwnProperty(imagePath)) {
        img = images[imagePath];
        drawImage(ctx, img, map);
    } else {
        img = new Image();   // Create new img element
        images[imagePath] = img;
        img.src = imagePath; // Set source path
        img.onload = function() {
            //drawImage(ctx, img, map);
            var drawNode = require('./draw_node.js');
            drawNode(ctx, map, env);
        }
    }
}

module.exports = drawAvatar;
