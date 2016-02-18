'use strict';

var images = {};
var PLACEHOLDER_PATH = 'img/file_not_found.png';

function drawScaledImage(ctx, image, x, y, w, h) {
    if (w > image.width || h > image.h) {
        ctx.drawImage(image, x, y, w, h);
        return;
    }
    
    // Step it down several times
    /*var can2 = document.createElement('canvas');
    var scalingW = image.width - ((image.width - w) / 4);
    var scalingH = image.height - ((image.height - h) / 4);
    can2.width = scalingW;
    can2.height = scalingH;
    var ctx2 = can2.getContext('2d');
    
    // Draw it at 1/2 size 3 times (step down three times)
    
    ctx2.drawImage(image, 0, 0, scalingW, scalingH);
    var newScalingW = image.width - ((image.width - w) / 2);
    var newScalingH = image.height - ((image.height - h) / 2);
    ctx2.drawImage(can2, 0, 0, scalingW, scalingH, 0, 0, newScalingW, newScalingH);*/
    /*
    var newScalingW2 = image.width - ((image.width - w) / 1.5);
    var newScalingH2 = image.height - ((image.height - h) / 1.5);
    ctx2.drawImage(can2, 0, 0, newScalingW, newScalingH, 0, 0, newScalingW2, newScalingH2);
    */
    //ctx2.drawImage(can2, 0, 0, image.width / 2, image.height / 2, 0, 0, image.width / 4, image.height / 4);
    //ctx2.drawImage(can2, 0, 0, w/2, h/2, 0, 0, w/4, h/4);
    //ctx2.drawImage(can2, 0, 0, w/4, h/4, 0, 0, w/6, h/6);
    //ctx.drawImage(can2, 0, 0, newScalingW, newScalingH, x, y, w, h);
    ctx.drawImage(image, x, y, w, h);
}

function drawImage(ctx, image, map) {
    ctx.globalCompositeOperation = 'source-over';
    // Save the state, so we can undo the clipping
    ctx.save();

    // Create a circle
    ctx.beginPath();
    ctx.arc(map.x, map.y, map.radius + 2, 0, 360);

    // Clip to the current circle
    ctx.clip();
    
    ctx.drawImage(image, map.x - map.radius, map.y - map.radius, map.radius * 2, map.radius * 2);

    //drawScaledImage(ctx, image, map.x - map.radius, map.y - map.radius, map.radius * 2, map.radius * 2);
    
    // Undo the clipping
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
}

var placeholder = new Image();
placeholder.src = PLACEHOLDER_PATH;

function drawPicture(ctx, imagePath, map, refresh) {
    refresh = refresh || drawPicture;
    
    var img = null;
    
    if (images.hasOwnProperty(imagePath)) {
        img = images[imagePath];
        if (img.isLoading === true) {
            img.nodesWaiting.push(map);
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
        //window.derp = img;
        images[imagePath] = img;
        img.src = imagePath; // Set source path
        img.isLoading = true;
        img.nodesWaiting = [
            map
        ];
        
        img.onload = function() {
            img.isLoading = false;
            
            img.nodesWaiting.forEach(function(_map) {
                drawImage(ctx, img, _map);
                //refresh(ctx, imagePath, _map, refresh);
            });

            img.nodesWaiting = undefined;
        };
        
        img.onerror = function(error) {
            console.log('the image with path', imagePath, 'doesn\'t seem to exist');
            images[imagePath] = placeholder;
            img.nodesWaiting.forEach(function(_map) {
                drawImage(ctx, placeholder, _map);
            });

            img.nodesWaiting = undefined;
            //refresh(ctx, imagePath, map, refresh);
        };
    }
}

module.exports = drawPicture;
