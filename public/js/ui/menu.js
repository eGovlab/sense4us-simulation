"use strict";

var sense4us = sense4us || {};

sense4us.menu = {
	opened_menu: null,
	open: function(id) {
		if (this.opened_menu !== null) {
			this.opened_menu.hide();
		}

		this.opened_menu = $("#" + id + "_menu");
		this.opened_menu.show();

		if (sense4us.stage) {
			sense4us.stage.mode = id;
			for (var pos in sense4us.entities.id_to_entity) {
				var e = sense4us.entities.id_to_entity[pos];
				e.events.trigger("update", e);
			}
		}
	}
};