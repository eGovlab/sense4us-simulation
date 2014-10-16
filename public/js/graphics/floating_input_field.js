/**
* @namespace sense4us.graphics
*/

var sense4us = sense4us || {};
sense4us.graphics = sense4us.graphics || {};

/**
* Create input fields floating above the canvas
* @class graphic
*/
sense4us.graphics.floating_input_field = function(entity, stage) {
	var input_container = $("#edit_signal_fire");

	var that = {
		show: function() {
			input_container.show();
			input_container.html("<input name='signal_fire' value='" + entity.signal_fire + "' />");
			input_container.find("input").change(function(event) {
				entity.set($(this).prop("name"), $(this).val());
				entity.events.trigger("update", entity);
			});

			that.update();
		},
		update: function() {
			var pos =
				{
					x: entity.get_x(),
					y: entity.get_y()
				};
				
			pos = sense4us.stagepos_to_mousepos(
				pos,
				sense4us.stage
			);

			pos.x = pos.x + $("#menu").width();
			input_container.offset({left: pos.x, top: pos.y});
		},
		hide: function() {
			var input_container = $("#edit_signal_fire");
			input_container.hide();
			input_container.html();
		},
		set_entity: function(new_entity) {
			entity = new_entity;
		}
	}

	return that;
}()
