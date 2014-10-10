/**
* @namespace sense4us.entities
*/

var sense4us = sense4us || {};

sense4us.entities = sense4us.entities || {};

/**
* @class link
* @constructor
* @param id {Integer} This integer must be a unique identifier for this created link.
*/

sense4us.entities.link = function(id, start, end) {
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

	that.set("id", that.get_element().getAttribute("id"));

	start.lines = start.lines || [];
	start.lines.push(that);
	end.lines = start.lines || [];
	end.lines.push(that);

	return that;
}