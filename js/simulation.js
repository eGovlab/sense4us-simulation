
var sense4us = sense4us || {};

sense4us.simulation = function() {
	var that = {
		run: function(nodes, links) {
			sense4us.network.sendData("run_simulation", 
				[
					[
						{"id":"newnode-0", "sig": 0, "fire": 1},
						{"id":"newnode-1", "sig": 0, "fire": 0},
						{"id":"newnode-2", "sig": 0, "fire": 0}
					],
					[
						{"id": "newline-3", "n1":"newnode-0", "n2":"newnode-1", "co": 0.5, "t": 1},
						{"id": "newline-4", "n1":"newnode-1", "n2":"newnode-2", "co": 0.5, "t": 2}
					]
				]
			);
		}
	};

	return that;
}();

sense4us.network.socket.on("run_simulation_completed", function(nodes) {
	console.log("The simluation have been completed", nodes);

	for (var nodeIndex in nodes) {
		var node = nodes[nodeIndex];
		var node_entity = sense4us.entities.id_to_entity[node.id];

		node_entity.set("value", node["sig"]);
		node_entity.events.trigger("update", node_entity);
	}
});
