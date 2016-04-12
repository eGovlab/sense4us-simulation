'use strict';

var menuBuilder = require('./../menu_builder');

function FloatingWindow(x, y, w, h, className) {
    this.container;
    this.body;
    this.title;

    this.x = x;
    this.y = y;

    this.w = w;
    this.h = h;

    this.className = className;
    this.createWindow(x, y, w, h, className);
}

FloatingWindow.prototype = {
     createWindow: function(x, y, w, h) {
        if(this.container) {
            return;
        }

        if(
            !x && this.x &&
            !y && this.y &&
            !w && this.w &&
            !h && this.h
        ) {
            x = this.x;
            y = this.y;
            w = this.w;
            h = this.h;
        }

        this.container = menuBuilder.div('mb-floating-window');;
        var container = this.container;

        var that = this;

        this.container.style.left     = x + 'px';
        this.container.style.top      = y + 'px';
        this.container.style.width    = w + 'px';
        this.container.style.height   = (h + 20) + 'px';

        this.title      = menuBuilder.div('title');
        this.clear      = menuBuilder.div('clear');
        this.killButton = menuBuilder.div('kill-button');
        this.body       = menuBuilder.div(this.className);
        this.body.style.height = h + 'px';

        /*this.span           = document.createElement('span');
        this.span.className = 'glyphicon glyphicon-remove';*/

        //this.killButton.appendChild(this.span);

        this.title.appendChild(this.killButton);
        this.title.appendChild(this.clear);
        
        this.container.appendChild(this.title);
        this.container.appendChild(this.body);

        this.killCallback = function() {
            that.destroyWindow();
        };

        this.killButton.addEventListener('click', this.killCallback);

        var lastX  = 0,
            lastY  = 0;

        this.initializeMove = function(pos) {
            lastX = pos.clientX;
            lastY = pos.clientY;

            document.body.addEventListener('mousemove', moveCallback);
            document.body.addEventListener('mouseup',   that.deactivateMove);
        };

        this.deactivateMove = function() {
            document.body.removeEventListener('mousemove', moveCallback);
            document.body.removeEventListener('mouseup',   that.deactivateMove);
        };

        var moveCallback = function(pos) {
            var newX = pos.clientX - lastX,
                newY = pos.clientY - lastY;

            lastX = pos.clientX;
            lastY = pos.clientY;

            that.x = that.x + newX;
            that.y = that.y  + newY;

            container.style.left = that.x + 'px';
            container.style.top  = that.y + 'px';
        };

        this.title.addEventListener('mousedown', this.initializeMove);
     },

     destroyWindow: function() {
        if(this.container === null) {
            return;
        }
        
        this.killButton.removeEventListener('click',   this.killCallback);
        this.title.removeEventListener('mousedown',    this.initializeMove);
        document.body.removeEventListener('mouseup',   this.deactivateMove);
        document.body.removeChild(this.container);

        this.container  = null;
        this.body       = null;
        this.title      = null;
        this.clear      = null;
        this.killButton = null;
        this.span       = null;

        this.killCallback   = null;
        this.initializeMove = null;
     }
};

module.exports = FloatingWindow;
