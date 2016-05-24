'use strict';

module.exports = function(container, canvas) {
    canvas.width  = container.offsetWidth;
    canvas.height = ((container.offsetHeight-20) * 0.50);

    var timer = null;

	canvas.onmousedown = function(event){
		event.preventDefault();
	};

	return canvas;
};