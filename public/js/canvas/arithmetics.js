'use strict';

module.exports = {
	mousepos_to_stagepos: function(pos, stage) {
		var x = (pos.x / stage.scaleX) - stage.x;
		var y = (pos.y / stage.scaleY) - stage.y;

		return {x: x, y: y};
	},
	stagepos_to_mousepos: function(pos, stage) {
		var x = (pos.x) * stage.scaleX + stage.x;
		var y = (pos.y) * stage.scaleY + stage.y;

		return {x: x, y: y};
	}
};