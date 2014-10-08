var sense4us = sense4us || {};

sense4us.menu_graphic = function() {
	var menu = new createjs.Shape();
	menu.graphics.beginFill("blue").drawCircle(0, 0, 50);
	menu.set({x: 0, y: 50});

	var that = {
		update: function(parent, stage) {
			if (menu.parent != null) {
				menu.parent.removeChild(menu);
			}

			parent.addChild(menu);

			stage.update();
		},
		clear: function(stage) {
			if (menu.parent != null) {
				menu.parent.removeChild(menu);
			}

			stage.update();
		}
	};

	return that;
}();

sense4us.events.bind("object_selected", function(object) {
	sense4us.menu_graphic.update(object.graphic, sense4us.stage);
});

sense4us.events.bind("object_deselected", function(object) {
	sense4us.menu_graphic.clear(sense4us.stage);
});