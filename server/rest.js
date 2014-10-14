module.exports = function()
{
	var request = require("./request")();

	var that = {
		get_model: function(id, cb)
		{
			console.log("Path:", "/simulator/model/crud/" + id);

			var path = "/simulator/models/crud/" + id;

			request.request("GET", path, function(json)
			{
				cb(json);
			});
		},

		get_node: function(id, cb)
		{
			request.request("GET", "/simulator/nodes/crud/" + id, function(json)
			{
				cb(json);
			});
		}
	};

	return that;
}