'use strict';

var Immutable = require('Immutable');

var lineToRect = function(line) {
	if (line.get('x1') > line.get('x2')) {
		line = line.merge({x1: line.get('x2'), x2: line.get('x1')});
	}

	if (line.get('y1') > line.get('y2')) {
		line = line.merge({y1: line.get('y2'), y2: line.get('y1')});
	}

	return Immutable.Map({
		x: line.get('x1') - line.get('width') / 2,
		y: line.get('y1') - line.get('width') / 2,
		width: line.get('x2') - line.get('x1') + line.get('width') / 2,
		height: line.get('y2') - line.get('y1') + line.get('width') / 2
	});
};

var collisions = {
	pointCircle: function(point, circle) {
		var distance = Math.sqrt(Math.pow(point.get('x') - circle.get('x'), 2) + Math.pow(point.get('y') - circle.get('y'), 2));
		return distance <= circle.get('radius');
	},
	pointRect: function(point, rect) {
		return	point.get('x') >= rect.get('x') && point.get('x') <= rect.get('x') + rect.get('width') &&
				point.get('y') >= rect.get('y') && point.get('y') <= rect.get('y') + rect.get('height');
	},
	circleCircle: function(circleA, circleB) {
		var distance = Math.sqrt(Math.pow(circleA.get('x') - circleB.get('x'), 2) + Math.pow(circleA.get('y') - circleB.get('y'), 2));
		return distance <= circleA.get('radius') + circleB.get('radius');
	},
	pointLine: function(point, line) {
		console.log('derpii1');
		if (!collisions.pointRect(point, lineToRect(line))) {
			return false;
		}

		var line2 = Immutable.Map({x1: point.get('x'), y1: point.get('y'), x2: line.get('x2'), y2: line.get('y2')});

		var line1Angle = Math.atan2(line.get('y2') - line.get('y1'), line.get('x2') - line.get('x1'));
		var line2Angle = Math.atan2(line2.get('y2') - line2.get('y1'), line2.get('x2') - line2.get('x1'));

		var angleBetweenLines = line1Angle - line2Angle;

		var line2length = Math.sqrt(Math.pow(line2.get('x1') - line2.get('x2'), 2) + Math.pow(line2.get('y1') - line2.get('y2'), 2));

		var distance = line2length * Math.sin(angleBetweenLines);

		var result = distance <= line.get('width') / 2 && distance >= -line.get('width') / 2;

		return result;
	},
	hitTest: function(obj1, obj2) {
		var data = {};
		data.circles = [];
		data.lines = [];
		data.points = [];

		if (obj1.get('radius')) {
			data.circles.push(obj1);
		} else if (obj1.get('x1') && obj1.get('x2') && obj1.get('y1') && obj1.get('y2')) {
			data.lines.push(obj1);
		} else {
			data.points.push(obj1);
		}

		if (obj2.get('radius')) {
			data.circles.push(obj2);
		} else if (obj2.get('x1') && obj2.get('x2') && obj2.get('y1') && obj2.get('y2')) {
			data.lines.push(obj2);
		} else {
			data.points.push(obj2);
		}

		if (data.circles.length === 2) {
			return collisions.circleCircle(data.circles[0], data.circles[1]);
		} else if (data.points.length === 1 && data.lines.length === 1) {
			return collisions.pointLine(data.points[0], data.lines[0]);
		} else if (data.circles.length === 1 && data.points.length === 1) {
			return collisions.pointCircle(data.points[0], data.circles[0]);
		} else {
			console.log("UNDEFINED");
			console.log(obj1);
		}
	}
};

module.exports = collisions;