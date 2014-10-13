module.exports = function(server)
{
	var io = require('socket.io')(server);

	var that = {
		
	};

	io.on('connection', function(socket) {
	    socket.emit('network_client_connected', { state: 'successful' });

	    socket.on('network_send_data', function (data) {
			console.log("Network.received: " + data);
	    })
	});

	return that;
}