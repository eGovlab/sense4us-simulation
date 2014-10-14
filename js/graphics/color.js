/**
* @namespace sense4us
*/

var sense4us = sense4us || {};
sense4us.graphics = sense4us.graphics || {};

sense4us.graphics.color = function() {
	/**
	* @brief The commented lines are not used for the moment.
	*/
	var colors = {
		//border_line: "#39D",
		//line: "#4AE",

		border_circle: "#AF6",
		//circle: "#4AE",

		selection_border_circle: "#AF6",
		selection_circle: "#691",

		label: "#FAFAFA",
		label_shadow: "#130"
	};

	var gradient_colors = {
		border_line: ["#39D", "#39D"],
		line: ["#F00", "#00F"],

		//border_circle: ["#4DF", "#4DF"],
		circle: ["#691", "#8A2"]

		//selection_border_circle: ["#162", "#162"],
		//selection_circle: ["#AE4", "#AE4"]
	};

	var properties = {
		border_line_thickness: 12,
		line_thickness: 7,

		line_gradiant_radius_inner: 20,
		line_gradiant_radius_outer: 20,

		border_circle_radius: 52,
		circle_radius: 48,

		label_shadow_blur: 6,
		selection_label_shadow_blur: 4
	};

	var that = {
		get_gradient: function(identifier)
		{
			if(gradient_colors[identifier] !== undefined)
				return gradient_colors[identifier];

			return false;
		},

		get_color: function(identifier)
		{
			if(colors[identifier] !== undefined)
				return colors[identifier];

			return false;
		},

		get_property: function(identifier)
		{
			if(properties[identifier] !== undefined)
				return properties[identifier];

			return false;	
		}
	};

	return that;
}();