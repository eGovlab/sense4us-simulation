/**
* @namespace sense4us.entities
*/
var sense4us = sense4us || {};

sense4us.entities = sense4us.entities || {};

/**
* Upon construction of this node object an html-element "div" will be created, unless
* there's already an existing element with specified id.
* This class facilitates the setting and getting node data-variables.
* It does not store the data-variables locally, instead it sets and gets
* them from the actual html-element.
* @class node
* @constructor
* @param id {Integer} This integer must be a unique identifier for this created node.
*/

sense4us.entities.node = function(id) {
	if (id == null) {
		sense4us.temp_id = sense4us.temp_id || 0;
		id = "newnode-" + sense4us.temp_id;
		sense4us.temp_id++;
	}

	var that = Object.create(sense4us.entities.entity(id));

	that.links = [];
	that.events = (function() {
		return sense4us.entities.node.events;
	}());

	that.set("notes", "empty notes");
	that.set("type", "node");
	that.set("class", "node");
	

	return that;
}

sense4us.bless_with_events(sense4us.entities.node);

sense4us.entities.node.events.bind("update", function(node) {
	for (var pos in node.links) {
		var link = node.links[pos];
		link.events.trigger("update", link);
	}

	if (node.hasOwnProperty("graphics")) {
		node.graphics.update();
	}

	sense4us.events.trigger("object_updated", node);
});