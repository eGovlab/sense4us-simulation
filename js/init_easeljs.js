var sense4us = sense4us || {};

sense4us.init_easeljs = function() {
	//Draw a square on screen.
	var canvas = document.getElementById("canvas");
	var container = document.getElementById("container");

	container.style.width = (document.body.clientWidth - 180).toString() + "px";

	canvas.width = container.offsetWidth;
	canvas.height = container.offsetHeight;

	window.onresize = function()
	{
		container.style.width = (document.body.clientWidth - 180).toString() + "px";
	
		canvas.width = container.offsetWidth;
		canvas.height = container.offsetHeight;

		sense4us.stage.update();
	};

	sense4us.stage = new createjs.Stage("canvas");

	document.getElementById( "canvas" ).onmousedown = function(event){
		event.preventDefault();
	};

	// this lets our drag continue to track the mouse even when it leaves the canvas:
	// play with commenting this out to see the difference.
	sense4us.stage.mouseMoveOutside = true;

	// enable touch interactions if supported on the current device:
	createjs.Touch.enable(sense4us.stage);

	var stage = sense4us.stage;

	//sense4us.stage.enableMouseOver(20);

	canvas.addEventListener("mousewheel", MouseWheelHandler, false);
	canvas.addEventListener("DOMMouseScroll", MouseWheelHandler, false);

	var zoom;

	function MouseWheelHandler(e) {
		if(Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)))>0)
			zoom=1.1;
		else
			zoom=1/1.1;
		stage.scaleX=stage.scaleY*=zoom;

		stage.update();

	}

	stage.on("stagemousedown", function(e) {
			var objects = sense4us.stage.getObjectsUnderPoint(((e.stageX - sense4us.stage.x) / stage.scaleX), ((e.stageY - sense4us.stage.y) / stage.scaleY));
			console.log(e.stageX / stage.scaleX, sense4us.stage.scaleX, sense4us.stage.x, objects);
		var offset = {x: stage.x - e.stageX, y: stage.y - e.stageY};
		stage.addEventListener("stagemousemove",function(evt) {
			var objects = stage.getObjectsUnderPoint((evt.stageX/stage.scaleX) - stage.x, (evt.stageY/stage.scaleY) - stage.y);

			if (!sense4us.mechanics.is_dragging) {
				stage.x = evt.stageX + offset.x;
				stage.y = evt.stageY + offset.y;
				stage.update();
			}
		});
		stage.addEventListener("stagemouseup", function(){
			stage.removeAllEventListeners("stagemousemove");
		});
	});
}