/**
* @namespace sense4us.entities
*/

var sense4us = sense4us || {};

sense4us.entities = sense4us.entities || {};

sense4us.entities.selection_menu = function(id) {
	var id = id;

	var that = {
		set_selected_object: function(entity, stage) {
			if (that.graphics.container.parent != null) {
				that.graphics.container.parent.removeChild(that.graphics.container);
			}

			entity.events.bind("update", function(object) {
				that.graphics.update();
			}, "update_selection_menu");

			sense4us.events.bind("stage_pan", function(object) {
				that.graphics.update();
			}, "update_selection_menu");

			sense4us.events.bind("stage_zoom", function(object) {
				that.graphics.update();
			}, "update_selection_menu");

			entity.graphics.container.addChild(that.graphics.container);
			that.graphics.update();
			
			sense4us.events.trigger("object_updated", that);
		},
		clear: function(entity, stage) {
			if (that.graphics.container.parent != null) {
				that.graphics.container.parent.removeChild(that.graphics.container);
			}
			
			entity.events.unbind("update", "update_selection_menu");
			sense4us.events.unbind("stage_pan", "update_selection_menu");
			sense4us.events.unbind("stage_zoom", "update_selection_menu");
			that.graphics.update();

			sense4us.events.trigger("object_updated", that);
		},
		id: function() {
			return id;
		}()
	};

	return that;
}