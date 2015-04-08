"use strict";

var sense4us = sense4us || {};

sense4us.select_object = function(object) {
	if (sense4us.selected_object == object) {
		sense4us.deselect_object();
	} else {
		sense4us.selected_object = object;
		sense4us.events.trigger("object_selected", object);
	}
};

sense4us.deselect_object = function() {
	if (sense4us.selected_object !== null) {
		sense4us.events.trigger("object_deselected", sense4us.selected_object);
		sense4us.selected_object = null;
	}
};