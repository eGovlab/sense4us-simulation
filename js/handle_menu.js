var sense4us = sense4us || {};

sense4us.events.bind("object_selected", function(object) {
	sense4us.graphics.menu.update(object.graphic, sense4us.stage);
});

sense4us.events.bind("object_deselected", function(object) {
	sense4us.graphics.menu.clear(sense4us.stage);
});