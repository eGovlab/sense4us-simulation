'use strict';

module.exports = {
	mouseToCanvas: function(pos, canvas) {
		var x = pos.x - canvas.offsetLeft;
		var y = pos.y - canvas.offsetTop;

		return {x: x, y: y};
	},
	canvasToMouse: function(pos, canvas) {
		var x = pos.x + canvas.offsetLeft;
		var y = pos.y + canvas.offsetTop;

		return {x: x, y: y};
	}
};