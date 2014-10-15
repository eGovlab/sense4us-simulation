var sense4us = sense4us || {};

sense4us.mousepos_to_stagepos = function(pos, stage) {
	var x = (pos.x - stage.x) / stage.scaleX;
	var y = (pos.y - stage.y) / stage.scaleY;

	return {x: x, y: y};
}

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

	var img = new createjs.Bitmap("http://subtlepatterns.com/patterns/footer_lodyas.png");
	var back = new createjs.Shape();
	stage.addChild(back);
	back.x = 0;
	back.y = 0;

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
		var moved = false;

		var offset = {x: stage.x - e.stageX, y: stage.y - e.stageY};
		stage.addEventListener("stagemousemove",function(evt) {
			var click_pos = sense4us.mousepos_to_stagepos(e.stageX, e.stageY);
			if (!stage.hitTest(click_pos)) {
				stage.x = evt.stageX + offset.x;
				stage.y = evt.stageY + offset.y;
				stage.update();
				moved = true;
			}
		});

		stage.addEventListener("stagemouseup", function(){
			stage.removeAllEventListeners("stagemousemove");

			if (!moved) {
				var click_pos = sense4us.mousepos_to_stagepos(e.stageX, e.stageY);
				if (!stage.hitTest(click_pos) && sense4us.selected_object) {
					console.log("LOL");
					sense4us.selected_object = null;
					sense4us.events.trigger("object_deselected");
				}
			}
		});
	});
}