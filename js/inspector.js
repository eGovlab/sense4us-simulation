/**
* @namespace sense4us
*/

var sense4us = sense4us || {};

/**
* This is a static class that provides the inspector-panel to view and
* change the properties of elements in the simulation.
* @class inspector
* @constructor
*/

sense4us.inspector = function() {
	var inspectingElement = null;

	var that = {
		/**
	    * Selects an element to inspect using the inspector-panel.
	    * @method inspect
	    * @param elementId {String} This parameter defining the element we want to inspect.
	    */
		inspect: function(elementId) {
			sense4us.inspectingElement = document.getElementById(elementId);
			sense4us.inspectingElement = sense4us.inspectingElement || null;
			console.log("inspecting element: " + sense4us.inspectingElement);
		}
	}

	return that;
}
