module.exports = function()
{
	var that = {
		run: function()
		{
			var nodes = [
				{"id":0, "sig": 0, "fire": 1},
				{"id":1, "sig": 0, "fire": 0},
				{"id":2, "sig": 0, "fire": 0},
			];

			var links = [
				{"id": 0, "n1":0, "n2":1, "co": 0.5},
				{"id": 1, "n1":1, "n2":2, "co": 0.5},
			];

			var simulation_nodes = [];
			var simulation_links = [];

			var create_simulation_node = function(id, sig, sigFire) {
				var that = {
					id: id,
					sig: sig,
					sigFire: sigFire,
					links: [],
					fire: function(sigFire)
					{
						that.sig = that.sig + sigFire;

						//console.log("Node #" + that.id + " is firing with strength: " + sigFire);
						for (var linkIndex = 0; linkIndex < that.links.length; ++linkIndex) {

							that.links[linkIndex].fire(sigFire);
						}
					}
				};
				return that;
			}

			var create_simulation_link = function(id, n1, n2, co) {
				var that = {
					id: id,
					n1: n1,
					n2: n2,
					co: co,
					nodes: [],
					fire: function(sigFire)
					{
						//console.log("Link #" + that.id + " is firing!");
						for (var nodeIndex = 0; nodeIndex < that.nodes.length; ++nodeIndex) {
							// Calculate how much change is to be transferred over this link
							var sig_out = sigFire * this.co;
							that.nodes[nodeIndex].fire(sig_out);
						}
					}
				};
				return that;
			}

			// Create simulation nodes of all existing nodes
			for (var nodeIndex = 0; nodeIndex < nodes.length; ++nodeIndex) {
				var node = nodes[nodeIndex];
				var simulation_node = create_simulation_node(node["id"], node["sig"], node["fire"]);
				simulation_nodes.push(simulation_node);
			}

			// Create simulation links of all existing links
			for (var linkIndex = 0; linkIndex < links.length; ++linkIndex) {
				var link = links[linkIndex];
				var simulation_link = create_simulation_link(link["id"], link["n1"], link["n2"], link["co"]);
				simulation_links.push(simulation_link);
			}

			// Let each node know their output links
			for (var linkIndex = 0; linkIndex < simulation_links.length; ++linkIndex) {
				var simulation_link = simulation_links[linkIndex];
				var simulation_node1 = simulation_nodes[simulation_link["n1"]];
				var simulation_node2 = simulation_nodes[simulation_link["n2"]];
				simulation_node1["links"].push(simulation_link);
				simulation_link["nodes"].push(simulation_node2);
			}

			// Simulate
			for (var nodeIndex = 0; nodeIndex < nodes.length; ++nodeIndex) {
				var simulation_node = simulation_nodes[nodeIndex];
				simulation_node.fire(simulation_node["sigFire"]);
			}

			// Print how much signal each node have after the firing
			for (var nodeIndex = 0; nodeIndex < simulation_nodes.length; ++nodeIndex) {
				var simulation_node = simulation_nodes[nodeIndex];
				//console.log("node.id: " + simulation_node["id"] + ", sig: " + simulation_node["sig"]);
			}
		}
	};

	return that;
}
