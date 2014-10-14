/**
* @namespace sense4us
*/

var sense4us = sense4us || {};
sense4us.graphics = sense4us.graphics || {};

sense4us.graphics.color = function() {
	var colors = {
		border_line: "#39D",
		line: "#4AE",
		border_circle: "#39D",
		circle: "#4AE",
		selection_border_circle: "#162",
		selection_circle: "#AE4"
	};

	var gradient_colors = {
		border_line: ["#39D", "#39D"],
		line: ["#F00", "#00F"],
		border_circle: ["#39D", "#39D"],
		circle: ["#F00", "#00F"],
		selection_border_circle: ["#162", "#162"],
		selection_circle: ["#AE4", "#AE4"]
	}

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
		}
	};

	return that;
}();