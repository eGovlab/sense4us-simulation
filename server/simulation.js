/**
* @namespace sense4us
*/

/**
* This node.js module that handles the simulation of the sense4us-model(nodes and links).
* @class simulation
* @constructor
*/
module.exports = function()
{
	var simulation_nodes = {};
	var simulation_links = [];

	/**
    * Creates a simulation node that has the possibility to fire
    * signals that propagate across the sense4us model of nodes and links.
    * @method create_simulation_node
    * @private
	* @param id {Integer} The ID this simulation_node will have.
	* @param signal {Float} The initial/accumulated signal stored in this node.
	* @param signal_fire {Float} How much signal this node is set to transmit.
    * @returns {Object} An object that has additional functions for simulation purposes.
    */
	create_simulation_node = function(id, signal, signal_fire) {
		var that = {
			id: id,
			signal: signal,
			signal_fire: signal_fire,
			links: [],
			been_here: false,
			findLoop: function() {
				if(that.been_here)
					return true;
				
				that.been_here = true;
				for(var i = 0; i < that.links.length; i++) {
					if(that.links[i].findLoop())
						return true;
				}

				that.been_here = false;
				return false;
			},
			fire: function(signal_fire) {
				for (var linkIndex = 0; linkIndex < that.links.length; linkIndex++) {
					that.links[linkIndex].fire(signal_fire);
				}
			}
		};
		return that;
	}

	/**
    * Creates a simulation links that has the possibility to fire
    * signals that propagate across the sense4us model of nodes and links.
    * @method create_simulation_link
    * @private
	* @param id {Integer} The ID this simulation_link will have.
	* @param n1 {Integer} The node ID as the input to this link.
	* @param n2 {Integer} The node ID as the output of this link.
	* @param co {Float} The coefficient that alters the signal passing through this link.
    * @returns {Object} An object that has additional functions for simulation purposes.
    */
	create_simulation_link = function(id, n1, n2, co) {
		var that = {
			id: id,
			n1: n1,
			n2: n2,
			co: co,
			output_node_object: undefined,
			findLoop: function() {
				if(that.output_node_object === undefined)
					throw that.id + ": Couldn't find loop, output_node_object is undefined.";

				if(that.output_node_object.findLoop())
					return true;

				return false;
			},
			fire: function(signal_fire)
			{
				if(that.output_node_object === undefined)
					throw that.id + ": Couldn't fire, output_node_object is undefined.";

					// Calculate how much change is to be transferred over this link
				var signal_out = signal_fire * this.co;
				that.output_node_object.signal = that.output_node_object.signal + signal_out;
				that.output_node_object.fire(signal_out);
			}
		};
		return that;
	}

	/**
    * This function creates simulation_nodes and simulation_links and interconnects them.
    * This is neccessary and must be done before trying to fire signals across the network.
    * @method setup_simulation_network
    * @private
	* @param nodes {Array} Array of nodes from the database.
	* @param links {Array} Array of links from the database.
    */
	setup_simulation_network = function(nodes, links)
	{
		// Clear the arrays storing simulation_nodes and simulation_links.
		simulation_nodes = {};
		simulation_links = [];

		fire_nodes = [];

		// Create simulation links of all existing links
		for (var linkIndex = 0; linkIndex < links.length; ++linkIndex) {
			var link = links[linkIndex];
			var simulation_link = create_simulation_link(link["id"], link["n1"], link["n2"], link["co"]);
			simulation_links.push(simulation_link);
		}

		// Create simulation nodes of all existing nodes
		for (var nodeIndex = 0; nodeIndex < nodes.length; ++nodeIndex) {
			var node = nodes[nodeIndex];
			var simulation_node = create_simulation_node(node["id"], node["signal"], node["signal_fire"]);
			simulation_nodes[simulation_node.id] = simulation_node; //.push(simulation_node);

			if(node["signal_fire"] != 0)
				fire_nodes.push(simulation_node);
		}

		// Let each node know their output links
		for (var linkIndex = 0; linkIndex < simulation_links.length; ++linkIndex) {
			var simulation_link = simulation_links[linkIndex];
			var simulation_node1 = simulation_nodes[simulation_link["n1"]];
			var simulation_node2 = simulation_nodes[simulation_link["n2"]];
			simulation_node1["links"].push(simulation_link);
			simulation_link.output_node_object = simulation_node2;
		}

		for (var fireIndex = 0; fireIndex < fire_nodes.length; fireIndex++) {
			if(fire_nodes[fireIndex].findLoop())
				return false;
		}

		return true;
	}

	var that = {
		/**
		* Uses the provided nodes and links and creates a simulation network.
		* This network is then ran.
	    * @method run
		* @param nodes {Array} Array of nodes from the database.
		* @param links {Array} Array of links from the database.
		* @param delta_time {Int} Number of months/iterations to simulate(not yet used in the simulation)
		* @returns {Array} An Array of simulation nodes post simulation(they contain the result of the simulation)
	    */
		run: function(nodes, links, delta_time)
		{
			// Setup the nodes and links connections
			if(!setup_simulation_network(nodes, links))
				return "There is a loop, you bugger.";

			// Simulate firing of all nodes
			for (var nodeIndex in simulation_nodes) {
				var simulation_node = simulation_nodes[nodeIndex];
				simulation_node.fire(simulation_node["signal_fire"]);
			}

			return simulation_nodes;
		}
	};
	network = require("./network");
	network.add_listen("run_simulation", function(socket, arr)
	{
		// Extract nodes array from the received array
		var nodes = arr[0];
		var links = arr[1];

		// Start simulation
		var result_nodes = that.run(nodes, links, 1);

		// Send back the results of the simulation to the client
		socket.emit("run_simulation_completed", result_nodes);
	});

	return that;
}
