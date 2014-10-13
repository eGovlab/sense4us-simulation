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

	network = require("./network");
	network = network(server);

	simulation = require("./simulation");
	simulation = simulation();
	simulation.run();

	console.log("Application initialized.\nListening on port " + port + "\n");

	initialized = true;
}