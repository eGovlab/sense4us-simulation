'use strict';

module.exports = function(canvas, container) {
		container.style.width = (document.body.clientWidth - 180).toString() + 'px';

		canvas.width = container.offsetWidth;
		canvas.height = container.offsetHeight;

		canvas.onmousedown = function(event){
			event.preventDefault();
		};

		return canvas;
};