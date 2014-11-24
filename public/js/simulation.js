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
			var timelag = document.getElementById("sense4us_timelag_amount").value;
			timelag = parseInt(timelag);

			sense4us.network.sendData("run_simulation", [nodes_and_links.nodes, nodes_and_links.links, timelag]);
		},
		get_simulation_max_time: function()
		{
			var nodes_and_links = that.get_nodes_and_links();
			var simulation_max_time_found = 0;

			var ObjLink = function(n1, n2, t) {
				this.n1 = n1;
				this.n2 = n2;
				this.t = t;
				this.nextLinks = [];
				this.been_here = false;
				this.find_next_links = function(obj_links)
				{
					for (var obj_link_index in obj_links) {
						var obj_link = obj_links[obj_link_index];

						if (obj_link.n1 == this.n2) {
							this.nextLinks.push(obj_link);
						}
					}
				};
				this.find_max_accumulated_time = function(accumulated_time)
				{
					this.been_here = true;
					accumulated_time = accumulated_time + this.t;

					if (accumulated_time > simulation_max_time_found)
						simulation_max_time_found = accumulated_time;

					for (var next_link_index in this.nextLinks) {
						var next_link = this.nextLinks[next_link_index];

						if (next_link.been_here == true) {
							throw "Can't calculate max time, there's a loop in the model";
						}
						next_link.find_max_accumulated_time(accumulated_time);
					}
					accumulated_time = accumulated_time - this.t;
					this.been_here = false;
				};
			};

			// Create all obj_links
			var obj_links = [];
			for (var linkIndex in nodes_and_links.links) {
				var link = nodes_and_links.links[linkIndex];
				var obj_link = new ObjLink(link["n1"], link["n2"], link["t"]);
				obj_links.push(obj_link);
			}

			// Let all obj_links find their nextLinks
			for (var obj_link_index in obj_links) {
				var obj_link = obj_links[obj_link_index];
				obj_link.find_next_links(obj_links);
			}

			// Let all obj_links find the max time across any link path
			for (var obj_link_index in obj_links) {
				var obj_link = obj_links[obj_link_index];
				try {
					obj_link.find_max_accumulated_time(0);
				} catch(error) {
					console.log(error);
					return false;
				} 
			}

			return simulation_max_time_found;
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

			//console.log(node, node_entity);

			node_entity.set("signal", node["signal"]);
			node_entity.events.trigger("update", node_entity);
		}
	}
});
