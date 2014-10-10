module.exports = function(app)
{
	var server = require('http').Server(app);
	var io = require('socket.io')(server);
	var io_port = 3701;
	server.listen(io_port);

	var that = {
		
	}

	io.on('connection', function(socket) {
	    socket.emit('network_client_connected', { state: 'successful' });

	    socket.on('network_send_data', function (data) {
			console.log("Network.received: " + data);
	    })
	})

	console.log("Socket.io listening on port " + io_port);

	return that;
}