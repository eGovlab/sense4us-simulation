var sense4us = sense4us || {};

sense4us.node = function(id) {
	var html_entity = document.getElementById(id);

	if (!html_entity) {
		html_entity = document.createElement("div");
		html_entity.setAttribute("id", id);
		document.body.appendChild(html_entity);

		console.log(html_entity);
	}

	var that = {
		set: function(name, value) {
			html_entity.setAttribute("data-" + name, value);
		},
		get: function(name) {
			return html_entity.getAttribute("data-" + name);
		}
	}

	return that;
}