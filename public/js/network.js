/**
* @namespace network
*/

var sense4us = sense4us || {};

/**
* This class handles the client-side network communication.
* @class network
* @constructor
*/

sense4us.network = function() {
	var socket = io.connect();

	var that = {
		socket: function() { return socket; }(),
		sendData: function(evt, data) {
			console.log("Network event: " + evt);
			console.log("Network data: " + data);
			socket.emit(evt, data);
		}
	};

	socket.on('network_client_connected', function (data) {
		console.log("Client connected to server successfully(socket.io)");
	});

	return that;
}();

sense4us.events.bind("network_send_object", function(object) {
	sense4us.network.sendData("network_send_data", object);
});
