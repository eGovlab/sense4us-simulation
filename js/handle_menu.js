var sense4us = sense4us || {};

sense4us.events.bind("object_selected", function(object) {
	console.log(object);
	if (object.type == "node") {
		sense4us.selection_menu.set_selected_object(object.graphics.container, sense4us.stage);
	}
});

sense4us.events.bind("object_deselected", function(object) {
	sense4us.selection_menu.clear(sense4us.stage);
});