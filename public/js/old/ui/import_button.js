"use strict";

(function() {
	sense4us.importer = {};

	sense4us.importer.attach_to_form = function(form) {
		form.on("submit", function(e) {
			var data = new FormData();
			var file_inputs = $(this).find('[type="file"]');

			$.each(file_inputs, function(i, input) {
				$.each(input.files, function(u, file) {
					data.append("file-"+u, file);
				});
			});

			e.preventDefault();
			$.ajax({
				type: "POST",
				cache: false,
				contentType: false,
				processData: false,
				url: $(this).attr("action"),
				data: data,
				dataType: "json"
			}).success(function(json) {
				console.log(json);
				if(typeof json === "object" && json["nodes"] !== undefined && json["links"] !== undefined)
					sense4us.events.trigger("model_imported", json);				
			});

			return false;
		});
	};

	sense4us.importer.attach_to_form($("#sense4us_import_json"));

}).call(window.sense4us = window.sense4us || {});