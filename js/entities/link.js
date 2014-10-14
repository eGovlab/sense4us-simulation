/**
* @namespace sense4us.entities
*/

var sense4us = sense4us || {};

sense4us.entities = sense4us.entities || {};

/**
* @class link
* @constructor
* @param id {Integer} This integer must be a unique identifier for this created link.
* @param n1 {Node} The node which this connection receives signals from
* @param n2 {Node} The node which this connection transfers signals to
* @param co {Float} The coefficient that alters the signal passing through this link.
* @param t {Integer} The time-lag of this link.
*/

sense4us.entities.link = function(id, n1, n2, co, t) {
	console.log(n1, n2);

	if (id == null) {
		sense4us.temp_id = sense4us.temp_id || 0;
		id = "newline-" + sense4us.temp_id;
		sense4us.temp_id++;
	}

	var that = Object.create(sense4us.entities.node(id));
	that.get_element().setAttribute("class", "link");

	that.get_start = function() {
		return n1;
	}

	that.get_end = function() {
		return n2;
	}

	that.events = function() {
		return sense4us.entities.link.events;
	}()

	that.set("id", that.get_element().getAttribute("id"));

	that.set("n1", n1.id);
	that.set("n2", n2.id);
	that.set("co", co);
	that.set("t", t);
	that.set("type", "link");
	n1.links.push(that);
	n2.links.push(that);

	return that;
}

sense4us.bless_with_events(sense4us.entities.link);

sense4us.entities.link.events.bind("update", function(link) {
	if (link.hasOwnProperty("graphics")) {
		link.graphics.update();
	}

	sense4us.events.trigger("object_updated", link);
});