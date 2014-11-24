"use strict";

(function(namespace) {
	$("<a href='#' download='data.json' id='export_button' class='button'>Export (.json)</a>").prependTo("#menu");

	$("#export_button").click(function() {
		var obj = namespace.simulation.get_nodes_and_links();
		var data = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(obj));
		
	    $("#export_button").prop("href", "data:" + data);
	});
}(window.sense4us = window.sense4us || {}));