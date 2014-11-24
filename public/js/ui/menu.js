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

		sense4us.stage.mode = id;
		for (var pos in sense4us.entities.id_to_entity) {
			var e = sense4us.entities.id_to_entity[pos];
			e.events.trigger("update", e);
		}
		
		var selected_object = sense4us.selected_object;
		sense4us.selected_object = null;
		sense4us.events.trigger("object_deselected", selected_object);

		if (id == "view") {
			console.log("lule");
			$("#sense4us_timelag").slider({
				value: 0,
				min: 0,
				max: sense4us.simulation.get_simulation_max_time(),
			      slide: function( event, ui ) {
			        $( "#sense4us_timelag_amount" ).val( ui.value + "m" );
			      }
			});

			$( "#sense4us_timelag_amount" ).val( 0 + "m" );
		}
	}
};