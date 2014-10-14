var sense4us = sense4us || {};

sense4us.get_or_create_html_entity = function(id, entity) {
	var html_entity = document.getElementById(id);

	if (!html_entity) {
		html_entity = document.createElement("div");
		html_entity.setAttribute("id", id);
		html_entity.setAttribute("data-id", id);
		document.getElementById("container").appendChild(html_entity);
	}

	return html_entity;
}