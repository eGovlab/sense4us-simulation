'use strict';

var drawPicture = require('./draw_picture');
var drawCircle = require('./draw_circle');

var settings = [
	{
		color: 'rgba(255, 75, 75, 0.8)',
		conditions: [
			function(node) { return node.get('type') === 'actor'; },
			function(node) { return node.get('selected') === true; }
		]
	},
	{
		color: 'rgba(255, 75, 75, 0.6)',
		conditions: [
			function(node) { return node.get('type') === 'actor'; }
		]
	},
	{
		color: 'rgba(175, 75, 255, 0.8)',
		conditions: [
			function(node) { return node.get('type') === 'origin'; },
			function(node) { return node.get('selected') === true; }
		]
	},
	{
		color: 'rgba(175, 75, 255, 0.6)',
		conditions: [
			function(node) { return node.get('type') === 'origin'; }
		]
	},
	{
		color: 'rgba(255, 175, 75, 0.8)',
		conditions: [
			function(node) { return node.get('selected') === true; }
		]
	},
	{
		color: 'rgba(255, 175, 75, 0.6)',
		conditions: []
	}
];

module.exports = function drawNode(ctx, map, env) {
	ctx.shadowOffsetX = 0;
	ctx.shadowOffsetY = 0;
	ctx.shadowBlur = 10;
	ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
/*
	if (map.get('selected') === true) {
		ctx.fillStyle = 'rgba(255, 175, 75, 0.8)';
	} else {
		ctx.fillStyle = 'rgba(255, 175, 75, 0.6)';
	}
	*/
	
	var colors = settings.filter(function(style) {
		for (var i = 0; i < style.conditions.length; i++) {
			if (!style.conditions[i](map)) {
				return false;
			}
		}
		
		return true;
	});
	
	ctx.fillStyle = colors[0].color;
	
	ctx.beginPath();
	ctx.arc(map.get('x'), map.get('y'), map.get('radius'), 0, 360);
	ctx.fill();
	
    if (map.get('avatar')) {
        drawPicture(ctx, map.get('avatar'), map, function() {
			drawNode(ctx, map, env);
		});
    }
	
    if (map.get('icon')) {
		var iconCircle = require('../icon')(map);
		
		drawCircle(ctx, iconCircle, colors[0].color);
        drawPicture(ctx, map.get('icon'), iconCircle, function() {
			drawNode(ctx, map, env);
		});
    }
	
	var text = '';
	if (map.get('type') === 'actor') {
		text = 'Actor' + map.get('id');
	} else if (map.get('type') === 'origin') {
		text = map.get('relativeChange') + '';
	} else {
		if (env === 'edit') {
			text = map.get('value') + '';
		} else if (env === 'simulate') {
			text = map.get('simulateChange') + '';
		}
	}

	ctx.textBaseline = 'middle';
	ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
	
	var size = 48 - text.length * 2.4;
	size = size < 12 ? 12 : size;
	ctx.font = size + 'px sans-serif';
	var textData = ctx.measureText(text);
	ctx.fillText(text, map.get('x') - textData.width / 2, map.get('y'));
	
	ctx.shadowOffsetX = 0;
	ctx.shadowOffsetY = 0;
	ctx.shadowBlur = 0;
	ctx.shadowColor = 'rgba(0, 0, 0, 1)';

	// Draw node description above the node
	var descriptionSize = 22;
	ctx.font = descriptionSize + 'px sans-serif';
	ctx.textBaseline = 'bottom';
	var description = map.get('description');
	var descriptionData = ctx.measureText(description);
	ctx.fillText(description, map.get('x') - descriptionData.width / 2, map.get('y') - map.get('radius'));
};