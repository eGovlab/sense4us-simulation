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
	console.log(nodes, links);

	res.send('Nodes & links recieved.');
});

var server = app.listen(3000, function () {
	var host = server.address().address;
	var port = server.address().port;

	console.log('Example app listening at http://%s:%s', host, port);
});