initialized = false;
router = undefined;

exports.initialize = function()
{
	if(initialized)
		return;

	var express = require("express");

	var app = express();
	var port = 3700;

	cwd = process.cwd();

	app.use(express.static(cwd + '/css'));
	app.use(express.static(cwd + '/js'));
	app.set("views", cwd + "/views");
	app.engine("html", require("ejs").renderFile);

	router = require("./routecontroller");
	router = router(app);

	router.parse_routes();

	var server = require('http').Server(app);
	server.listen(port);

	var f = function(socket)
	{
		console.log("wat");
		socket.emit("wat", {wat: "wat"});
	};

	network = require("./network");
	//network = network(server);

	if(!network.add_listen("network_send_data", f))
		throw "Couldn't add 'network_send_data'";

	network.start(server);

	simulation = require("./simulation");
	simulation = simulation();
	var mockup_nodes = [
		{"id":0, "sig": 0, "fire": 1},
		{"id":1, "sig": 0, "fire": 0},
		{"id":2, "sig": 0, "fire": 0},
	];
	var mockup_links = [
		{"id": 0, "n1":0, "n2":1, "co": 0.5, "t": 1},
		{"id": 1, "n1":1, "n2":2, "co": 0.5, "t": 2},
	];
	simulation.run(mockup_nodes, mockup_links);

	console.log("Application initialized.\nListening on port " + port + "\n");

	initialized = true;
}