/**
* @namespace sense4us.entities
*/

var sense4us = sense4us || {};

sense4us.entities = sense4us.entities || {};

/**
* @class link
* @constructor
* @param id {Integer} This integer must be a unique identifier for this created link.
* @param node1 {Node} The node which this connection receives signals from
* @param node2 {Node} The node which this connection transfers signals to
* @param co {Float} The coefficient that alters the signal passing through this link.
* @param t {Integer} The time-lag of this link.
*/

sense4us.entities.link = function(id, node1, node2, co, t) {
	if (id == null) {
		sense4us.temp_id = sense4us.temp_id || 0;
		id = "newline-" + sense4us.temp_id;
		sense4us.temp_id++;
	}

	var that = Object.create(sense4us.entities.entity(id));

	that.get_start = function() {
		return node1;
	};

	that.get_end = function() {
		return node2;
	};

	that.events = (function() {
		return sense4us.entities.link.events;
	}());

	that.switch = function() {
		var temp = node1;
		node1 = node2;
		node2 = temp;
		
		that.set("node1", node1.id);
		that.set("node2", node2.id);
	}


	that.set("class", "link");
	that.set("node1", node1.id);
	that.set("node2", node2.id);
	that.set("co", co);
	that.set("t", t);
	that.set("type", "link");

	node1.links.push(that);
	node2.links.push(that);

	return that;
}

sense4us.bless_with_events(sense4us.entities.link);

sense4us.entities.link.events.bind("update", function(link) {
	if (link.hasOwnProperty("graphics")) {
		link.graphics.update();
	}

	sense4us.events.trigger("object_updated", link);
});