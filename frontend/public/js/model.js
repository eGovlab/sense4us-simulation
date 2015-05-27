'use strict';

var Immutable = require('Immutable');

function Model(element) {
    if (!(this instanceof Model)) {
        throw new Error('Accessing Model as a generic method.');
    }

    this.id       = null;
    this.authorId = null;
    this.author   = '';
    this.synced   = false;
    this.syncId   = null;
    this._name    = null;
    this.local    = false;

    this.nextId   = 0;

    Object.defineProperty(this, 'name', {
        get: function() {
            if (this._name === null) {
                return 'local:' + this.id + ': New Model';
            } else {
                return this._name;
            }
        },

        set: function(name) {
            if (typeof name === 'string') {
                this._name = name;
            } else {
                this._name = 'Invalid Name.';
            }
        }
    });

    this.nodeData = Immutable.Map();
    this.nodeGui  = Immutable.Map();
    this.links    = Immutable.Map();
}

Model.prototype = {
    setAuthor: function(author, id) {
        if (id && typeof id === 'number') {
            this.authorId = id;
        }

        if (author && typeof author === 'string') {
            this.author = author;
        }
    },

    generateId: function() {
        this.nextId += 1;
        return this.nextId - 1;
    },

    setData: function(data) s
        this.nodeData = this.nodeData.set(data.get('id'), data);
    },

    setGui: function(data) {
        this.nodeGui = this.nodeGui.set(data.get('id'), data);
    },

    setLink: function(data) {
        this.links = this.links.set(data.get('id'), data);
    },

    setId: function(id) {
        if (typeof id === 'number') {
            this.id = id;
        }
    },

    setSyncId: function(id) {
        if (typeof id === 'number') {
            this.syncId = id;
        }
    },

    getId: function() {
        if (this.synced && !this.local) {
            return '' + this.id;
        } else {
            return 'local:' + this.id;
        }
    },

    getSyncId: function() {
        if (this.synced) {
            return '' + this.syncId;
        } else {
            return false;
        }
    },

    setOption: function(element) {
        this.option = element;
    },

    refresh: function() {

    }
};

module.exports = Model;