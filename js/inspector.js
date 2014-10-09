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

	var that = {
		/**
	    * Selects an object to inspect using the inspector-panel.
	    * @method inspect
	    * @param object {Object} This parameter defines the object we want to inspect.
	    */
		inspect: function(object) {
			sense4us.inspector.inspectingObject = object;
			console.log("inspecting object: " + sense4us.inspector.inspectingObject);
			sense4us.inspector.generateHTML();
		},

		/**
	    * Generates HTML for the inspector panel showing the attributes/properties of
	    * the currently inspectedObject.
	    * @method generateHTML
	    */
		generateHTML: function() {
			html = "";
			for (var property_name in sense4us.inspector.inspectingObject) {
				var property = sense4us.inspector.inspectingObject[property_name];
				// This if-statement will filter out all object properties which are functions and objects.
				if (!(property instanceof Function) && !(property instanceof Object)) {
					html += "<p>" + property_name + ": ";
					html += "<input type='text' value='"+property+"'></input>";
				}
			}
			$( "div.inspector" ).html(html);
			return html;
		}
	}

	return that;
}();

/**
* Event that fires when an object have been selected.
* This triggers the inspector-panel change focus onto the
* newly selected object and its properties.
* @event object_selected
* @param {Object} object The selected object
*/
sense4us.events.bind("object_selected", function(object) {
	sense4us.inspector.inspect(object);
});

/**
* Event that fires when an object have been deselected.
* This triggers the inspector-panel remove focus of the previously selected object.
* @event object_deselected
* @param {Object} object The deselected object
*/
sense4us.events.bind("object_deselected", function(object) {
	sense4us.inspector.inspect(null);
});
