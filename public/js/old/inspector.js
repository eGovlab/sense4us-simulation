"use strict";

/**
* @namespace sense4us
*/

var sense4us = sense4us || {};

/**
* This is a static class that provides the inspector-panel to view and
* change the properties of objects in the simulation.
* @class inspector
* @constructor
*/

sense4us.inspector = function() {
	var inspectingObject = null;
	var hide_variables = ["id",
                          "type",
                          "class",
                          "signal",
                          "signal_fire",
                          "x",
                          "y",
                          "n1",
                          "n2",
                          "draw_type"];

	/**
    * Generates and returns the HTML content of the inspector panel.
    * The HTML content varies depending upon what object is being inspected.
    * Any changes made using the inspector-panel will trigger an "update" event.
    * @method generateHTML
    * @private
    * @returns {String} The html content of the inspector panel
    */
	var generateHTML = function() {
		if (!inspectingObject) return false;

		var form = $("<form>");
		form.attr("id", inspectingObject.id + "-form");

		form.submit(function(e) {
			e.preventDefault();
		});

		for (var property_name in inspectingObject) {
			var property = inspectingObject[property_name];
			// This if-statement will filter out all object properties which are functions, objects and id.
			if (!(property instanceof Function) && !(property instanceof Object)) {
				// Hide non-interesting object variables in inspector
				if (hide_variables.indexOf(property_name) == -1) {
					var header = $("<h5>");
					header.html(property_name);

					form.append(header);

					if (property_name == "notes") {
						var textarea = $("<textarea>");
						textarea.attr("name", property_name);
						textarea.html(property);

						form.append(textarea);
					} else {
						var input = $("<input type='text'>");
						input.attr("name", property_name);
						input.val(property);

						form.append(input);
					}
				}
			}
		}

		if (inspectingObject.type == "link") {
			var link_button = $("<button>");
			link_button.attr("id", "switch");
			link_button.addClass("button");
			link_button.html("Switch");
			link_button.attr("type", "button");

			form.append(link_button);
		}

		var delete_button = $("<button>");
		delete_button.attr("id", "delete");
		delete_button.addClass("button");
		delete_button.html("Delete");
		delete_button.attr("type", "button");

		form.append(delete_button);
		return form;
	};

	var that = {
		/**
	    * Selects an object to inspect and refreshes the inspector-panel.
	    * @method inspect
	    * @param object {Object} This parameter defines the object we want to inspect.
	    */
		inspect: function(object) {
			inspectingObject = object;
			var form = generateHTML();
			var inspector = $("div #inspector");

			inspector.html(form);
			
			/*var form = inspector.children("form");
			form.submit(function(e) {
				return false;
			});*/

			if (form !== false) {
				$("#" + inspectingObject.id + "-form").find("input").change(function(event) {
					inspectingObject.set($(this).prop("name"), $(this).val());
					inspectingObject.events.trigger("update", inspectingObject);
				});

				$("#" + inspectingObject.id + "-form").find("textarea").change(function(event) {
					inspectingObject.set($(this).prop("name"), $(this).val());
					inspectingObject.events.trigger("update", inspectingObject);
				});

				$("#switch").click(function(event) {
					event.preventDefault();
					inspectingObject.switch();
					inspectingObject.events.trigger("update", inspectingObject);
				});

				$("#delete").click(function(event) {
					event.preventDefault();
					var entity = inspectingObject;
					sense4us.deselect_object();
					entity.destroy();
				});
			}
		},
		getInspectedObject: function() {
			return inspectingObject;
		},
		update: function() {
			that.inspect(inspectingObject);
		}
	};

	return that;
}();

/**
* Triggers when an object have been selected.
* This triggers the inspector-panel change focus onto the
* newly selected object and its properties.
* @event object_selected
* @param {Object} object The selected object
*/
sense4us.events.bind("object_selected", function(object) {
	if (sense4us.active_modes.indexOf(sense4us.stage.mode) > -1) {
		sense4us.inspector.inspect(object);
	}

	sense4us.events.trigger("network_send_object", object);
});

/**
* Triggers when an object have been deselected.
* This triggers the inspector-panel remove focus of the previously selected object.
* @event object_deselected
* @param {Object} object The deselected object
*/
sense4us.events.bind("object_deselected", function(object) {
	sense4us.inspector.inspect(null);
});

sense4us.events.bind("object_released", function(object)
{
	sense4us.inspector.update();
});
