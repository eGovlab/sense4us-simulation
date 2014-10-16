/**
* @namespace sense4us.entities
*/

var sense4us = sense4us || {};

sense4us.entities = sense4us.entities || {};

sense4us.entities.id_to_entity = sense4us.entities.id_to_entity || {}

/**
* @class entity
* @constructor
* @param id {Integer} This integer must be a unique identifier for this created entity.
*/

sense4us.entities.entity = function(id) {
	if (id == null) {
		sense4us.temp_id = sense4us.temp_id || 0;
		id = "entity-" + sense4us.temp_id;
		sense4us.temp_id++;
	}
	var html_entity = sense4us.get_or_create_html_entity(id);

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
		get_x: function() {
			return parseInt(that.get("x"));
		},
		get_y: function() {
			return parseInt(that.get("y"));
		}
	};

	that.set("id", html_entity.getAttribute("id"));
	sense4us.entities.id_to_entity[that.id] = that;

	return that;
}
