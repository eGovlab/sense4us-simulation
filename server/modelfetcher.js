module.exports = function()
{
	var private_function;

	private_function = function()
	{
		return "Hello";
	};

	var that = {
		fetch_model: function(req, res)
		{
			console.log("fetch: " + req.params["fetch"]);
			res.render("index.html");
		},

		fetch_client: function(req, res)
		{
			res.render("index.html");

			network = require("./network");
			network.add_listen("create_node", function(socket, object)
			{
				console.log("Create node sent.");
				socket.emit("create_node", private_function());
			});

			network.add_listen("save_node", function(socket, object)
			{
				console.log("Save node sent.");
				socket.emit("save_node", private_function());
			});
		}
	}

	return that;
};