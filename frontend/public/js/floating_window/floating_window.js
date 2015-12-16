'use strict';

function createWindow(x, y, w, h) {
    var container = document.createElement('div');

    container.style.left     = x + "px";
    container.style.top      = y + "px";
    container.style.width    = w + "px";
    container.style.height   = h + "px";

    container.className = "floating-window";

    var title = document.createElement('div');
    title.className = "title";

    var clear = document.createElement('div');
    clear.className = "clear";

    var killButton = document.createElement('div');
    killButton.className = "kill-button";
    
    container.appendChild(title);
    title.appendChild(killButton);
    title.appendChild(clear);

    var killCallback = function() {
        killButton.removeEventListener("click", killCallback);
        title.removeEventListener("mousedown", initializeMove);
        document.body.removeEventListener("mouseup",   deactivateMove);
        document.body.removeChild(container);
    };

    killButton.addEventListener("click", killCallback);

    var startX = 0,
        startY = 0;

    var initializeMove = function(pos) {
        startX = pos.clientX;
        startY = pos.clientY;

        document.body.addEventListener("mousemove", moveCallback);
        document.body.addEventListener("mouseup", deactivateMove);
    };

    var deactivateMove = function() {
        document.body.removeEventListener("mousemove", moveCallback);
        document.body.removeEventListener("mouseup",   deactivateMove);
    };

    var moveCallback = function(pos) {
        var rect = container.getBoundingClientRect();

        var newX = pos.clientX - startX,
            newY = pos.clientY - startY;

        startX = pos.clientX;
        startY = pos.clientY;

        container.style.left = (rect.left + newX) + "px";
        container.style.top  = (rect.top + newY)  + "px";
    };

    title.addEventListener("mousedown", initializeMove);

    return container;
}

module.exports = {
    createWindow: createWindow
};
