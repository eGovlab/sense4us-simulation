var sense4us = sense4us || {};

sense4us.events.bind("object_selected", function(object) {
	sense4us.selection_menu.update(object.graphics.container, sense4us.stage);
});

sense4us.events.bind("object_deselected", function(object) {
	sense4us.selection_menu.clear(sense4us.stage);
});