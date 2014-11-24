(function(ns) {
	ns.ui = ns.ui || {};
	ns.ui.create_link = function(start, end, co, t) {
		var link = sense4us.entities.link(null, start, end, co, t);
		link.graphics = sense4us.graphics.link(link, sense4us.stage);

		sense4us.stage.addChildAt(link.graphics.container, 0);
		sense4us.stage.update();
		sense4us.mechanics.selectable(link.graphics);

		return link;
	}
}(window.sense4us = window.sense4us || {}));