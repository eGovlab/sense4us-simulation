module.exports = function()
{
	var tls = require("tls");
	var fs = require("fs");
	var btoa = require("btoa");

	var ex = require("./exception")("rest");

	var json_conf = JSON.parse(fs.readFileSync("config.json", "utf8"));

	var get_token, request;

	get_token = function(callback)
	{
		var json_conf = JSON.parse(fs.readFileSync("config.json", "utf8"));

		var options = {
			key: fs.readFileSync("key.pem"),
			cert: fs.readFileSync("cert.pem"),
			passphrase: json_conf["PEM"],
			rejectUnauthorized: false
		};

		var connection = tls.connect(json_conf["port"], json_conf["host"], options, function()
		{
			if(connection.authorized)
				console.log("Authorization successful!");
			else
				console.log("!!AUTHORIZATION ERROR!!", connection.authorizationError);
		});

		var credentials = btoa(json_conf["client"]+":"+json_conf["password"]);
		var data = "grant_type=client_credentials";

		connection.write("POST /authorize/token/get_token HTTP/1.1\r\n");
		connection.write("HOST: "+json_conf["host"]+"\r\n");
		connection.write("Authorization: Basic "+credentials+"\r\n");
		connection.write("Content-Length: "+data.length+"\r\n");
		connection.write("Content-Type: application/x-www-form-urlencoded\r\n\r\n");

		connection.write(data);

		connection.on("data", function(data)
		{
			var response = data.toString();

			var json;
			json = JSON.parse((response.match(/{.*}$/g))[0]);

			connection.end();

			if(json === null)
				ex.throw("No valid JSON got returned.", "get_token");

			callback(json["response"].access_token);
		});
	};

	request = function(method, request, json, callback)
	{
		method = method.toUpperCase();
		var methods = ["GET", "POST", "PUT", "PATCH", "DELETE"];

		if(methods.indexOf(method) === -1)
			ex.throw("Method not supported.", "request");

		if(json === undefined && callback === undefined)
			ex.throw("No callback supplied.", "request");

		if(method === "GET" && typeof json !== "function")
			ex.throw("Can't send JSON with a GET request.", "request");

		if(typeof json === "function")
			callback = json;

		if(typeof callback !== "function")
			ex.throw("No callback supplied.", "request");

		get_token(function(token)
		{
			var options = {
				key: fs.readFileSync("key.pem"),
				cert: fs.readFileSync("cert.pem"),
				passphrase: json_conf["PEM"],
				rejectUnauthorized: false
			};

			var connection = tls.connect(json_conf["port"], json_conf["host"], options, function()
			{
				if(connection.authorized)
					console.log("Authorization successful!");
				else
					console.log("!!AUTHORIZATION ERROR!!", connection.authorizationError);
			});

			connection.write(method+" "+request+" HTTP/1.1\r\n");
			connection.write("HOST: "+json_conf["host"]+"\r\n");
			connection.write("Authorization: Bearer "+token+"\r\n");

			if(method !== "GET")
			{
				connection.write("Content-Length: "+json.length+"\r\n");
				connection.write("Content-Type: application/json\r\n\r\n");

				connection.write(json);
			}
			else
				connection.write("\r\n");

			connection.on("data", function(data)
			{
				var response = data.toString();

				var json = response.match(/{.*}$/g);

				if(json === null)
					ex.throw("No valid JSON got returned.", "get_token");

				json = JSON.parse(json[0]);

				connection.end();

				callback(json["response"]);
			});		
		});
	}

	var that = {
		init: function()
		{
			get_token(function(token)
			{
				console.log(token)
			});	
		},

		request: function(method, r, json)
		{
			request(method, r, json);
		}
	};

	return that;
};