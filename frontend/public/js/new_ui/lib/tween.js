'use strict';

var tweening = {
    easeInQuad: function(t, b, c, d) {
        t /= d;
        return c * t * t + b;
    },

    easeOutCirc: function(t, b, c, d) {
        t /= d;
        t--;
        return c * Math.sqrt(1 - t*t) + b;
    }
};

function Tween(tween, width, duration, callback, onEnd) {
    if(!tweening[tween]) {
        throw new Error('Trying tweening with non existent tween');
    }

    var tweenFunc = tweening[tween];
    var FPS = 1000 / 60;

    var startTime  = Date.now();
    var value      = 0;

    this.stopTween = false;
    var that       = this;

    var recursive = function() {
        if(that.stopTween) {
            that.isDone = true;
            return;
        }

        var timeSinceStart = Date.now() - startTime;
        callback(tweenFunc(timeSinceStart, 0, width, duration));

        if(timeSinceStart > duration) {
            that.isDone = true;
            callback(width);
            if(onEnd) {
                onEnd();
            }
            return;
        }

        setTimeout(recursive, FPS);
    };

    recursive();
}

Tween.prototype = {
    stop: function() {
        this.stopTween = true;
    }
};

function easeOutCirc(width, duration, callback, onEnd) {
    return new Tween('easeOutCirc', width, duration, callback, onEnd);
}

module.exports = {
    easeOutCirc: easeOutCirc
}