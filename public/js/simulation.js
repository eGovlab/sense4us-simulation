"use strict";

var sense4us = sense4us || {};

sense4us.simulation = function() {
	var that = {
		get_nodes_and_links: function() {
			var nodes = [];
			var links = [];

			var entities = sense4us.entities.id_to_entity;
			for (var entityIndex in entities) {
				var entity = entities[entityIndex];
				var className = entity.get_element().getAttribute("class");
				switch (className) {
			    case "node":
					entity.signal = parseFloat(entity.signal);
					entity.signal_fire = parseFloat(entity.signal_fire);
			    	nodes.push(entity);
			        break;
			    case "link":
					entity.co = parseFloat(entity.co);
					entity.t = parseFloat(entity.t);
			    	links.push(entity);
			        break;
				}
			}

			return {nodes: nodes, links: links};
		},
		run: function() {
			var nodes_and_links = that.get_nodes_and_links();
			sense4us.network.sendData("run_simulation", [nodes_and_links.nodes, nodes_and_links.links]);
		}
	};

	return that;
}();

sense4us.network.socket.on("run_simulation_completed", function(nodes) {
	if(typeof nodes == "string") {
		console.log(nodes);
	} else {
		for (var nodeIndex in nodes) {
			var node = nodes[nodeIndex];
			var node_entity = sense4us.entities.id_to_entity[node.id];

			console.log(node, node_entity);

			node_entity.set("signal", node["signal"]);
			node_entity.events.trigger("update", node_entity);
		}
	}
});
