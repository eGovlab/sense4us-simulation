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
			if(parseInt(req.headers["content-length"]) > 1000000) {
				res.end();
				return;
			}

			var multiparty = require("multiparty");
			var fs = require("fs");

			var form = new multiparty.Form();
			var file;

			var send_json = function(arr) {
				var i = 0
				var length = arr.length;

				console.log("Size: ", arr.length);

				var callback = function(iterator) {
					var writable = true;

					try {
						while(writable && iterator < length) {
							writable = res.write(arr[iterator]);
							iterator += 1;

							if(iterator === length) {
								return;
							}
						}
					} catch(err) {
						console.log("ERROR");
					}
				}

				callback(i);

				/*for(var i = 0; i < arr.length; i++) {
					res.write(arr[i]);
				}*/
			};

			var json_string = [];
			form.on("part", function(part) {
				if(part.filename !== null) {
					part.on("readable", function() {
						if(part.byteCount > 1000000) {
							part.resume();
							return;
						}

						part.setEncoding("utf8");
						var chunk;
						while((chunk = part.read()) !== null) {
							json_string.push(chunk);
						}

						part.resume();
					});
				} else {
					part.resume();	
				}
			});

			form.on("error", function() {
				console.log("Error");
				res.end();
			})

			form.on("close", function() {
				send_json(json_string);
				console.log("Responded and closed connection.");
				res.end();
			})

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