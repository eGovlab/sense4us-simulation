"use strict";

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

		border_circle: "#fff",
		//circle: "#4AE",

		selection_border_circle: "#fff",
		selection_circle: "#2b3846",

		border_origin: "#fff",
		//origin: "#4AE",

		selection_border_origin: "#AF6",
		selection_origin: "#691",

		label: "#FAFAFA",
		label_shadow: "#130"
	};

	var gradient_colors = {
		border_line: ["#2b3846", "#2b3846"],
		line_positive: ["#3fb2bb", "#120"],
		line_negative: ["#E41", "#210"],
		line_dead: ["#000", "#222"],

		//border_circle: ["#4DF", "#4DF"],
		circle: ["#691", "#3fb2bb"],
		origin: ["#D45800", "#de8526"]

		//selection_border_circle: ["#162", "#162"],
		//selection_circle: ["#AE4", "#AE4"]
	};

	var properties = {
		border_line_thickness: 16,
		line_thickness: 11,

		line_gradiant_radius_inner: 20,
		line_gradiant_radius_outer: 20,

		border_circle_radius: 40,
		circle_radius: 36,

		border_origin_radius: 40,
		origin_radius: 36,

		selection_border_circle_radius: 17,
		selection_circle_radius: 15,

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