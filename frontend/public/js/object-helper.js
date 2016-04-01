"use strict";

function forEach(callback, thisArg) {
    var that = this;
    Object.keys(this).forEach(function(key, i, arr) {
        callback.call(thisArg, that[key], key, i, arr);
    });
};

function filter(callback) {
    var newObj = {},
        that   = this;
    Object.keys(this).forEach(function(key, i, arr) {
        if(callback(that[key], key, i, arr)) {
            newObj[key] = that[key];
        }
    });

    return newObj;
};

function copyArray(arr) {
    var newArr = [];

    arr.forEach(function(value) {
        if(Array.isArray(value)) {
            newArr.push(copyArray(value));
        } else if(typeof value === "object") {
            newArr.push(copy.call(value.copy));
        } else {
            newArr.push(value);
        }
    });

    return newArr;
}

function copy() {
    var newObj   = {};

    Object.keys(this).forEach(function(key) {
        var value = this[key];
        if(Array.isArray(value)) {
            newObj[key] = copyArray(value);
        } else if(typeof value === "object" && value) {
            newObj[key] = copy.call(value);
        } else {
            newObj[key] = value;
        }
    }, this);

    return newObj
};

function size() {
    return Object.keys(this).length;
};

function map(callback) {
    var newObj = {},
        that   = this;
    Object.keys(this).forEach(function(key, i, arr) {
        newObj[key] = callback(that[key], key, i, arr);
    });

    return newObj;
};

function merge() {
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

function slice(from, to) {
    var newObj = {},
        that   = this;

    var slice = Object.keys(this).slice(from, to);
    slice.forEach(function(key) {
        newObj[key] = that[key];
    });

    return newObj;
};

function first() {
    var arr = Object.keys(this);
    var length = arr.length;
    if(length === 0) {
        return undefined;
    }

    return this[arr[0]];
};

function last() {
    var arr = Object.keys(this);
    var length = arr.length;
    if(length === 0) {
        return undefined;
    }

    return this[arr[arr.length-1]];
};

function lastKey() {
    var arr = Object.keys(this);
    var length = arr.length;
    if(length === 0) {
        return undefined;
    }

    return arr[arr.length-1];
};

module.exports = {
    filter:  filter,
    slice:   slice,
    first:   first,
    last:    last,
    size:    size,
    lastKey: lastKey,
    merge:   merge,
    map:     map,
    forEach: forEach,
    copy:    copy
};