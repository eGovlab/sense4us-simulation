'use strict';

var Element  = require('./element.js'),
    Foldable = require('./foldable.js'),
    Tween    = require('./tween.js');

var easeOutCirc = Tween.easeOutCirc;

function VerticalFoldable(height, positional) {
    if(!height) {
        throw new Error('Creating vertical foldable without height.');
    }

    if(typeof height !== 'number') {
        throw new Error('Width given must be a number.');
    }

    this.root = document.createElement('div');

    this.setHeight(0);

    this.folded         = true;
    this.foldableHeight = height;
    this.children       = [];
}

VerticalFoldable.prototype = {
    fold: function(onDone) {
        this.children.forEach(function(child) {
            if(child instanceof Foldable) {
                child.fold();
            }
        });

        if(this.currentTween) {
            this.currentTween.stop();
        }

        var currentHeight = this.getHeight();
        var destination  = currentHeight;

        this.root.style['overflow-y'] = 'hidden';

        var that = this;
        this.currentTween = easeOutCirc(destination, 250, function(width) {
            that.setHeight(currentHeight - width);
        }, onDone);

        this.folded = true;
    },

    unfold: function(onDone) {
        this.children.forEach(function(child) {
            if(child instanceof Foldable) {
                child.unfold();
            }
        });

        if(this.currentTween) {
            this.currentTween.stop();
        }

        var currentHeight = this.getHeight();
        var destination  = this.foldableHeight - currentHeight;

        var that = this;
        this.currentTween = easeOutCirc(destination, 250, function(width) {
            that.setHeight(currentHeight + width);
        }, function(_) {that.root.style['overflow-y'] = 'auto'; if(onDone) {onDone(_);}});
        this.folded = false;
    },

    invert: function(onDone) {
        if(this.folded) {
            this.unfold(onDone);
        } else {
            this.fold(onDone);
        }
    },

    __proto__: Foldable.prototype
};

module.exports = VerticalFoldable;