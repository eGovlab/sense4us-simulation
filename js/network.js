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
	var socket = io.connect('http://localhost:3700');

	var that = {
		sendData: function(evt, data) {
			console.log("Network.sending: " + data);
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
