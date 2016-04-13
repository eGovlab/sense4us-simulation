'use strict';

module.exports = {
	mouseToCanvas: function(pos, canvas) {
        var sumX = 0,
            sumY = 0;

        var parent = canvas.offsetParent;
        while(parent) {
            if(parent.offsetLeft) {
                sumX += parent.offsetLeft;
            }

            if(parent.offsetTop) {
                sumY += parent.offsetTop;
            }

            parent = parent.offsetParent;
        }

        sumX += canvas.offsetLeft;
        sumY += canvas.offsetTop;

		var x = pos.x - sumX + (canvas.panX || 0);
		var y = pos.y - sumY + (canvas.panY || 0);

		return {x: x, y: y};
	},

	canvasToMouse: function(pos, canvas) {
        var sumX = 0,
            sumY = 0;

        var parent = canvas.offsetParent;
        while(parent) {
            if(parent.offsetLeft) {
                sumX += parent.offsetLeft;
            }

            if(parent.offsetTop) {
                sumY += parent.offsetTop;
            }

            parent = parent.offsetParent;
        }

        sumX += canvas.offsetLeft;
        sumY += canvas.offsetTop;

		var x = pos.x + sumX - (canvas.panX || 0);
		var y = pos.y + sumY - (canvas.panY || 0);

		return {x: x, y: y};
	}
};
