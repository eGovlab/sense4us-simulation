module.exports = function(express_controller)
{
	var initialized = false;
	var fs = undefined;
	var lr = undefined;
	var express = express_controller;

	function initialize()
	{
		if(initialized)
			return;

		fs = require("fs");
		lr = require("line-by-line");

		initialized = true;
	}

	function get_substr_count(haystack, needle)
	{
		if(haystack === undefined || needle === undefined)
			return;

		var search_pos = 0;
		var length = haystack.length;

		var needle_indexes = [];

		while((index = haystack.indexOf(needle, search_pos)) > -1)
		{
			needle_indexes.push(index);
			search_pos = search_pos + (index + 1);
		}

		return needle_indexes;
	}

	function get_class(string)
	{
		try
		{
			var n = require("./"+string);
			n = n();
		}
		catch(err)
		{
			console.log(err);
			return false;
		}

		return n;
	}

	function parse_routes()
	{
		var cwd = process.cwd();
		var path = cwd + "/server/routes";

		fd = new lr(path);

		fd.on("error", function(err)
		{
			console.log(err);			
		});

		var routes = [];
		fd.on("line", function(line)
		{
			line = line.split(" ");

			var method = line[0];
			var route = line[1];
			var callback = line[2];

			var accepted_methods = ["GET", "POST", "PUT", "PATCH", "DELETE"];
			if(accepted_methods.indexOf(method) === -1)
			{
				console.log("Invalid method");
				return;
			}

			var route_regex = /^"[A-Za-z0-9\/:]+"$/gi;
			if((n = route_regex.exec(route)) === null)
			{
				console.log(line[1] + ": Route syntax error");
				return;
			}

			route = route.replace(/^"([A-Za-z0-9\/:]+)"$/, "$1");

			if(route === "")
			{
				console.log(line[1] + ": Route syntax error");
				return;
			}

			if(routes.indexOf(route) !== -1)
			{
				console.log(route + ": Route already exists");
				return;
			}
			else
				routes.push(route);

			var callback_regex = /^[a-zA-Z_]*:[a-zA-Z_]*$/gi;
			callback = callback_regex.exec(callback);

			if(callback === null)
			{
				console.log(line[2] + ": Callback syntax error");
				return;
			}

			callback = callback[0];

			if((callback = callback.split(":")).length === 2)
			{
				var c;
				if(!(c = get_class(callback[0])))
				{
					console.log(callback[0] + ": Does not exist as an object.")
					return;
				}

				var function_name = callback[1];
				if(typeof c[function_name] !== "function")
				{
					console.log(callback[0] + ":" + callback[1] + ": Function does not exist.");
					return;
				}
			}

			console.log("Initialized route: " + method + " " + route);

			express.get(route, function(req, res)
			{
				console.log("\n****************")
				console.log("INCOMING REQUEST");
				console.log("Method: " + method);
				console.log("Route: " + route);
				console.log("Bound to callback: " + line[2]);
				console.log("END REQUEST");
				console.log("****************\n\n");

				c[function_name](req, res);
			});
		});

		/*express_controller.get(route, function(req, res)
		{
			console.log(req.route);
			res.send("Hello");
		});*/
	}

	var that = {
		parse_routes: function()
		{
			if(!initialized)
				initialize();

			parse_routes();
		}
	}

	return that;
}