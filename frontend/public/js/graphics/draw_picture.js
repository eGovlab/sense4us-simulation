'use strict';

var images = {};
var PLACEHOLDER_PATH = 'img/file_not_found.png';

function drawImage(ctx, image, map) {
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

var placeholder = new Image();
placeholder.src = PLACEHOLDER_PATH;

function drawPicture(ctx, imagePath, map, refresh) {
    refresh = refresh || drawPicture;
    
    var img = null;
    
    if (images.hasOwnProperty(imagePath)) {
        img = images[imagePath];
        if (img.isLoading === true) {
            return;
        }
        
        try {
            drawImage(ctx, img, map);        
        } catch(error) {
            ctx.restore();
            console.log(error);
            images[imagePath] = placeholder;
        }
    } else {
        img = new Image();   // Create new img element
        window.derp = img;
        images[imagePath] = img;
        img.src = imagePath; // Set source path
        img.isLoading = true;
        
        img.onload = function() {
            img.isLoading = false;
            
            refresh(ctx, imagePath, map, refresh);
        };
        
        img.onerror = function(error) {
            console.log('the image with path', imagePath, 'doesn\'t seem to exist');
            images[imagePath] = placeholder;
            
            refresh(ctx, imagePath, map, refresh);
        };
    }
}

module.exports = drawPicture;
