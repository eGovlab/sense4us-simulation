'use strict';

function Popup(text) {
    if(!(this instanceof Popup)) {
        throw new Error('Accessing Popup as a generic method.');
    }

    if(!text || typeof text !== "string") {
        throw new Error('Popup constructor parameters given are invalid.');
    }

    this.element           = document.createElement('div');
    this.element.innerHTML = text;
    this.text              = text;

    this.element.className = "fade-in";
}

Popup.prototype = {
    fadeOut: function(onEnd) {
        this.element.className = "fade-out";
        setTimeout(function() {
            onEnd();
        }, 1000);
    }
};

module.exports = Popup;