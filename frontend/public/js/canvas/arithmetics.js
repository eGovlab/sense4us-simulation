'use strict';

module.exports = {
	mouseToCanvas: function(pos, canvas) {
		var x = pos.x - canvas.offsetLeft + (canvas.panX || 0);
		var y = pos.y - canvas.offsetTop + (canvas.panY || 0);

		return {x: x, y: y};
	},
	canvasToMouse: function(pos, canvas) {
		var x = pos.x + canvas.offsetLeft - (canvas.panX || 0);
		var y = pos.y + canvas.offsetTop - (canvas.panY || 0);

		return {x: x, y: y};
	}
};