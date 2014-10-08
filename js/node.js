/**
* @namespace sense4us
*/

var sense4us = sense4us || {};

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

sense4us.node = function(id) {
	if (id == null) {
		sense4us.temp_id = sense4us.temp_id || 0;
		id = "newnode-" + sense4us.temp_id;
		sense4us.temp_id++;
	}

	var html_entity = document.getElementById(id);

	if (!html_entity) {
		html_entity = document.createElement("div");
		html_entity.setAttribute("id", id);
		html_entity.setAttribute("data-id", id);
		html_entity.setAttribute("class", "node");
		document.getElementById("container").appendChild(html_entity);

		console.log(html_entity);
	}

	var that = {
		/**
	    * Sets an attribute on the html-element with the specified value.
	    * @method set
	    * @param name {String} This parameter is converted into data-%name% before storing the attribute in the html element.
	    * @param value
	    */
		set: function(name, value) {
			html_entity.setAttribute("data-" + name, value);
		},
		/**
	    * Retrieves the attribute value by the specified attribute name.
	    * @method get
	    * @param name {String} This parameter is converted into data-%name% before retrieving the attribute.
        * @returns {String} Returns the attribute value.
	    */
		get: function(name) {
			return html_entity.getAttribute("data-" + name);
		},
		get_element: function() {
			return html_entity;
		}
	}

	return that;
}