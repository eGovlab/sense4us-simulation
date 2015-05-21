'use strict';

function ModeLayer() {
    if(!(this instanceof ModeLayer)) {
        throw new Error('Accessing ModeLayer as a generic method.');
    }

    this.currentMode = false;
    this.modes = {};
}

ModeLayer.prototype = {
    addMode: function(name, callback) {
        if(this.modes[name]) {
            throw new Error('Mode already exists');
        }

        if(!callback || typeof callback !== 'function') {
            throw new Error('Callback invalid.');
        }

        this.modes[name] = callback;
    },

    setMode: function(name) {
        if(this.modes[name]) {
            throw new Error('Mode does not exist. Can\'t set ' + name);
        }

        this.currentMode = this.modes[name];
    },

    iterateModes: function(callback) {
        var that = this;
        Object.keys(this.modes).forEach(function(key) {
            callback(key, that.modes[key]);
        });
    }
};

module.exports = new ModeLayer();