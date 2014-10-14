var application = require("./server/application")

initialized = false;
router = undefined;

if(initialized)
	return;

var express = require("express");

var app = express();
var port = 3700;

cwd = process.cwd();

app.use(express.static(__dirname + '/public'));
app.set("views", __dirname + "/public");
app.engine("html", require("ejs").renderFile);

router = require("./server/routecontroller");
router = router(app);

router.parse_routes();

var server = require('http').Server(app);
server.listen(port);

network = require("./server/network");
//network = network(server);

network.start(server);

simulation = require("./server/simulation");
simulation = simulation();
var mockup_nodes = [
	{"id":"newnode-0", "sig": 0, "fire": 1},
	{"id":"newnode-1", "sig": 0, "fire": 0},
	{"id":"newnode-2", "sig": 0, "fire": 0},
//	{"id":0, "sig": 0, "fire": 1},
//	{"id":1, "sig": 0, "fire": 0},
//	{"id":2, "sig": 0, "fire": 0},
];
var mockup_links = [
	{"id": "newline-3", "n1":"newnode-0", "n2":"newnode-1", "co": 0.5, "t": 1},
	{"id": "newline-4", "n1":"newnode-1", "n2":"newnode-2", "co": 0.5, "t": 2},
//	{"id": 0, "n1":0, "n2":1, "co": 0.5, "t": 1},
//	{"id": 1, "n1":1, "n2":2, "co": 0.5, "t": 2},
];
simulation.run(mockup_nodes, mockup_links);

console.log("Application initialized.\nListening on port " + port + "\n");
