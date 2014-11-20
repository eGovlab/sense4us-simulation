module.exports = function()
{
	var private_function;

	private_function = function()
	{
		return "Hello";
	};

	var that = {
		fetch_model: function(req, res) {
			console.log("fetch: " + req.params["fetch"]);
			res.render("index.html");
		},

		import_model: function(req, res) {
			var multiparty = require("multiparty");
			var fs = require("fs");

			var form = new multiparty.Form();
			var file;

			var send_json = function(arr) {
				for(var i = 0; i < arr.length; i++) {
					res.send(arr[i]);
				}
			};

			form.on("part", function(part) {
				if(part.filename !== null) {
					part.on("readable", function() {
						part.setEncoding("utf8");
						var json_string = [];
						var chunk;
						while((chunk = part.read()) !== null) {
							console.log("Size: %d", chunk.length);	
							json_string.push(chunk);
						}

						send_json(json_string);
					});
				}

				part.resume();
			});

			form.parse(req);
		},

		fetch_client: function(req, res) {
			res.render("index.html");
		},

		fetch_client_with_params: function(req, res) {
			res.render("index.html");
		}
	}

	return that;
};