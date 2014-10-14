module.exports = function()
{
	var callbacks = [], create_callback;

	create_callback = function(key)
	{
		var callback = function(object) {
			callbacks[key](this, object);
		};

		return callback;
	};

	var that = {
		start: function(server)
		{
			var io = require('socket.io')(server);

			io.on('connection', function(socket)
			{
				for(var key in callbacks)
				{
					if(!callbacks.hasOwnProperty(key))
						continue;

					socket.on(key, create_callback(key));
					console.log("Added " + key + " to new connection.");
				}
			});
		},

		add_listen: function(identifier, func)
		{
			if(typeof func !== "function" || callbacks[identifier] !== undefined)
				return false;

			callbacks[identifier] = func;
			console.log("network: Successfully added " + identifier);

			return true;
		}
	};

	return that;
}();
