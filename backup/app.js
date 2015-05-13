(function(http) {
    "use strict";

    var express    = require("express"),
        daemon     = express(),
        bodyParser = require("body-parser"),
        router     = express.Router();

    function addRoute(path, lambda, method) {
        if(!method || typeof method !== "string" || ["GET", "POST", "PUT", "PATCH", "DELETE", "ALL"].indexOf(method.toUpperCase()) === -1) {
            method = "ALL";
        }

        if(!path || typeof path !== "string") {
            path = "/";
        }

        if(path.charAt(0) !== "/") {
            path = "/" + path;
        }

        router[method.toLowerCase()](path, lambda);
        console.log(" -- Exposing "+method+" "+path);
    }

    var views = __dirname + "/views/";

    var notFound = function(req, res, next) {

    };

    var errorHandler = function(err, req, res, next) {
        console.log(err);
    };

    addRoute("/", function(req, res, next) {
        res.sendFile(views + "index.html");
    }, "GET");

    daemon.use(
        express.static(__dirname + "/public"),
        router,
        notFound,
        errorHandler
    );

    http(daemon, 3001);
}(function(daemon, port) {
    daemon.listen(port, function() {
        console.log(" ** Listening["+port+"]: \033[32mSuccessful\033[0m");
    })
}));

/*var express = require('express');
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
});*/