'use strict';

var Element = require('./element.js'),
    Tween   = require('./tween.js');

var easeOutCirc = Tween.easeOutCirc;

function Foldable(width, positional) {
    if(!width) {
        throw new Error('Creating foldable without width.');
    }

    if(typeof width !== 'number') {
        throw new Error('Width given must be a number.');
    }

    this.root = document.createElement('div');

    if(positional) {
        this.setWidth(width);
    } else {
        this.setWidth(0);
    }

    this.folded        = true;
    this.foldableWidth = width;
    this.children      = [];
}

Foldable.prototype = {
    fold: function(onDone) {
        this.children.forEach(function(child) {
            if(child instanceof Foldable) {
                child.fold();
            }
        });

        if(this.currentTween) {
            this.currentTween.stop();
        }

        var currentWidth = this.getWidth();
        var destination  = currentWidth;

        var that = this;
        this.currentTween = easeOutCirc(destination, 250, function(width) {
            that.setWidth(currentWidth - width);
        }, onDone);

        this.folded      = true;
    },

    unfold: function(onDone) {
        this.children.forEach(function(child) {
            if(child instanceof Foldable) {
                if(child.wasUnfolded) {
                    child.unfold();
                }
            }
        });

        if(this.currentTween) {
            this.currentTween.stop();
        }

        var currentWidth = this.getWidth();
        var destination  = this.foldableWidth - currentWidth;

        var that = this;
        this.currentTween = easeOutCirc(destination, 250, function(width) {
            that.setWidth(currentWidth + width);
        }, onDone);

        this.folded = false;
    },

    positionalFold: function() {
        this.children.forEach(function(child) {
            if(child instanceof Foldable) {
                child.fold();
            }
        });

        if(this.currentTween) {
            this.currentTween.stop();
        }

        var currentLeft = this.getLeft();
        var destination = currentLeft;

        if(destination === 0) {
            this.folded = true;
            return;
        }

        var that = this;
        this.currentTween = easeOutCirc(destination, 250, function(left) {
            that.setLeft(currentLeft - left);
        });

        this.folded = true;
    },

    positionalUnfold: function() {
        this.children.forEach(function(child) {
            if(child instanceof Foldable) {
                child.unfold();
            }
        });

        if(this.currentTween) {
            this.currentTween.stop();
        }

        var currentLeft = this.getLeft();
        var destination = this.foldableWidth - currentLeft;

        var that = this;
        this.currentTween = easeOutCirc(destination, 250, function(left) {
            that.setLeft(currentLeft + left);
        });

        this.folded = false;
    },

    positionalInvert: function() {
        if(this.folded) {
            this.positionalUnfold();
        } else {
            this.positionalFold();
        }
    },

    invert: function(onDone) {
        if(this.folded) {
            this.unfold(onDone);
        } else {
            this.fold(onDone);
        }
    },

    __proto__: Element.prototype
};

module.exports = Foldable;