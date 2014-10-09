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

	/**
    * Generates and returns the HTML content of the inspector panel.
    * The HTML content varies depending upon what object is being inspected.
    * Any changes made using the inspector-panel will trigger an "object_updated" event.
    * @method generateHTML
    * @private
    * @returns {String} The html content of the inspector panel
    */
	var generateHTML = function() {
		if (!inspectingObject) return null;
		html = "";
		html += "<form id='" + inspectingObject.id + "-form'>";
		for (var property_name in inspectingObject) {
			var property = inspectingObject[property_name];
			// This if-statement will filter out all object properties which are functions and objects.
			if (!(property instanceof Function) && !(property instanceof Object)) {
				html += "<p>" + property_name + ": ";
				html += "<input type='text' name='"+property_name+"' value='"+property+"'></input>";
			}
		}
		html += "</form>";

		return html;
	}

	var that = {
		/**
	    * Selects an object to inspect and refreshes the inspector-panel.
	    * @method inspect
	    * @param object {Object} This parameter defines the object we want to inspect.
	    */
		inspect: function(object) {
			inspectingObject = object;
			var html = generateHTML();
			$( "div.inspector" ).html(html);
			if (html) {
				$("#" + inspectingObject.id + "-form").find("input").change(function(event) {
					inspectingObject.set($(this).prop("name"), $(this).val());
					sense4us.events.trigger("object_updated", inspectingObject);
				});
			}
		},
	}

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
	sense4us.inspector.inspect(object);
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
