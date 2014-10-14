
var sense4us = sense4us || {};

sense4us.simulation = function() {
	var that = {
		run: function() {
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

			sense4us.network.sendData("run_simulation", [nodes, links]);
		}
	};

	return that;
}();

sense4us.network.socket.on("run_simulation_completed", function(nodes) {
	for (var nodeIndex in nodes) {
		var node = nodes[nodeIndex];
		var node_entity = sense4us.entities.id_to_entity[node.id];

		node_entity.set("signal", node["signal"]);
		node_entity.events.trigger("update", node_entity);
	}
});
