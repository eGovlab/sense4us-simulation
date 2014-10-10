/**
* @namespace sense4us.entities
*/

var sense4us = sense4us || {};

sense4us.entities = sense4us.entities || {};

sense4us.entities.selection_menu = function(id) {
	var id = id;

	var that = {
		update: function(parent, stage) {
			if (that.graphics.container.parent != null) {
				that.graphics.container.parent.removeChild(that.graphics.container);
			}

			parent.addChild(that.graphics.container);
			
			sense4us.events.trigger("object_updated", that);
		},
		clear: function(stage) {
			if (that.graphics.container.parent != null) {
				that.graphics.container.parent.removeChild(that.graphics.container);
			}
			
			sense4us.events.trigger("object_updated", that);
		},
		id: function() {
			return id;
		}()
	};

	return that;
}