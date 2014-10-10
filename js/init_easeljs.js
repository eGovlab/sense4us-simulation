var sense4us = sense4us || {};

sense4us.init_easeljs = function() {
	//Draw a square on screen.
	var canvas = document.getElementById('canvas');
	sense4us.stage = new createjs.Stage("canvas");

	document.getElementById( "canvas" ).onmousedown = function(event){
	    event.preventDefault();
	};

	// this lets our drag continue to track the mouse even when it leaves the canvas:
	// play with commenting this out to see the difference.
	sense4us.stage.mouseMoveOutside = true;

	// enable touch interactions if supported on the current device:
	createjs.Touch.enable(sense4us.stage);

	//sense4us.stage.enableMouseOver(20);
}