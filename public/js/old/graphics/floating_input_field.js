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

	var that = Object.create(sense4us.graphics.graphic(entity, stage));

	that.container.y = 3;
	that.container.x = 0;

	that.show = function() {
		input_container.show();
		input_container.html("<input name='signal_fire' size='" + (entity.signal_fire.length) + "' value='" + entity.signal_fire + "' />");
		input_container.find("input").change(function(event) {
			entity.set($(this).prop("name"), $(this).val());
			entity.events.trigger("update", entity);
		});

		that.update();
	};

	that.update = function() {
		var pos = that.container.localToGlobal(0, 0);
		pos.x = pos.x + $("#" + sense4us.stage.canvas.id).offset().left;
		pos.y = pos.y + $("#" + sense4us.stage.canvas.id).offset().top;
		input_container.height(14 * sense4us.stage.scaleY);
		input_container.css("font-size", 14 * sense4us.stage.scaleY);
		input_container.offset({left: pos.x, top: pos.y});
	};

	that.hide = function() {
		var input_container = $("#edit_signal_fire");
		input_container.hide();
		input_container.html();
	};

	that.set_entity = function(new_entity) {
		entity = new_entity;
	};

	return that;
}
