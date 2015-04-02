"use strict";

var init_easeljs = require("./init.js");

var canvas = {
	init: function(canvas, container) {
		return init_easeljs(canvas, container);
	}
};



module.exports = canvas;