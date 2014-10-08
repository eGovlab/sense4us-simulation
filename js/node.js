var sense4us = sense4us || {};

sense4us.node = function(id) {
	var html_entity = sense4us.get_or_create_html_entity(id);

	html_entity.setAttribute("class", "node");

	var that = {
		set: function(name, value) {
			html_entity.setAttribute("data-" + name, value);
		},
		get: function(name) {
			return html_entity.getAttribute("data-" + name);
		},
		get_element: function() {
			return html_entity;
		}
	};

	return that;
}