'use strict';

var express = require('express');
var app = express();
var bodyParser = require('body-parser');

app.use(
	bodyParser.json(),
	bodyParser.urlencoded({extended: true})
);

app.use('/', express.static(__dirname + '/public'));

app.get('/derp', function(req, res) {
	console.log('hej');
	res.send('lol');
});

app.post('/derp', function(req, res) {
	var nodes = JSON.parse(req.body.nodes);
	var links = JSON.parse(req.body.links);

	var modifiedNodes = {};
	Object.keys(nodes).forEach(function(id) {
		modifiedNodes[id] = nodes[id];
		var newNode = modifiedNodes[id];

		newNode.x = newNode.x + 20;
	});

	console.log("Nodes:", nodes);
	console.log(" ");
	console.log("Links:", links);

	res.set("Access-Control-Allow-Origin", "http://localhost:3001");
	res.send('Nodes & links recieved.');
});

var server = app.listen(3001, function () {
	var host = server.address().address;
	var port = server.address().port;

	console.log('Example app listening at http://%s:%s', host, port);
});