(function(ns) {
	function import_model(model) {
		var entities = ns.entities.id_to_entity;
		for(var key in entities) {
			var entity = entities[key];
			entity.destroy();
			console.log("Entity destroyed: ", entity.id);
		}

		var imported_nodes = model["nodes"];
		var imported_links = model["links"];

		if(imported_nodes === undefined || imported_links === undefined) {
			return false;
		}

		var nodes = {};
		for(var i = 0; i < imported_nodes.length; i++) {
			var n = imported_nodes[i];
			
			var created_node;
			if(n.draw_type === "ORIGIN") {
				created_node = ns.ui.create_origin_node(n.id, 0, n.signal_fire, n.name, n.x, n.y);
			} else {
				created_node = ns.ui.create_node(n.id, 0, n.signal_fire, n.name, n.x, n.y);
			}
			nodes[n.id] = created_node;
			created_node.graphics.update();
		}

		for(var i = 0; i < imported_links.length; i++) {
			var l = imported_links[i];
			ns.ui.create_link(nodes[l.n1], nodes[l.n2], l.co, l.t);
		}
	}

	ns.events.bind("model_imported", function(nodes_and_links) {
		import_model(nodes_and_links);
		console.log(nodes_and_links);
	});
}(window.sense4us = window.sense4us || {}));