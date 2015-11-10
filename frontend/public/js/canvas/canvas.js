'use strict';

module.exports = function(canvas, refresh) {
    var parent = canvas.parentElement;
    if (parent !== null) {
        canvas.width  = parent.offsetWidth;
        canvas.height = (parent.offsetHeight - 70) * 0.50;

        /*var timer = null;
        window.addEventListener('resize', function() {
            if (timer !== null) {
                clearTimeout(timer);
            }

            timer = setTimeout(function() {
                canvas.width  = parent.offsetWidth;
                canvas.height = parent.offsetHeight;

                refresh();
            }, 500);
        });*/
    }

	canvas.onmousedown = function(event){
		event.preventDefault();
	};

	return canvas;
};