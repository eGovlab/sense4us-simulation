module.exports = function(express_controller)
{
	var initialized = false;
	var fs = undefined;
	var lr = undefined;
	var express = express_controller;

	var test = require("./testunit");
	test = test();

	test.add_test("is_module_function", function(object)
	{
		if(object.length !== 2)
			return false;

		if(test.test_objects([object[0]],["is_module"]))
		{
			var mod = require("./"+object[0]);
			mod = mod();
		}

		if(!test.test_objects([mod[object[1]]],["is_function"]))
			return false;

		return true;
	});

	var ex = require("./exception");
	ex = ex("routecontroller");

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

	function get_module(string)
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

			var route_regex = /^"[A-Za-z0-9\/:]+"$/gi;
			initial_route_regex = route_regex.exec(route);

			route = route.replace(/^"([A-Za-z0-9\/:]+)"$/, "$1");

			var callback_regex = /^[a-zA-Z_]*:[a-zA-Z_]*$/gi;
			callback = callback_regex.exec(callback);

			var err = test.get_errors(
			[
				[[[accepted_methods, method]], ["in_array"]],
				[[[routes, route]],["not_in_array"]],
				[[initial_route_regex, callback],["is_not_null"]],
				[[route],["is_not_empty"]]
			]);

			if(err.length > 0)
			{
				console.log(err);
				return;
			}

			callback = callback[0];
			var callback_array = callback.split(":");
			if(callback_array.length !== 2)
				ex.throw("Something bad did happen. Really bad.", "parse_routes");

			var callback_class = callback_array[0];
			var callback_method = callback_array[1];

			err = test.get_errors(
			[
				[[callback_array[0], callback_array[1]],["is_not_undefined"]],
				[[callback_class],["is_module"]],
				[[[callback_class, callback_method]],["is_module_function"]]
			]);

			if(err.length > 0)
			{
				console.log(err);
				return;
			}

			routes.push(route);

			console.log("Initialized route: " + method + " " + route);			

			var module = get_module(callback_class);

			express.get(route, function(req, res)
			{
				console.log("\n****************")
				console.log("INCOMING REQUEST");
				console.log("Method: " + method);
				console.log("Route: " + route);
				console.log("Bound to callback: " + line[2]);
				console.log("END REQUEST");
				console.log("****************");

				module[callback_method](req, res);
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