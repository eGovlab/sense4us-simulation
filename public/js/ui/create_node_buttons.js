(function(ns){
	ns.ui = ns.ui || {};

	ns.ui.create_node = function(id, signal, signal_fire, name, x, y) {
		return __create_node(id, signal, signal_fire, null, name, x, y);
	}

	ns.ui.create_origin_node = function(id, signal, signal_fire, name, x, y) {
		var node = __create_node(id, signal, signal_fire, "ORIGIN", name, x, y);
		node.graphics.set_variable("signal_fire");
		return node; 
	}

	function __create_node(id, signal, signal_fire, type, name, x, y) {
		var node = sense4us.entities.node(id);

		var template_name = "node_name";
		if(name !== null && typeof name === "string")
			template_name = name;

		if(x !== undefined && y !== undefined) {
			node.set("x", x);
			node.set("y", y);
		}

		node.set("name", template_name);
		node.set("signal", signal);
		node.set("signal_fire", signal_fire);
		
		if(type && type.toUpperCase() === "ORIGIN") {
			node.set("draw_type", "ORIGIN");
			node.graphics = sense4us.graphics.node(node, sense4us.stage, "origin");
		} else {
			node.graphics = sense4us.graphics.node(node, sense4us.stage);
		}

		sense4us.stage.addChild(node.graphics.container);
		sense4us.stage.update();
		sense4us.mechanics.draggable(node.graphics, sense4us.active_modes);

		return node;
	}

}(window.sense4us = window.sense4us || {}));