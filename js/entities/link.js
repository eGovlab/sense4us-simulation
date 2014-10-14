/**
* @namespace sense4us.entities
*/

var sense4us = sense4us || {};

sense4us.entities = sense4us.entities || {};

/**
* @class link
* @constructor
* @param id {Integer} This integer must be a unique identifier for this created link.
* @param start {Node} The node which this connection receives signals from
* @param end {Node} The node which this connection transfers signals to
* @param co {Float} The coefficient that alters the signal passing through this link.
* @param t {Integer} The time-lag of this link.
*/

sense4us.entities.link = function(id, start, end, co, t) {
	console.log(start, end);

	if (id == null) {
		sense4us.temp_id = sense4us.temp_id || 0;
		id = "newline-" + sense4us.temp_id;
		sense4us.temp_id++;
	}

	var that = Object.create(sense4us.entities.node(id));
	that.get_element().setAttribute("class", "link");

	that.get_start = function() {
		return {x: start.x, y: start.y};
	}

	that.get_end = function() {
		return {x: end.x, y: end.y};
	}

	that.events = function() {
		return sense4us.entities.link.events;
	}()

	that.set("id", that.get_element().getAttribute("id"));

	that.set("start", start.id);
	that.set("end", end.id);
	that.set("co", co);
	that.set("t", t);
	start.links.push(that);
	end.links.push(that);

	return that;
}

sense4us.bless_with_events(sense4us.entities.link);

sense4us.entities.link.events.bind("update", function(link) {
	if (link.hasOwnProperty("graphics")) {
		link.graphics.update();
	}

	sense4us.events.trigger("object_updated", link);
});