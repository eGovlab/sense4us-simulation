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
	var socket = io.connect('http://localhost:3001');
	socket.on('network_receive_object', function (data) {
		console.log("Network: Received this object: " + data);
	});

	var that = {
		handleMessage: function(object) {

		},
	}

	return that;
}();

sense4us.events.bind("network_send_object", function(object) {
	console.log("Network: Send this object: " + object);
});
