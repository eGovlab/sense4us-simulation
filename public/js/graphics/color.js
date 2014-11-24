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

		border_circle: "#AE6",
		//circle: "#4AE",

		selection_border_circle: "#AF6",
		selection_circle: "#691",

		border_origin: "#FF9A52",
		//origin: "#4AE",

		selection_border_origin: "#AF6",
		selection_origin: "#691",

		label: "#FAFAFA",
		label_shadow: "#130"
	};

	var gradient_colors = {
		border_line: ["#AE6", "#AE6"],
		line_positive: ["#8E1", "#120"],
		line_negative: ["#E41", "#210"],
		line_dead: ["#000", "#222"],

		//border_circle: ["#4DF", "#4DF"],
		circle: ["#691", "#8A2"],
		origin: ["#D45800", "#FF6A00"]

		//selection_border_circle: ["#162", "#162"],
		//selection_circle: ["#AE4", "#AE4"]
	};

	var properties = {
		border_line_thickness: 14,
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