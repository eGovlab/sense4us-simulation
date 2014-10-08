var sense4us = sense4us || {};

sense4us.node_graphic = function(node, stage) {
	var circle = new createjs.Shape();
	circle.graphics.beginFill("red").drawCircle(0, 0, 50);

	var label = new createjs.Text(node.get("id"), "bold 14px Arial", "#FFFFFF");
	label.textAlign = "center";
	label.y = -7;

	var dragger = new createjs.Container();
	dragger.x = dragger.y = 100;
	dragger.addChild(circle, label);
	stage.addChild(dragger);

	dragger.on("pressmove",function(evt) {
		// currentTarget will be the container that the event listener was added to:
		evt.currentTarget.x = evt.stageX;
		evt.currentTarget.y = evt.stageY;
		// make sure to redraw the stage to show the change:
		stage.update();   
	});

	stage.update();
}