/**
* @namespace sense4us.graphics
*/

var sense4us = sense4us || {};
sense4us.graphics = sense4us.graphics || {};

/**
* A class to create the graphic for different nodes.
* @class node
*/

sense4us.graphics.node = function(entity, stage) {
	var color = sense4us.graphics.color;

	var border_circle = new createjs.Shape();
	border_circle.graphics.beginFill(color.get_color("border_circle")).drawCircle(0, 0, color.get_property("border_circle_radius"));

	var circle = new createjs.Shape();
	circle.graphics.beginRadialGradientFill(color.get_gradient("circle"),
		[0, 1], 0, 0, 50, 
		-8, -8, 46).drawCircle(0, 0, color.get_property("circle_radius"));

	var signal_label = new createjs.Text("THIS NOT BE USED", "bold 14px Arial", color.get_color("label"));
	signal_label.textAlign = "center";
	signal_label.y = -7;
	//signal_label.x = -3;
	signal_label.shadow = new createjs.Shadow(color.get_color("label_shadow"), 0, 0, color.get_property("label_shadow_blur"));

	/*var signal_fire_label = new createjs.Text("(" + entity.signal_fire + ")", "bold 14px Arial", color.get_color("label"));
	signal_fire_label.textAlign = "left";
	signal_fire_label.x = 3;
	signal_fire_label.y = -7;
	signal_fire_label.shadow = new createjs.Shadow(color.get_color("label_shadow"), 0, 0, color.get_property("label_shadow_blur"));
	*/
	var name_label = new createjs.Text(entity.id, "bold 14px Arial", color.get_color("label"));
	name_label.textAlign = "center";
	name_label.y = -75;
	name_label.shadow = new createjs.Shadow(color.get_color("label_shadow"), 0, 0, color.get_property("label_shadow_blur"));

	var circle_container = new createjs.Container();

	//circle_container.addChild(border_circle, circle, signal_label, signal_fire_label, name_label);
	circle_container.addChild(border_circle, circle, signal_label, name_label);

	var that = Object.create(sense4us.graphics.graphic(entity, stage));

	that.container.type = "node";
	that.container.addChild(circle_container);

	that.container.x = that.container.y = 100;

	that.update = function() {
		//entity.signal
		signal_label.text = (parseFloat(entity.signal)*100).toFixed(2) + "%";
		//signal_fire_label.text = entity.signal_fire;
		name_label.text = entity.name;
		that.container.x = parseInt(entity.x);
		that.container.y = parseInt(entity.y);
	}

	entity.set("x", that.container.x);
	entity.set("y", that.container.y);

	that.update();
	stage.update();

	return that;
}