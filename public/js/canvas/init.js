"use strict";

var arithmetics = require('./arithmetics.js');

module.exports = function(canvas, container) {
	//Draw a square on screen.
	var stage = new createjs.Stage(canvas.id);

	container.style.width = (document.body.clientWidth - 180).toString() + "px";

	canvas.width = container.offsetWidth;
	canvas.height = container.offsetHeight;

	canvas.onmousedown = function(event){
		event.preventDefault();
	};

	// this lets our drag continue to track the mouse even when it leaves the canvas:
	// play with commenting this out to see the difference.
	stage.mouseMoveOutside = true;

	// enable touch interactions if supported on the current device:
	createjs.Touch.enable(stage);

	var stage = stage;

	var img = new createjs.Bitmap("http://subtlepatterns.com/patterns/footer_lodyas.png");
	var back = new createjs.Shape();
	stage.addChild(back);
	back.x = 0;
	back.y = 0;

	//stage.enableMouseOver(20);

	canvas.addEventListener("mousewheel", mouseWheelHandler, false);
	canvas.addEventListener("DOMMouseScroll", mouseWheelHandler, false);

	var zoom;

	function mouseWheelHandler(e) {
		var mouse_canvas_x = e.x - stage.canvas.offsetLeft;
		var mouse_canvas_y = e.y - stage.canvas.offsetTop;
		var mouse_stage_x = mouse_canvas_x / stage.scaleX - stage.x / stage.scaleX;
		var mouse_stage_y = mouse_canvas_y / stage.scaleY - stage.y / stage.scaleY;

		if(Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)))>0)
			zoom=1.1;
		else
			zoom=1/1.1;
		stage.scaleX=stage.scaleY*=zoom;

		var mouse_stage_new_x = mouse_canvas_x / stage.scaleX - stage.x / stage.scaleX;
		var mouse_stage_new_y = mouse_canvas_y / stage.scaleY - stage.y / stage.scaleY;

		var zoom_effect_x = (mouse_stage_new_x-mouse_stage_x)*stage.scaleX;
		var zoom_effect_y = (mouse_stage_new_y-mouse_stage_y)*stage.scaleY;
		stage.x += zoom_effect_x;
		stage.y += zoom_effect_y;

		sense4us.events.trigger("stage_zoom", stage);

		stage.update();
	}

	var moved = false;
	stage.on("stagemousedown", function(e) {
		var offset = {x: stage.x - e.stageX, y: stage.y - e.stageY};
		stage.addEventListener("stagemousemove",function(evt) {
			var click_pos = arithmetics.mousepos_to_stagepos({x: e.stageX, y: e.stageY}, stage);
			if (!stage.hitTest(click_pos) || sense4us.active_modes.indexOf(stage.mode) == -1) {
				stage.x = evt.stageX + offset.x;
				stage.y = evt.stageY + offset.y;
				sense4us.events.trigger("stage_pan", stage);
				stage.update();
				moved = true;
			}
		});

		stage.addEventListener("stagemouseup", function(){
			stage.removeAllEventListeners("stagemousemove");
			stage.removeAllEventListeners("stagemouseup");

			if (!moved) {
				var click_pos = sense4us.mousepos_to_stagepos({x: e.stageX, y: e.stageY}, stage);
				if (!stage.hitTest(click_pos) && sense4us.selected_object) {
					var selected_object = sense4us.selected_object;
					sense4us.selected_object = null;
					sense4us.events.trigger("object_deselected", selected_object);
				}
			}

			moved = false;
		});
	});

	return stage;
};
