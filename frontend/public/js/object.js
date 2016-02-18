"use strict";

Object.prototype.forEach = function(callback, thisArg) {
    var that = this;
    Object.keys(this).forEach(function(key, i, arr) {
        callback.call(thisArg, that[key], key, i, arr);
    });
};

Object.prototype.filter = function(callback) {
    var newObj = {},
        that   = this;
    Object.keys(this).forEach(function(key, i, arr) {
        if(callback(that[key], key, i, arr)) {
            newObj[key] = that[key];
        }
    });

    return newObj;
};

Object.prototype.size = function() {
    return Object.keys(this).length;
};

Object.prototype.map = function(callback) {
    var newObj = {},
        that   = this;
    Object.keys(this).forEach(function(key, i, arr) {
        newObj[key] = callback(that[key], key, i, arr);
    });

    return newObj;
};

function copyArray(arr) {
    var newArr = [];

    arr.forEach(function(value) {
        if(Array.isArray(value)) {
            newArr.push(copyArray(value));
        } else if(typeof value === "object") {
            newArr.push(value.copy());
        } else {
            newArr.push(value);
        }
    });

    return newArr;
}

Object.prototype.copy = function() {
    var newObj = {};

    Object.keys(this).forEach(function(key) {
        var value = this[key];
        if(Array.isArray(value)) {
            newObj[key] = copyArray(value);
        } else if(typeof value === "object" && value) {
            newObj[key] = value.copy();
        } else {
            newObj[key] = value;
        }
    }, this);

    return newObj
};

Object.prototype.merge = function() {
    var newObj = {},
        that   = this;

    Object.keys(this).forEach(function(key) {
        newObj[key] = that[key];
    });

    for(var i = 0; i < arguments.length; i++) {
        if(typeof arguments[i] !== "object") {
            return;
        }

        var obj = arguments[i];
        Object.keys(obj).forEach(function(key) {
            newObj[key] = obj[key];
        });
    }

    return newObj;
};

Object.prototype.slice = function(from, to) {
    var newObj = {},
        that   = this;

    var slice = Object.keys(this).slice(from, to);
    slice.forEach(function(key) {
        newObj[key] = that[key];
    });

    return newObj;
};

Object.prototype.first = function() {
    var arr = Object.keys(this);
    var length = arr.length;
    if(length === 0) {
        return undefined;
    }

    return arr[0];
};

Object.prototype.last = function() {
    var arr = Object.keys(this);
    var length = arr.length;
    if(length === 0) {
        return undefined;
    }

    return this[arr[arr.length-1]];
};

Object.prototype.lastKey = function() {
    var arr = Object.keys(this);
    var length = arr.length;
    if(length === 0) {
        return undefined;
    }

    return arr[arr.length-1];
};