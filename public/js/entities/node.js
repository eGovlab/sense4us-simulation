/**
* @namespace sense4us.entities
*/

var sense4us = sense4us || {};

sense4us.entities = sense4us.entities || {};

sense4us.entities.id_to_entity = sense4us.entities.id_to_entity || {}

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
	var html_entity = sense4us.get_or_create_html_entity(id);

	html_entity.setAttribute("class", "node");

	var that = {
		/**
	    * Sets an attribute on the html-element with the specified value.
	    * @method set
	    * @param name {String} This parameter is converted into data-%name% before storing the attribute in the html element.
	    * @param value
	    */
		set: function(name, value) {
			if (name != "id") {
				html_entity.setAttribute("data-" + name, value);
			} else {
				html_entity.setAttribute(name, value);
			}

			that[name] = that.get(name);
		},
		/**
	    * Retrieves the attribute value by the specified attribute name.
	    * @method get
	    * @param name {String} This parameter is converted into data-%name% before retrieving the attribute.
        * @returns {String} Returns the attribute value.
	    */
		get: function(name) {
			if (name != "id") {
				return html_entity.getAttribute("data-" + name);
			} else {
				return html_entity.getAttribute(name);
			}
		},
		get_element: function() {
			return html_entity;
		},
		graphics: null,
		links: [],
		events: function() {
			return sense4us.entities.node.events;
		}(),
		get_x: function() {
			return parseInt(that.get("x"));
		},
		get_y: function() {
			return parseInt(that.get("y"));
		}
	};

	that.set("id", html_entity.getAttribute("id"));
	that.set("notes", "empty notes");
	that.set("type", "node");
	sense4us.entities.id_to_entity[that.id] = that;

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