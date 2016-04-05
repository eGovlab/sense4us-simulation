require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

function ConfigParser() {
    if(!(this instanceof ConfigParser)) {
        throw new Error("Accessing ConfigParser as a generic method.");
    }

    this.config = null;
}

ConfigParser.prototype = {
    setConfig: function(path) {
        if(path && typeof path === "object") {
            this.config = path;
        } else if(path && typeof path === "string") {
            this.config = require(path);
        }
    },

    get: function() {
        if(arguments.length === 1) {
            var value = arguments[0];

            if(this.config[value] === undefined) {
                throw new Error("Trying to access " + value + " from config -- undefined.");
            }

            return this.config[value];
        }

        var tree = "",
            obj  = this.config;
        for(var i in arguments) {
            tree += arguments[i] + "/";
            if(obj[arguments[i]] === undefined) {
                throw new Error("Trying to access " + tree + " from config -- undefined.");
            }

            obj = obj[arguments[i]];
        }

        return obj;
    }
};

module.exports = new ConfigParser();
},{}],"aggregated_link.js":[function(require,module,exports){
'use strict';

var Immutable = null;

function aggregatedLink(link, nodeGui) {
    return {
        selected:     link.selected,
        loop:         link.loop,
        type:         link.type,
        coefficient:  link.coefficient,
        timelag:      link.timelag,
        debugNode:    nodeGui[link.node1].selected,
        x1:           nodeGui[link.node1].x,
        y1:           nodeGui[link.node1].y,
        x2:           nodeGui[link.node2].x,
        y2:           nodeGui[link.node2].y,
        width:        parseFloat(link.width),
        fromRadius:   parseFloat(nodeGui[link.node1].radius),
        targetRadius: parseFloat(nodeGui[link.node2].radius)
    };
};

module.exports = aggregatedLink;
},{}],"api/backend_api.js":[function(require,module,exports){
'use strict';

var curry   = require('./../strict_curry.js'),
    CONFIG  = require('./../config.js');

module.exports = curry(require('./../network'), CONFIG.get('url'));
},{"./../config.js":"config.js","./../network":"network/network.js","./../strict_curry.js":"strict_curry.js"}],"async_middleware.js":[function(require,module,exports){
function asyncMiddleware() {
    var parameters = Array.apply(null, arguments);
    return function middleware() {
        var callbacks      = [],
            errorCallbacks = [];

        for(var i = 0; i < arguments.length; i++) {
            if(typeof arguments[i] !== 'function') {
                throw 'Not a function given to asyncMiddleware';
            }

            if(arguments[i].length === parameters.length + 1) {
                callbacks.push(arguments[i]);
            } else if(arguments[i].length === parameters.length + 2) {
                errorCallbacks.push(arguments[i]);
            } else {
                console.error(arguments[i].length, parameters, parameters.length);
                throw 'Invalid amount of parameters to middleware.';
            }
        }

        return function() {
            var iterator    = -1,
                errIterator = -1;
            var next = function(err) {
                if(err) {
                    errIterator++;
                    iterator = parameters.length;
                    return errorCallbacks[errIterator].apply(null, [err].concat(parameters));
                }

                iterator++;
                if(iterator >= callbacks.length) {
                    return;
                }

                var callback = callbacks[iterator];
                if(callback.length === parameters.length + 1) {
                    return callback.apply(null, parameters.concat(next));
                }
            };

            next();
        }
    };
}

module.exports = asyncMiddleware;
},{}],"breakout.js":[function(require,module,exports){
'use strict';

module.exports = {
    nodes: function(model) {
        var dd = model.nodeData,
            dg = model.nodeGui,
            allNodes = [];

        Object.keys(dd).forEach(function(_dd_id) {
            if (!dg[_dd_id]) {
                return;
            }

            var obj = dd[_dd_id];

            Object.keys(dg[_dd_id]).forEach(function(_dg_property) {
                obj[_dg_property] = dg[_dd_id][_dg_property];
            });

            allNodes.push(obj);
        });

        return allNodes;
    },

    links: function(model) {
        var links = model.links,
            allLinks = [];

        Object.keys(links).forEach(function(key) {
            allLinks.push(links[key]);
        });

        return allLinks;
    }
};
},{}],"canvas/arithmetics.js":[function(require,module,exports){
'use strict';

module.exports = {
	mouseToCanvas: function(pos, canvas) {
		var x = pos.x - canvas.offsetLeft + (canvas.panX || 0);
		var y = pos.y - canvas.offsetTop  + (canvas.panY || 0);

		return {x: x, y: y};
	},

	canvasToMouse: function(pos, canvas) {
		var x = pos.x + canvas.offsetLeft - (canvas.panX || 0);
		var y = pos.y + canvas.offsetTop  - (canvas.panY || 0);

		return {x: x, y: y};
	}
};
},{}],"canvas/canvas.js":[function(require,module,exports){
'use strict';

module.exports = function(canvas, refresh) {
    var parent = canvas.parentElement;
    if (parent !== null) {
        canvas.width  = parent.offsetWidth;
        canvas.height = ((parent.offsetHeight-20) * 0.50);

        /*var timer = null;
        window.addEventListener('resize', function() {
            if (timer !== null) {
                clearTimeout(timer);
            }

            timer = setTimeout(function() {
                canvas.width  = parent.offsetWidth;
                canvas.height = parent.offsetHeight;

                refresh();
            }, 500);
        });*/
    }

	canvas.onmousedown = function(event){
		event.preventDefault();
	};

	return canvas;
};
},{}],"canvas/package.json":[function(require,module,exports){
module.exports={
    "name": "s4u_canvas",
    "main": "./canvas.js"
}
},{}],"collisions.js":[function(require,module,exports){
'use strict';

var objectHelper = require('./object-helper.js');

var lineToRect = function(line) {
	if (line.x1 > line.x2) {
		line = objectHelper.merge.call(line, {x1: line.x2, x2: line.x1});
	}

	if (line.y1 > line.y2) {
		line = objectHelper.merge.call(line, {y1: line.y2, y2: line.y1});
	}

	return {
		x: line.x1 - line.width / 2,
		y: line.y1 - line.width / 2,
		width: line.x2 - line.x1 + line.width / 2,
		height: line.y2 - line.y1 + line.width / 2
	};
};

var collisions = {
	pointCircle: function(point, circle) {
		var distance = Math.sqrt(Math.pow(point.x - circle.x, 2) + Math.pow(point.y - circle.y, 2));
		return distance <= circle.radius;
	},
	pointRect: function(point, rect) {
		return	point.x >= rect.x && point.x <= rect.x + rect.width &&
				point.y >= rect.y && point.y <= rect.y + rect.height;
	},
	circleCircle: function(circleA, circleB) {
		var distance = Math.sqrt(Math.pow(circleA.x - circleB.x, 2) + Math.pow(circleA.y - circleB.y, 2));
		return distance <= circleA.radius + circleB.radius;
	},
	pointLine: function(point, line) {
		if (!collisions.pointRect(point, lineToRect(line))) {
			return false;
		}

		var line2 = {x1: point.x, y1: point.y, x2: line.x2, y2: line.y2};

		var line1Angle = Math.atan2(line.y2 - line.y1, line.x2 - line.x1);
		var line2Angle = Math.atan2(line2.y2 - line2.y1, line2.x2 - line2.x1);

		var angleBetweenLines = line1Angle - line2Angle;

		var line2length = Math.sqrt(Math.pow(line2.x1 - line2.x2, 2) + Math.pow(line2.y1 - line2.y2, 2));

		var distance = line2length * Math.sin(angleBetweenLines);

		var result = distance <= line.width / 2 && distance >= -line.width / 2;

		return result;
	},
	hitTest: function(obj1, obj2) {
		var data = {};
		data.circles = [];
		data.lines = [];
		data.points = [];

		if (obj1.radius) {
			data.circles.push(obj1);
		} else if (obj1.x1 && obj1.x2 && obj1.y1 && obj1.y2) {
			data.lines.push(obj1);
		} else {
			data.points.push(obj1);
		}

		if (obj2.radius) {
			data.circles.push(obj2);
		} else if (obj2.x1 && obj2.x2 && obj2.y1 && obj2.y2) {
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
		}
		
		console.error('UNDEFINED');
		console.error(obj1);
	}
};

module.exports = collisions;
},{"./object-helper.js":"object-helper.js"}],"config.js.template":[function(require,module,exports){
module.exports = {
    BACKEND_HOSTNAME:  'localhost:3000',
    SIDEBAR_CONTAINER: document.getElementById('sidebar'),
    MENU_CONTAINER:    document.getElementById('upper-menu')
};
},{}],"config.js":[function(require,module,exports){
'use strict';

var CONFIG = require('rh_config-parser');

module.exports = CONFIG;
},{"rh_config-parser":1}],"curry.js":[function(require,module,exports){
'use strict';

// a function to generate a function which has predefined parameters
function curry(fn) {
	// arguments are all arguments used to call the curry-function
	// it's not an array, so we can't splice it
	// but by using apply we can use the Array's splice-function
	// to get all arguments after the first one (which is the function to be curried)
	var predefinedArguments = Array.prototype.splice.call(arguments, 1);

	// the curried function!
	return function() {
		// we must first get the additional arguments, again we have to splice them
		// though from zero this time, since we want to use all inserted arguments
		var newArguments = Array.prototype.splice.call(arguments, 0);

		// the predefined arguments together with the new ones
		var allArguments = predefinedArguments.concat(newArguments);

		// if the number of arguments are less than the number of parameters in the original function
		// then we return a new curry, that we can then add more arguments to
		if (fn.length > allArguments.length) {
			return curry(fn, allArguments);
		}
		
		// otherwise, if we have enoug arguments, we call the function
		// with all the arguments
		return fn.apply(this, allArguments);
	};
}

module.exports = curry;
},{}],"floating_window/floating_window.js":[function(require,module,exports){
'use strict';

var menuBuilder = require('./../menu_builder');

function FloatingWindow(x, y, w, h, className) {
    this.container;
    this.body;
    this.title;

    this.x = x;
    this.y = y;

    this.w = w;
    this.h = h;

    this.className = className;
    this.createWindow(x, y, w, h, className);
}

FloatingWindow.prototype = {
     createWindow: function(x, y, w, h) {
        if(this.container) {
            return;
        }

        if(
            !x && this.x &&
            !y && this.y &&
            !w && this.w &&
            !h && this.h
        ) {
            x = this.x;
            y = this.y;
            w = this.w;
            h = this.h;
        }

        this.container = menuBuilder.div('mb-floating-window');;
        var container = this.container;

        var that = this;

        this.container.style.left     = x + 'px';
        this.container.style.top      = y + 'px';
        this.container.style.width    = w + 'px';
        this.container.style.height   = (h + 20) + 'px';

        this.title      = menuBuilder.div('title');
        this.clear      = menuBuilder.div('clear');
        this.killButton = menuBuilder.div('kill-button');
        this.body       = menuBuilder.div(this.className);
        this.body.style.height = h + 'px';

        this.span           = document.createElement('span');
        this.span.className = 'glyphicon glyphicon-remove';

        this.killButton.appendChild(this.span);

        this.title.appendChild(this.killButton);
        this.title.appendChild(this.clear);
        
        this.container.appendChild(this.title);
        this.container.appendChild(this.body);

        this.killCallback = function() {
            that.destroyWindow();
        };

        this.killButton.addEventListener('click', this.killCallback);

        var startX = this.x,
            startY = this.y;

        this.initializeMove = function(pos) {
            startX = pos.clientX;
            startY = pos.clientY;

            document.body.addEventListener('mousemove', moveCallback);
            document.body.addEventListener('mouseup',   that.deactivateMove);
        };

        this.deactivateMove = function() {
            document.body.removeEventListener('mousemove', moveCallback);
            document.body.removeEventListener('mouseup',   that.deactivateMove);
        };

        var moveCallback = function(pos) {
            var rect = container.getBoundingClientRect();

            var newX = pos.clientX - startX,
                newY = pos.clientY - startY;

            startX = pos.clientX;
            startY = pos.clientY;

            that.x = rect.left + newX;
            that.y = rect.top  + newY;

            container.style.left = that.x + 'px';
            container.style.top  = that.y + 'px';
        };

        this.title.addEventListener('mousedown', this.initializeMove);
     },

     destroyWindow: function() {
        if(this.container === null) {
            return;
        }
        
        this.killButton.removeEventListener('click',   this.killCallback);
        this.title.removeEventListener('mousedown',    this.initializeMove);
        document.body.removeEventListener('mouseup',   this.deactivateMove);
        document.body.removeChild(this.container);

        this.container  = null;
        this.body       = null;
        this.title      = null;
        this.clear      = null;
        this.killButton = null;
        this.span       = null;

        this.killCallback   = null;
        this.initializeMove = null;
     }
};

module.exports = FloatingWindow;

},{"./../menu_builder":"menu_builder/menu_builder.js"}],"floating_window/package.json":[function(require,module,exports){
module.exports={
    "name": "floating_window",
    "main": "./floating_window.js"
}

},{}],"generate_id.js":[function(require,module,exports){
'use strict';

var temp_id = 0;

var generateId = function() {
	temp_id++;
	return temp_id;
};

module.exports = generateId;
},{}],"graphics/draw_actor.js":[function(require,module,exports){
'use strict';

function drawActor(ctx, layer, link, loadedModel) {
    var fromNode   = loadedModel.nodeGui[link.node1],
        targetNode = loadedModel.nodeGui[link.node2];

    var x1 = fromNode.x,
        x2 = targetNode.x,
        y1 = fromNode.y,
        y2 = targetNode.y;

    var fromRadius   = fromNode.radius + 8,
        targetRadius = targetNode.radius + (8 * layer);

    if(fromNode.color) {
        ctx.strokeStyle = fromNode.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x1, y1, fromRadius, 0, 360);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x2, y2, targetRadius, 0, 360);
        ctx.stroke();
    }
}

module.exports = drawActor;
},{}],"graphics/draw_change.js":[function(require,module,exports){
'use strict';

var valueColors = require('./value_colors.js');

module.exports = function drawChange(ctx, x, y, value) {
    ctx.fillStyle = valueColors.neutral;
    if(value > 0) {
        ctx.fillStyle = valueColors.positive;
    } else if(value < 0) {
        ctx.fillStyle = valueColors.negative;
    } else if(isNaN(value)) {
        return;
    }
    
    ctx.textBaseline = 'top';
    ctx.font         = '22px Arial';

    var valueString = value + '%';

    var textData = ctx.measureText(valueString);
    ctx.fillText(valueString, x - textData.width / 2, y);
};
},{"./value_colors.js":"graphics/value_colors.js"}],"graphics/draw_circle.js":[function(require,module,exports){
'use strict';

module.exports = function drawNode(ctx, map, color) {
	ctx.fillStyle = color;
	
	ctx.beginPath();
	ctx.arc(map.get('x'), map.get('y'), map.get('radius'), 0, 360);
	ctx.fill();
};
},{}],"graphics/draw_coordinate.js":[function(require,module,exports){
'use strict';

function drawCoordinate(ctx, x, y, color) {
    ctx.strokeStyle = color;
    ctx.lineJoin = 'miter';
    ctx.lineCap  = 'square';

    ctx.lineWidth = 6;

    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, 0);
    ctx.stroke();
}

module.exports = drawCoordinate;
},{}],"graphics/draw_line_graph.js":[function(require,module,exports){
'use strict';

var objectHelper = require('./../object-helper.js');

function generateHexColor() {
    return Math.round(Math.random() * 255).toString(16);
}

function generateColor() {
    return '#' + generateHexColor() + generateHexColor() + generateHexColor();
}

function drawLineGraph(ctx, x, y, w, h, values) {
    var highestValue  = 0,
        lowestValue   = false,
        amountOfSteps = 0;

    objectHelper.forEach.call(
        values,
        function(node) {
            node.values.forEach(function(value, step) {
                if(value > highestValue) {
                    highestValue = value;
                }

                if(lowestValue === false || value < lowestValue) {
                    lowestValue = value;
                }

                if(step > amountOfSteps) {
                    amountOfSteps = step;
                }
            });
        }
    );

    var innerlineMargin = ((w + h) / 2) * 0.05,
        twiceMargin     = innerlineMargin * 2,
        thriceMargin    = innerlineMargin * 3;

    var graphX      = x + 40 + innerlineMargin,
        graphY      = y,
        graphHeight = h - 40 - innerlineMargin,
        graphWidth  = w - 40 - innerlineMargin;

    /* Body */

    ctx.strokeStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(x + 40, y);
    ctx.lineTo(x + 40, y + h - 40);
    ctx.lineTo(x + w,  y + h - 40);
    ctx.stroke();

    /* Timesteps */

    var timestepStringY = y + h - 36;

    var fontSize = 14;

    ctx.font         = fontSize + 'px Arial';
    ctx.textBaseline = 'top'; 
    ctx.fillText(0, x + 36 + innerlineMargin, timestepStringY);

    var halfSteps = Math.round(amountOfSteps / 2);
    var halfStepsWidth = ctx.measureText(halfSteps).width;
    ctx.fillText(halfSteps, (x + 40) + ((w - 40) / 2), timestepStringY);

    var allStepsWidth = ctx.measureText(amountOfSteps).width;
    ctx.fillText(amountOfSteps, x + w - allStepsWidth, timestepStringY);

    var timestepLegend = 'Timestep';
    var timestepLegendWidth = ctx.measureText(timestepLegend).width;
    ctx.fillText('Timestep', (x + 40) + ((w - 40) / 2) - timestepLegendWidth / 2, y + h - 16);

    /* Values */

    ctx.textBaseline = 'middle'; 
    var lowestValueY = y + h - 44 - innerlineMargin / 2;

    var highestValueWidth = ctx.measureText(highestValue).width;
    ctx.fillText(highestValue, x + 36 - highestValueWidth, y);

    var halfHighestValue = (highestValue - lowestValue) / 2 + lowestValue;
    var halfHighestValueWidth = ctx.measureText(halfHighestValue).width;
    ctx.fillText(halfHighestValue, x + 36 - halfHighestValueWidth, (y + lowestValueY) / 2);

    var lowestValueWidth = ctx.measureText(lowestValue).width;
    ctx.fillText(lowestValue, x + 36 - lowestValueWidth, lowestValueY);

    var valueLegend = 'Value';
    var valueLegendWidth = ctx.measureText(valueLegend).width;

    ctx.save();
    ctx.translate(x, (y + h - 40) / 2);
    ctx.rotate(Math.PI / 2);

    ctx.fillText(valueLegend, 0 - valueLegendWidth / 2, 0);
    ctx.restore();

    /* Node values */

    var circleRadius = 5;
    var margin = graphWidth / amountOfSteps;

    function drawNode(step, value, lastX, lastY) {
        var circleY = graphHeight - (graphHeight * (value - lowestValue) / (highestValue - lowestValue)),
            circleX = margin * step;

        if(lastX !== undefined && lastY !== undefined) {
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(circleX, circleY);
            ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(circleX, circleY, circleRadius, 0, 2 * Math.PI);
        ctx.fill();

        return {x: circleX, y: circleY};
    }

    objectHelper.forEach.call(
        values,
        function(node) {
            var lastX     = undefined,
                lastY     = undefined,
                //step      = 0,
                lastValue = 0,
                coords;
            ctx.save();
            ctx.translate(graphX, graphY);

            ctx.fillStyle      = node.color;
            ctx.strokeStyle    = node.color;
            ctx.lineWidth      = 4;
            ctx.lineCap        = 'round';
            
            node.values.forEach(function(value, step) {
                /*while(step < index) {
                    coords = drawNode(step, lastValue, lastX, lastY);
                    step++;

                    lastX = coords.x;
                    lastY = coords.y;
                }*/

                coords = drawNode(step, value, lastX, lastY);
                lastValue = value;
                //step++;

                lastX = coords.x;
                lastY = coords.y;
            });

            /*while(step <= amountOfSteps) {
                coords = drawNode(step, lastValue, lastX, lastY);
                step++;

                lastX = coords.x;
                lastY = coords.y;
            }*/

            //ctx.fillText(node.name, lastX + circleRadius + 4, lastY);
            ctx.restore();
        }
    );
}

module.exports = drawLineGraph;
},{"./../object-helper.js":"object-helper.js"}],"graphics/draw_link.js":[function(require,module,exports){
'use strict';

var valueColors    = require('./value_colors.js'),
    drawCoordinate = require('./draw_coordinate.js');

module.exports = function drawLink(ctx, line) {
    /*
    ** Variable initiation
    */

    var x1             = line.x1,
        y1             = line.y1,
        x2             = line.x2,
        y2             = line.y2,

        dx             = x2 - x1,
        dy             = y2 - y1,

        distance       = Math.sqrt(dx*dx + dy*dy),
        angle          = Math.atan2(dy, dx),
        
        fromRadius     = line.fromRadius   + 8,
        targetRadius   = line.targetRadius + 8,
        lineWidth      = line.width,
        halfLineWidth  = lineWidth * 0.80,

        startX         = x1 + Math.cos(angle) * (fromRadius),
        startY         = y1 + Math.sin(angle) * (fromRadius),
        
        arrowEndX      = x1 + Math.cos(angle) * (distance - (targetRadius + halfLineWidth)),
        arrowEndY      = y1 + Math.sin(angle) * (distance - (targetRadius + halfLineWidth)),

        arrowMiddleX   = startX + Math.cos(angle) * ((distance - fromRadius - targetRadius) / 2),
        arrowMiddleY   = startY + Math.sin(angle) * ((distance - fromRadius - targetRadius) / 2),
        
        arrowStartX    = x1 + Math.cos(angle) * (distance - (targetRadius + 25)),
        arrowStartY    = y1 + Math.sin(angle) * (distance - (targetRadius + 25)),
        
        halfPI         = Math.PI / 2,

        anchorDistance = 10,
        
        leftAngle      = angle + halfPI,
        rightAngle     = angle - halfPI,

        leftAnchorX    = arrowStartX + Math.cos(leftAngle) * anchorDistance,
        leftAnchorY    = arrowStartY + Math.sin(leftAngle) * anchorDistance,
        
        rightAnchorX   = arrowStartX + Math.cos(rightAngle) * anchorDistance,
        rightAnchorY   = arrowStartY + Math.sin(rightAngle) * anchorDistance,

        coefficientX   = arrowMiddleX + Math.cos(leftAngle) * 20,
        coefficientY   = arrowMiddleY + Math.sin(leftAngle) * 20;

    if(distance < fromRadius + targetRadius) {
        return;
    }

    /*
    ** Draw the initial arrow.
    */

    /*ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur    = 10;
    ctx.shadowColor   = 'rgba(0, 0, 0, 0.5)';*/

    ctx.lineJoin = 'miter';
    ctx.lineCap  = 'square';

    if (line.selected === true) {
        ctx.strokeStyle = 'rgba(0,0,0, 0.6)';
    } else if(line.loop === true) {
        ctx.strokeStyle = 'rgba(220, 30, 140, 0.8)';
    }  else {
        if(line.coefficient > 0) {
            ctx.strokeStyle = valueColors.positive;
        } else if(line.coefficient < 0) {
            ctx.strokeStyle = valueColors.negative;
        } else {
            ctx.strokeStyle = 'rgba(0,0,0, 0.6)';
        }
    }

    ctx.lineWidth = line.width * 1.2;
    ctx.beginPath();

    ctx.moveTo(startX,       startY);
    ctx.lineTo(arrowStartX,  arrowStartY);
    ctx.lineTo(leftAnchorX,  leftAnchorY);
    ctx.lineTo(arrowEndX,    arrowEndY);
    ctx.lineTo(rightAnchorX, rightAnchorY);
    ctx.lineTo(arrowStartX,  arrowStartY);

    ctx.closePath();
    ctx.stroke();

    if(line.type === 'halfchannel') {
        /*
        ** Draw another smaller line on top of the initial arrow.
        */

        /*ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'rgba(0, 0, 0, 1)';*/

        
        ctx.strokeStyle = 'rgba(255, 255, 255, 1)';

        ctx.lineWidth = line.width;
        ctx.lineJoin = 'miter';
        ctx.lineCap  = 'square';
        ctx.beginPath();

        ctx.moveTo(startX,       startY);
        ctx.lineTo(arrowStartX,  arrowStartY);
        ctx.lineTo(leftAnchorX,  leftAnchorY);
        ctx.lineTo(arrowEndX,    arrowEndY);
        ctx.lineTo(rightAnchorX, rightAnchorY);
        ctx.lineTo(arrowStartX,  arrowStartY);

        ctx.closePath();
        ctx.stroke();
    }

    if(line.coefficient !== undefined) {
        var textHeight = 14,
            offsetBase = 8;
        ctx.font = textHeight + 'px Arial';
        var coefficient = line.coefficient;
        if(coefficient > 0) {
            ctx.fillStyle = valueColors.positive;
        } else if(coefficient < 0) {
            ctx.fillStyle = valueColors.negative;
        } else {
            ctx.fillStyle = valueColors.neutral;
        }

        var coefficientMeasurement = ctx.measureText(coefficient);

        var concatenatedString = coefficient;
        var timelag = line.timelag;
        if(timelag !== undefined) {
             concatenatedString += ', T: ' + timelag;
        }
        var textMeasurement = ctx.measureText(concatenatedString);

        //console.log(megaString, textMeasurement.width);

        
        ctx.textBaseline = 'middle';

        /*
        ** String aligned with arrow */

        var halfTextWidth  = textMeasurement.width / 2,
            halfTextHeight = textHeight / 2;

        var offsetX = halfTextWidth  + offsetBase, // padding X
            offsetY = halfTextHeight + offsetBase; // padding Y

        var textX = arrowMiddleX - halfTextWidth  + Math.cos(angle + halfPI)*offsetX,
            textY = arrowMiddleY + halfTextHeight + Math.sin(angle + halfPI)*offsetY;

        ctx.fillText(coefficient, textX, textY);
        if(timelag !== undefined) {
            ctx.fillStyle = valueColors.neutral;
            ctx.fillText(', T: ' + line.timelag, textX + coefficientMeasurement.width, textY);
        }

        /*
        ** String rotated WITH the arrow.

        ctx.save();
        ctx.translate(coefficientX, coefficientY);
        ctx.rotate(angle);

        coefficientX = 0 - (textMeasurement.width / 2);
        
        ctx.fillText(coefficient, coefficientX, 0);
        
        if(timelag !== undefined) {
            ctx.fillStyle = valueColors.neutral;
            ctx.fillText(', T: ' + line.timelag, coefficientX + coefficientMeasurement.width, 0);
        }

        ctx.restore();
        */
    }
};

},{"./draw_coordinate.js":"graphics/draw_coordinate.js","./value_colors.js":"graphics/value_colors.js"}],"graphics/draw_linker.js":[function(require,module,exports){
'use strict';

module.exports = function drawLinker(ctx, linker, node) {
	ctx.shadowOffsetX = 0;
	ctx.shadowOffsetY = 0;
	ctx.shadowBlur = 10;
	ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';

	ctx.fillStyle = 'red';
	ctx.beginPath();
	var linkerNode = linker(node);
	ctx.arc(linkerNode.x, linkerNode.y, linkerNode.radius, 0, 360);
	ctx.fill();

	ctx.shadowOffsetX = 0;
	ctx.shadowOffsetY = 0;
	ctx.shadowBlur = 0;
	ctx.shadowColor = 'rgba(0, 0, 0, 1)';
};
},{}],"graphics/draw_node.js":[function(require,module,exports){
'use strict';

var drawPicture     = require('./draw_picture'),
    drawCircle      = require('./draw_circle');

var settings = [
    {
        color: 'rgba(255, 85, 85, 1)',
        conditions: [
            function(node) { return node.type === 'actor'; },
            function(node) { return node.selected === true; }
        ]
    },
    {
        color: 'rgba(255, 75, 75, 0.9)',
        conditions: [
            function(node) { return node.type === 'actor'; }
        ]
    },
    {
        color: 'rgba(195, 85, 255, 1)',
        conditions: [
            function(node) { return node.type === 'origin'; },
            function(node) { return node.selected === true; }
        ]
    },
    {
        color: 'rgba(175, 75, 255, 0.9)',
        conditions: [
            function(node) { return node.type === 'origin'; }
        ]
    },
    {
        color: 'rgba(255, 195, 85, 1)',
        conditions: [
            function(node) { return node.selected === true; }
        ]
    },
    {
        color: 'rgba(255, 175, 75, 0.9)',
        conditions: []
    }
];

module.exports = function drawNode(ctx, map) {
    /*
    if (map.selected === true) {
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

    if (map.avatar) {
        drawPicture(ctx, map.avatar, map, function(_ctx, _imagePath, _map, _refresh) {
            drawNode(ctx, map);
        });
    } else {
        ctx.fillStyle = colors[0].color;
        
        ctx.beginPath();
        ctx.arc(map.x, map.y, map.radius, 0, 360);
        ctx.fill();
    }

    if(map.linegraph && map.graphColor) {
        ctx.strokeStyle = map.graphColor;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(map.x, map.y, map.radius + 8, 0, 360);
        ctx.stroke();
    }
    
    if (map.icon) {
        var iconCircle = require('../icon')(map);
        
        drawCircle(ctx, iconCircle, colors[0].color);
        drawPicture(ctx, map.icon, iconCircle, function() {
            drawNode(ctx, map);
        });
    }

    return;
    
    var text = map.description;
    if(!text) {
        return;
    }
    /*if (map.type === 'actor') {
        text = 'Actor' + map.id;
    } else if (map.type === 'origin') {
        text = map.relativeChange + '';
    } else {
        if (env === 'modelling') {
            text = map.value + '';
        } else if (env === 'simulate') {
            text = map.simulateChange + '';
        }
    }*/

    /*ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';*/

    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(80, 80, 80, 1.0)';
    
    var size = 48 - text.length * 2.4;
    size = size < 16 ? 16 : size;
    ctx.font = size + 'px sans-serif';
    var textData = ctx.measureText(text);
    ctx.fillText(text, map.x - textData.width / 2, map.y + map.radius + 4);

    /*
    // Draw node description above the node
    var descriptionSize = 22;
    ctx.font = descriptionSize + 'px sans-serif';
    ctx.textBaseline = 'bottom';
    var description = map.description;
    var descriptionData = ctx.measureText(description)
    ctx.fillText(description, map.x - descriptionData.width / 2, map.y - map.radius);
    */
};

},{"../icon":"icon.js","./draw_circle":"graphics/draw_circle.js","./draw_picture":"graphics/draw_picture.js"}],"graphics/draw_picture.js":[function(require,module,exports){
'use strict';

var CONFIG = require('./../config.js');

var url = CONFIG.get('url');
if(url.charAt(url.length - 1) !== '/') {
    url = url + '/';
}

var images = {};
var PLACEHOLDER_PATH = url + 'img/file_not_found.png';

function drawScaledImage(ctx, image, x, y, w, h) {
    if (w > image.width || h > image.h) {
        ctx.drawImage(image, x, y, w, h);
        return;
    }
    
    // Step it down several times
    /*var can2 = document.createElement('canvas');
    var scalingW = image.width - ((image.width - w) / 4);
    var scalingH = image.height - ((image.height - h) / 4);
    can2.width = scalingW;
    can2.height = scalingH;
    var ctx2 = can2.getContext('2d');
    
    // Draw it at 1/2 size 3 times (step down three times)
    
    ctx2.drawImage(image, 0, 0, scalingW, scalingH);
    var newScalingW = image.width - ((image.width - w) / 2);
    var newScalingH = image.height - ((image.height - h) / 2);
    ctx2.drawImage(can2, 0, 0, scalingW, scalingH, 0, 0, newScalingW, newScalingH);*/
    /*
    var newScalingW2 = image.width - ((image.width - w) / 1.5);
    var newScalingH2 = image.height - ((image.height - h) / 1.5);
    ctx2.drawImage(can2, 0, 0, newScalingW, newScalingH, 0, 0, newScalingW2, newScalingH2);
    */
    //ctx2.drawImage(can2, 0, 0, image.width / 2, image.height / 2, 0, 0, image.width / 4, image.height / 4);
    //ctx2.drawImage(can2, 0, 0, w/2, h/2, 0, 0, w/4, h/4);
    //ctx2.drawImage(can2, 0, 0, w/4, h/4, 0, 0, w/6, h/6);
    //ctx.drawImage(can2, 0, 0, newScalingW, newScalingH, x, y, w, h);
    ctx.drawImage(image, x, y, w, h);
}

function drawImage(ctx, image, map) {
    ctx.globalCompositeOperation = 'source-over';
    // Save the state, so we can undo the clipping
    ctx.save();

    // Create a circle
    ctx.beginPath();
    ctx.arc(map.x, map.y, map.radius + 2, 0, 360);

    // Clip to the current circle
    ctx.clip();
    
    ctx.drawImage(image, map.x - map.radius, map.y - map.radius, map.radius * 2, map.radius * 2);

    //drawScaledImage(ctx, image, map.x - map.radius, map.y - map.radius, map.radius * 2, map.radius * 2);
    
    // Undo the clipping
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
}

var placeholder = new Image();
placeholder.src = PLACEHOLDER_PATH;

function drawPicture(ctx, imagePath, map, refresh) {
    refresh = refresh || drawPicture;
    
    var img = null;
    var index = imagePath.indexOf(url);
    if(index === -1) {
        imagePath = url + imagePath;
    }
    
    if (images.hasOwnProperty(imagePath)) {
        img = images[imagePath];
        if (img.isLoading === true) {
            img.nodesWaiting.push(map);
            return;
        }
        
        try {
            drawImage(ctx, img, map);        
        } catch(error) {
            ctx.restore();
            console.error(error);
            images[imagePath] = placeholder;
        }
    } else {
        img = new Image();   // Create new img element
        //window.derp = img;

        images[imagePath] = img;
        img.src = imagePath; // Set source path
        img.isLoading = true;
        img.nodesWaiting = [
            map
        ];
        
        img.onload = function() {
            img.isLoading = false;
            
            img.nodesWaiting.forEach(function(_map) {
                drawImage(ctx, img, _map);
                //refresh(ctx, imagePath, _map, refresh);
            });

            img.nodesWaiting = undefined;
        };
        
        img.onerror = function(error) {
            console.error('the image with path', imagePath, 'doesn\'t seem to exist');
            images[imagePath] = placeholder;
            img.nodesWaiting.forEach(function(_map) {
                drawImage(ctx, placeholder, _map);
            });

            img.nodesWaiting = undefined;
            //refresh(ctx, imagePath, map, refresh);
        };
    }
}

module.exports = drawPicture;

},{"./../config.js":"config.js"}],"graphics/draw_text.js":[function(require,module,exports){
'use strict';

module.exports = function drawText(ctx, text, x, y, color, centered, size, font, baseline) {
    var fontSize     = size     || '18',
        fontType     = font     || 'sans-serif',
        textX        = x        || 0,
        textY        = y        || 0,
        fontColor    = color    || 'rgba(80,80,80,1)',
        fontBaseline = baseline || 'top';

    ctx.textBaseline = fontBaseline;
    ctx.fillStyle    = fontColor;
    ctx.font         = fontSize + 'px ' + fontType;

    if(centered) {
        textX = textX - (ctx.measureText(text).width / 2);
    }

    ctx.fillText(text, textX, textY);
};

},{}],"graphics/draw_time_table.js":[function(require,module,exports){
'use strict';

var menuBuilder  = require('../menu_builder'),
    objectHelper = require('./../object-helper.js'),
    valueColors  = require('./value_colors.js');

module.exports = function drawTimeTable(ctx, map) {
    var data = map.timeTable;

    var size   = 24,
        startY = ((map.y - size / 2) - ((size * objectHelper.size.call(data)) / 2)),

        longestTimeStep = 0,
        longestSymbol   = 0,
        longestValue    = 0,
        longestString   = 0,
        rowStrings      = [];

    ctx.font = size + 'px Arial';

    objectHelper.forEach.call(
        data,
        function getRowLength(value, timeStep) {
            value = Math.round(value * 100) / 100;
            var symbol = ' ';
            if(value > 0) {
                symbol = '+';
            } else if(value < 0) {
                symbol = '-';
            }

            var rowString      = 'T' + timeStep + ', ' + symbol + ' ' + Math.abs(value) + '%',
                timeStepLength = ctx.measureText('T' + timeStep + ', ').width,
                symbolLength   = ctx.measureText(symbol + ' ').width,
                valueLength    = ctx.measureText(Math.abs(value) + '%').width;

            if(timeStepLength > longestTimeStep) {
                longestTimeStep = timeStepLength;
            }

            if(symbolLength > longestSymbol) {
                longestSymbol = symbolLength;
            }

            if(valueLength > longestValue) {
                longestValue = valueLength;
            }

            rowStrings.push({
                step:   timeStep,
                symbol: symbol,
                value:  value
            });
        }
    );

    var valueX   = map.x - map.radius - longestValue - 8,
        symbolX  = valueX - longestSymbol,
        startX   = symbolX - longestTimeStep;

    rowStrings.forEach(function drawTableRow(stringInformation, index) {
        var stepString   = 'T'+stringInformation.step+', ',
            symbolString = stringInformation.symbol + ' ',
            valueString  = Math.abs(stringInformation.value) + '%';

        ctx.textBaseline = 'top';
        var y = startY + (size * index);

        ctx.fillStyle = 'rgba(30, 50, 100, 1.0)';
        ctx.fillText(stepString,   startX,   y);

        var changeColor = valueColors.neutral;
        if(stringInformation.value > 0) {
            changeColor = valueColors.positive;
        } else if(stringInformation.value < 0) {
            changeColor = valueColors.negative;
        }

        ctx.fillStyle = changeColor;
        ctx.fillText(symbolString, symbolX, y);

        ctx.fillStyle = changeColor;
        ctx.fillText(valueString,  valueX,  y);
    });
}
},{"../menu_builder":"menu_builder/menu_builder.js","./../object-helper.js":"object-helper.js","./value_colors.js":"graphics/value_colors.js"}],"graphics/value_colors.js":[function(require,module,exports){
'use strict';

module.exports = {
    neutral:  'rgba(80, 80, 80, 1.0)',
    positive: 'rgba(20, 150, 40, 1.0)',
    negative: 'rgba(150, 20, 40, 1.0)'
};
},{}],"icon.js":[function(require,module,exports){
'use strict';

var Immutable = null;

function icon(map) {
	var x = map.x;
	var y = map.y;
	
	if (map.iconXOffset !== undefined && map.iconYOffset !== undefined) {
		var angle = Math.atan2(map.iconYOffset, map.iconXOffset);
		
		x += Math.cos(angle) * map.radius;
		y += Math.sin(angle) * map.radius;
	} else {
		x -= map.radius * 0.707;
		y -= map.radius * 0.707;
	}
	
	return {
		//x: map.x + (map.iconXOffset || 0) - map.radius * 0.707,
		//y: map.y + (map.iconYOffset || 0) - map.radius * 0.707,
		x: x,
		y: y,
		radius: 30
	};
}

module.exports = icon;
},{}],"information_tree/information_tree.js":[function(require,module,exports){
'use strict';

var Immutable = null;

function hide(evt) {
    var element = this.nextElementSibling;
    while(element) {
        if(element.className !== 'keyword') {
            element = element.nextElementSibling;
            continue;
        }

        if(element.style.display === 'none') {
            element.style.display = 'block';
        } else {
            element.style.display = 'none';
        }
        
        element = element.nextElementSibling;
    }
}

function unselect(evt) {
    evt.preventDefault();
}

function createCategoryElement() {
    var categoryElement = document.createElement('div');

    categoryElement.className = 'category';

    return categoryElement;
}

function createCategoryHeader(header) {
    var headerElement = document.createElement('div');

    headerElement.className = 'header';
    headerElement.innerHTML = header;
    headerElement.addEventListener('click', hide);
    headerElement.addEventListener('mousedown', unselect, false);

    return headerElement;
}

function createKeyword(keyword, importTo) {
    var keyElement = document.createElement('div');
    
    keyElement.className = 'keyword';

    var span   = createKeywordSpan(keyword),
        button = createImportButton(importTo);

    var separator = document.createElement('div');
    separator.style.clear = 'both';

    keyElement.appendChild(span);
    keyElement.appendChild(button);
    keyElement.appendChild(separator);
    
    return keyElement;
}

function createKeywordSpan(keyword) {
    var spanElement = document.createElement('div');

    spanElement.className = 'span';
    spanElement.innerHTML = keyword;

    return spanElement;
}

function createImportButton(importTo) {
    var buttonElement = document.createElement('div');

    buttonElement.className = 'import-button';

    var callback = function() {
        buttonElement.removeEventListener('click', callback);

        migrateButton(buttonElement, buttonElement.parentElement.parentElement, importTo);
        importTo.appendChild(buttonElement.parentElement);
    };

    buttonElement.addEventListener('click', callback);

    return buttonElement;
}

function migrateButton(button, importTo, importedFrom) {
    var callback = function() {
        button.removeEventListener('click', callback);

        migrateButton(button, importedFrom, importTo);
        importTo.appendChild(button.parentElement);
    };

    button.addEventListener('click', callback);
}

function createSaveButton() {
    var buttonElement = document.createElement('div');

    buttonElement.className = 'save-button';
    buttonElement.innerHTML = 'Import selected keywords';

    buttonElement.addEventListener('mousedown', unselect, false);

    return buttonElement;
}

module.exports = {
    addStrings: function(element, list) {
        var categories = {},
            unsorted   = [];

        var imported = createCategoryElement(),
            importedHeader = createCategoryHeader('To be imported');

        imported.appendChild(importedHeader);

        list.forEach(function(bundle) {
            if(Immutable.Map.isMap(bundle)) {
                if(!categories[bundle.get('header')]) {
                    categories[bundle.get('header')] = [];
                }

                bundle.get('keys').forEach(function(key) {
                    categories[bundle.get('header')].push(key);
                });
            } else {
                unsorted.push(bundle);
            }
        });

        Object.keys(categories).forEach(function(categoryName) {
            var category = categories[categoryName],
                categoryElement = createCategoryElement(),
                categoryHeader  = createCategoryHeader(categoryName);
            
            categoryElement.appendChild(categoryHeader);

            category.forEach(function(key) {
                categoryElement.appendChild(createKeyword(key, imported));
            });

            element.appendChild(categoryElement);
        });

        var unsortedElement = createCategoryElement(),
            unsortedHeader  = createCategoryHeader('Unsorted');

        unsortedElement.appendChild(unsortedHeader);
        unsorted.forEach(function(key) {
            var keyElement = createKeyword(key, imported);
            unsortedElement.appendChild(keyElement);
        });

        element.appendChild(unsortedElement);
        element.appendChild(imported);
        element.appendChild(createSaveButton());

        return element;
    }
};
},{}],"information_tree/package.json":[function(require,module,exports){
module.exports={
    "name": "information_tree",
    "main": "./information_tree.js"
}
},{}],"input/hotkey_e.js":[function(require,module,exports){
'use strict';

var arithmetics = require('../canvas/arithmetics.js'),
    hitTest     = require('./../collisions.js').hitTest,
    linker      = require('./../linker.js'),
    createLink  = require('../structures/create_link');

module.exports = {
    keyCode: 69,
    onDown:  function(canvas, model, evt) {
        if(canvas.removeHotkeyEListeners) {
            canvas.removeHotkeyEListeners();
        }

        if(document.body !== document.activeElement) {
            return;
        }
        
        var selected = model.selected;
        if(!selected || selected.x === undefined || selected.y === undefined) {
            return;
        }

        model.nodeGui[selected.id].linking = true;

        var mouseMove = function(evt) {
            var pos = arithmetics.mouseToCanvas({x: evt.pageX, y: evt.pageY}, canvas);
            model.nodeGui[selected.id].linkerX = pos.x;
            model.nodeGui[selected.id].linkerY = pos.y;

            model.refresh = true;
            model.propagate();
        };

        var mouseUp = function() {
            canvas.removeHotkeyEListeners();
        };

        canvas.removeHotkeyEListeners = function() {
            canvas.removeEventListener('mousemove', mouseMove);
            canvas.removeEventListener('mouseup',   mouseUp);

            delete canvas.removeHotkeyEListeners;
        };

        canvas.addEventListener('mousemove', mouseMove);
        canvas.addEventListener('mouseup',   mouseUp);
    },

    onUp: function(canvas, model, evt) {

    }
};
},{"../canvas/arithmetics.js":"canvas/arithmetics.js","../structures/create_link":"structures/create_link.js","./../collisions.js":"collisions.js","./../linker.js":"linker.js"}],"input/hotkey_esc.js":[function(require,module,exports){
'use strict';

var arithmetics = require('../canvas/arithmetics.js'),
    hitTest     = require('./../collisions.js').hitTest,
    linker      = require('./../linker.js'),
    createLink  = require('../structures/create_link');

module.exports = {
    keyCode: 27,
    onDown:  function(canvas, model) {
        var selected = model.selected;
        if(!selected || selected.x === undefined || selected.y === undefined) {
            return;
        }

        if(!model.nodeGui[selected.id].linking) {
            return;
        }

        var node = model.nodeGui[selected.id];
        delete node.linkerX;
        delete node.linkerY;
        delete node.linking;

        document.body.removeHotkeyEListeners();

        model.refresh = true;
        model.propagate();
    },

    onUp: function(canvas, model) {

    }
};

},{"../canvas/arithmetics.js":"canvas/arithmetics.js","../structures/create_link":"structures/create_link.js","./../collisions.js":"collisions.js","./../linker.js":"linker.js"}],"input/mleft_down.js":[function(require,module,exports){
'use strict';

var mouseDownWare = require('./../mouse_handling/handle_down.js'),
    objectHelper  = require('./../object-helper.js');

function mouseDown(canvas, loadedModel, pos) {
    var _data = {
        env:       loadedModel.environment,
        pos:       pos,
        nodeGui:   loadedModel.nodeGui,
        links:     loadedModel.links,
        linegraph: loadedModel.settings.linegraph
    };

    document.activeElement.blur();

    var data = mouseDownWare(_data);

    objectHelper.forEach.call(
        data.nodeGui,
        function(node, id) {
            objectHelper.forEach.call(
                node,
                function(val, key) {
                    loadedModel.nodeGui[id][key] = val;
                }
            );
        }
    );

    objectHelper.forEach.call(
        data.links,
        function(link, id) {
            objectHelper.forEach.call(
                link,
                function(val, key) {
                    loadedModel.links[id][key] = val;
                }
            );
        }
    );

    loadedModel.refresh = true;

    return true;
}

module.exports = mouseDown;
},{"./../mouse_handling/handle_down.js":"mouse_handling/handle_down.js","./../object-helper.js":"object-helper.js"}],"input/mleft_drag.js":[function(require,module,exports){
'use strict';

var down = require('./mleft_down.js'),
    move = require('./mleft_move.js'),
    up   = require('./mleft_up.js');

module.exports = {
    button:    0,
    mouseDown: down,
    mouseMove: move,
    mouseUp:   up
};
},{"./mleft_down.js":"input/mleft_down.js","./mleft_move.js":"input/mleft_move.js","./mleft_up.js":"input/mleft_up.js"}],"input/mleft_move.js":[function(require,module,exports){
'use strict';

var mouseMoveWare = require('./../mouse_handling/handle_drag.js'),
    objectHelper  = require('./../object-helper.js');

function mouseMove(canvas, loadedModel, pos, deltaPos) {
    var _data = {
        pos:      pos,
        deltaPos: deltaPos,
        settings: loadedModel.settings,
        nodeGui:  loadedModel.nodeGui,
        links:    loadedModel.links
    };

    var data = mouseMoveWare(_data);

    objectHelper.forEach.call(
        data.nodeGui,
        function(node, id) {
            objectHelper.forEach.call(
                node,
                function(val, key) {
                    loadedModel.nodeGui[id][key] = val;
                }
            );
        }
    );

    objectHelper.forEach.call(
        data.links,
        function(link, id) {
            objectHelper.forEach.call(
                link,
                function(val, key) {
                    loadedModel.links[id][key] = val;
                }
            );
        }
    );

    loadedModel.refresh = true;

    //loadedModel.nodeGui  = loadedModel.nodeGui.merge(data.nodeGui);
    //loadedModel.links    = loadedModel.links.merge(data.links);
    
    loadedModel.settings.offsetX = data.settings.offsetX;
    loadedModel.settings.offsetY = data.settings.offsetY;
    //loadedModel.settings = loadedModel.settings.merge(data.settings);

    //refresh();
}

module.exports = mouseMove;
},{"./../mouse_handling/handle_drag.js":"mouse_handling/handle_drag.js","./../object-helper.js":"object-helper.js"}],"input/mleft_up.js":[function(require,module,exports){
'use strict';

var mouseUpWare  = require('./../mouse_handling/handle_up.js');
var objectHelper = require('./../object-helper.js');

function mouseUp(canvas, loadedModel, pos) {
    var _data = {
        pos:         pos,
        loadedModel: loadedModel,
        nodeData:    loadedModel.nodeData,
        nodeGui:     loadedModel.nodeGui,
        links:       loadedModel.links,
        didDrag:     loadedModel.didDrag,
        selected:    loadedModel.selected,
        linegraph:   loadedModel.settings.linegraph
    };

    var data = mouseUpWare(_data);

    objectHelper.forEach.call(
        data.nodeGui,
        function(node, id) {
            objectHelper.forEach.call(
                node,
                function(val, key) {
                    loadedModel.nodeGui[id][key] = val;
                }
            );
        }
    );

    objectHelper.forEach.call(
        data.links,
        function(link, id) {
            objectHelper.forEach.call(
                link,
                function(val, key) {
                    loadedModel.links[id][key] = val;
                }
            );
        }
    );

    //loadedModel.nodeGui = newState;
    //loadedModel.links   = loadedModel.links.merge(data.links);
    //loadedModel.nextId  = data.nextId;

    if(loadedModel.selected !== data.selected) {
        loadedModel.selected = data.selected;
    }

    loadedModel.refresh = true;
    if(data.resetUI) {
        loadedModel.resetUI = true;
    }

    canvas.panX = -loadedModel.settings.offsetX;
    canvas.panY = -loadedModel.settings.offsetY;

    //refresh();
}

module.exports = mouseUp;
},{"./../mouse_handling/handle_up.js":"mouse_handling/handle_up.js","./../object-helper.js":"object-helper.js"}],"input/mright_drag.js":[function(require,module,exports){
'use strict';

var arithmetics  = require('../canvas/arithmetics.js'),
    hitTest      = require('./../collisions.js').hitTest,
    generateLink = require('./../util/generate_link.js');

var objectHelper = require('./../object-helper.js');

function down(canvas, loadedModel, pos) {
    var nodeGui = loadedModel.nodeGui;
    var collidedNodes = objectHelper.filter.call(nodeGui, function(node) {
        return hitTest(node, pos);
    });

    collidedNodes = collidedNodes.slice(-1);
    objectHelper.forEach.call(collidedNodes, function(node) {
        node.offsetX = pos.x - (node.x || 0);
        node.offsetY = pos.y - (node.y || 0);

        node.linking = true;
    });

    if(Object.keys(collidedNodes).length === 0) {
        return false;
    }

    return true;
}

function move(canvas, loadedModel, pos, deltaPos) {
    var nodeGui      = loadedModel.nodeGui;
    var linkingNodes = objectHelper.filter.call(nodeGui, function(node) {
        return node.linking;
    });

    objectHelper.forEach.call(linkingNodes, function(node) {
        node.linkerX = pos.x;
        node.linkerY = pos.y;
    });

    loadedModel.refresh = true;
    /*model.propagate();*/
}

function up(canvas, loadedModel, pos) {
    generateLink(loadedModel);

    var nodeGui      = loadedModel.nodeGui;
    var linkingNodes = objectHelper.filter.call(nodeGui, function(node) {
        return node.linking;
    });

    objectHelper.forEach.call(linkingNodes, function(node) {
        node.linking = false;
        node.linkerX = 0;
        node.linkerY = 0;
    });

    loadedModel.refresh = true;
}

module.exports = {
    button:    2,
    mouseDown: down,
    mouseMove: move,
    mouseUp:   up
};
},{"../canvas/arithmetics.js":"canvas/arithmetics.js","./../collisions.js":"collisions.js","./../object-helper.js":"object-helper.js","./../util/generate_link.js":"util/generate_link.js"}],"linker.js":[function(require,module,exports){
'use strict';

var linker = function(node) {
	return {
		x: (node.linkerX || node.x + node.radius * 0.9),
		y: (node.linkerY || node.y + node.radius * 0.9),
		radius: node.radius / 10
	};
};

module.exports = linker;
},{}],"main.js":[function(require,module,exports){
'use strict';

function isElement(element) {
    try {
        return element instanceof HTMLElement;
    } catch(e) {
        return    (typeof element           === 'object')
               && (obj.nodeType             === 1)
               && (typeof obj.style         === 'object')
               && (typeof obj.ownerDocument === 'object');
    }
}

function inflateModel(container) {
    if(!isElement(container)) {
        throw new Error('Not an element given to inflateModel');
    }

    container.className = 'mb-container';

    var curry       = require('./curry.js'),
        strictCurry = require('./strict_curry.js'),
        Immutable   = null,
        canvas      = require('./canvas'),
        linker      = require('./linker.js'),
        generateId  = require('./generate_id.js');

    var maxWidth  = container.offsetWidth,
        maxHeight = container.offsetHeight;

    var protocol   = container.getAttribute('data-protocol') || 'http',
        hostname   = container.getAttribute('data-hostname') || 'localhost',
        port       = container.getAttribute('data-port'),
        portString = '';

    if(port !== null) {
        if(protocol === 'http' && port !== '80') {
            portString = ':' + port;
        } else if(protocol === 'https' && port !== '443') {
            portString = ':' + port;
        }
    }

    var configObject = {
        protocol: protocol,
        hostname: hostname,
        port:     parseInt(port),
        url:      protocol + '://' + hostname + portString
    };

    var CONFIG = require('./config');
    CONFIG.setConfig(configObject);

    //require('./object.js');
    var objectHelper = require('./object-helper.js');

    var menuHeader       = document.createElement('div'),
        upperMenu        = document.createElement('div');

    menuHeader.className = 'menu-header';
    upperMenu.className  = 'mb-upper-menu';

    menuHeader.appendChild(upperMenu);

    var sidebar          = document.createElement('div'),
        sidebarContainer = document.createElement('div');

    sidebar.className           = 'mb-sidebar';
    sidebarContainer.className  = 'sidebar-container';

    sidebar.style['max-width']  = (maxWidth  - 24) + 'px';
    sidebar.style['max-height'] = (maxHeight - 44) + 'px';

    sidebar.appendChild(sidebarContainer);

    var leftMain           = document.createElement('div'),
        notificationBarDiv = document.createElement('div'),
        mainCanvasC        = document.createElement('canvas'),
        linegraphCanvasC   = document.createElement('canvas');

    notificationBarDiv.style.left = (maxWidth - 200) + 'px';

    leftMain.className            = 'left main';
    notificationBarDiv.className  = 'mb-notification-bar';
    mainCanvasC.className         = 'main-canvas';
    linegraphCanvasC.className    = 'linegraph';

    leftMain.appendChild(notificationBarDiv);
    leftMain.appendChild(mainCanvasC);
    leftMain.appendChild(linegraphCanvasC);

    container.appendChild(menuHeader);
    container.appendChild(sidebar);
    container.appendChild(leftMain);

    var mainCanvas       = canvas(mainCanvasC,      refresh),
        linegraphCanvas  = canvas(linegraphCanvasC, refresh);

    /*var mainCanvas       = canvas(document.getElementById('canvas'),    refresh);
    var linegraphCanvas  = canvas(document.getElementById('linegraph'), refresh);*/

    var colorValues      = require('./graphics/value_colors.js'),
        modelLayer       = require('./model_layer.js'),
        menuBuilder      = require('./menu_builder'),
        notificationBar  = require('./notification_bar'),
        network          = require('./network'),
        informationTree  = require('./information_tree'),
        UI               = require('./ui');

    notificationBar.setContainer(notificationBarDiv);

    var selectedMenu  = {},
        textStrings   = {
            unsorted: [],
            saved:    []
        },
        loadedModel   = modelLayer.newModel(),
        savedModels   = {
            local:  {},
            synced: {}
        };

    window.sense4us.loadedModel       = loadedModel;
    savedModels.local[loadedModel.id] = loadedModel;

    var settings      = require('./settings');

    window.Immutable  = Immutable;
    window.collisions = require('./collisions.js');

    var context       = mainCanvas.getContext('2d');

    var mouseHandler  = require('./mechanics/mouse_handler.js');
    var mleftDrag     = require('./input/mleft_drag.js'),
        mrightDrag    = require('./input/mright_drag.js');

    mouseHandler(mainCanvas, loadedModel, [mleftDrag, mrightDrag]);

    var keyboardHandler = require('./mechanics/keyboard_handler.js'),
        hotkeyE         = require('./input/hotkey_e.js'),
        hotkeyESC       = require('./input/hotkey_esc.js');

    keyboardHandler(document.body, mainCanvas, loadedModel, [hotkeyE, hotkeyESC]);

    //mainCanvas.addEventListener('mousewheel',MouseWheelHandler, false);
    //mainCanvas.addEventListener('DOMMouseScroll', MouseWheelHandler, false);

    var zoom = 1;
    function MouseWheelHandler(e) {
        var mouse_canvas_x = e.x - mainCanvas.offsetLeft;
        var mouse_canvas_y = e.y - mainCanvas.offsetTop;
        var scaleX = loadedModel.settings.scaleX || 1;
        var scaleY = loadedModel.settings.scaleX || 1;
        var mouse_stage_x = mouse_canvas_x / scaleX - (loadedModel.settings.offsetX || 0) / scaleX;
        var mouse_stage_y = mouse_canvas_y / scaleY - (loadedModel.settings.offsetY || 0) / scaleY;

        if (Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail))) > 0) {
            zoom = 1.05;
        } else {
            zoom = 1/1.05;
        }
        
        scaleX = scaleY *= zoom;

        var mouse_stage_new_x = mouse_canvas_x / scaleX - (loadedModel.settings.offsetX || 0) / scaleX;
        var mouse_stage_new_y = mouse_canvas_y / scaleY - (loadedModel.settings.offsetY || 0) / scaleY;

        var zoom_effect_x = (mouse_stage_new_x - mouse_stage_x) * scaleX;
        var zoom_effect_y = (mouse_stage_new_y - mouse_stage_y) * scaleY;
        
        loadedModel.settings.offsetX = ((loadedModel.settings.offsetX || 0) + zoom_effect_x);
        loadedModel.settings.offsetY = ((loadedModel.settings.offsetY || 0) + zoom_effect_y);

        loadedModel.settings.scaleX = scaleX;
        loadedModel.settings.scaleY = scaleY;
        
        //refresh();
    }

    var aggregatedLink = require('./aggregated_link.js');
    var refreshNamespace = require('./refresh');

    var asyncMiddleware = require('./async_middleware');

    var lastShow;
    function showLineGraph(ctx, canvas, loadedModel, selectedMenu, next) {
        var show = loadedModel.settings.linegraph;
        var parent = linegraphCanvas.parentElement;
        if(show === lastShow) {
            return next();
        }

        if(show) {
            mainCanvas.height      = Math.ceil(((parent.offsetHeight-20) * 0.5));
            linegraphCanvas.height = Math.floor(((parent.offsetHeight-20) * 0.5));

            linegraphRefresh();
        } else {
            mainCanvas.height      = parent.offsetHeight;
            linegraphCanvas.height = 0;
        }

        lastShow = show;

        next();
    }

    var ctx = mainCanvas.getContext('2d');
    var refreshParams = asyncMiddleware(ctx, mainCanvas, loadedModel, selectedMenu);
    var _refresh = refreshParams(
        showLineGraph,
        refreshNamespace.clearCanvasAndTransform,
        refreshNamespace.drawNodes,
        refreshNamespace.drawLinks,
        refreshNamespace.drawNodeDescriptions,
        refreshNamespace._drawLinker,
        refreshNamespace.drawLinkingLine
    );

    loadedModel.addListener('nodeGui',  refresh);
    loadedModel.addListener('nodeData', refresh);
    loadedModel.addListener('settings', refresh);
    loadedModel.addListener('refresh',  refresh);

    refresh();

    //var sidebarManager = new UI.SidebarManager(CONFIG.get('SIDEBAR_CONTAINER'));
    var sidebarManager = new UI.SidebarManager(sidebarContainer);

    loadedModel.addListener('sidebar', function() {
        sidebarManager.addSidebar(loadedModel.sidebar, loadedModel);
    });

    loadedModel.propagate();

    sidebarManager.setEnvironment(loadedModel.environment);
    sidebarManager.setLoadedModel(loadedModel);
    sidebarManager.setSelectedMenu(loadedModel.settings);

    loadedModel.addListener('selected', function() {
        sidebarManager.setEnvironment(loadedModel.environment);
        sidebarManager.setLoadedModel(loadedModel);

        if(this.selected.x !== undefined && this.selected.y !== undefined) {
            var nodeData = loadedModel.nodeData[this.selected.id];
            var nodeGui  = loadedModel.nodeGui[this.selected.id];

            sidebarManager.setSelectedMenu(nodeData, nodeGui);
        } else if(this.selected.coefficient !== undefined) {
            sidebarManager.setSelectedMenu(this.selected);
        } else {
            sidebarManager.setSelectedMenu(loadedModel.settings);
        }
    });

    var menu = new UI.Menu(upperMenu, settings.menu);
    menu.createMenu(loadedModel, savedModels);

    loadedModel.addListener('resetUI', function() {
        sidebarManager.setEnvironment(loadedModel.environment);
        sidebarManager.addSidebar(loadedModel.sidebar, loadedModel);
        menu.resetMenu(loadedModel, savedModels);

        loadedModel.floatingWindows.forEach(function(floatingWindow) {
            floatingWindow.refresh();
        });

        if(this.selected && this.selected.x !== undefined && this.selected.y !== undefined) {
            var nodeData = loadedModel.nodeData[this.selected.id];
            var nodeGui  = loadedModel.nodeGui[this.selected.id];

            sidebarManager.setSelectedMenu(nodeData, nodeGui);
        } else if(this.selected && this.selected.coefficient !== undefined) {
            sidebarManager.setSelectedMenu(this.selected);
        } else {
            sidebarManager.setSelectedMenu(loadedModel.settings);
        }
    });

    loadedModel.addListener('settings', function() {
        if(loadedModel.settings.linegraph) {
            linegraphRefresh();
        }
    });

    var drawLineGraph = require('./graphics/draw_line_graph.js');
    function _linegraphRefresh() {
        var lctx = linegraphCanvas.getContext('2d');
        lctx.clearRect(
            0,
            0,
            linegraphCanvas.width,
            linegraphCanvas.height
        );

        var selectedNodes = objectHelper.filter.call(
            loadedModel.nodeGui,
            function(node) {
                return node.linegraph;
            }
        );

        var nodeData = loadedModel.nodeData;
        var lineValues = objectHelper.map.call(
            selectedNodes,
            function(nodegui) {
                var node = nodeData[nodegui.id];
                return {
                    name:   node.name,
                    values: node.simulateChange,
                    color:  nodegui.graphColor
                }
            }
        );

        drawLineGraph(lctx, 20, 20, linegraphCanvas.width - 40, linegraphCanvas.height - 30, lineValues);
    }

    function refresh() {
        window.requestAnimationFrame(_refresh);
    }

    function linegraphRefresh() {
        window.requestAnimationFrame(_linegraphRefresh);
    }

    linegraphRefresh();
}

window.sense4us              = window.sense4us || {};
window.sense4us.inflateModel = inflateModel;

},{"./aggregated_link.js":"aggregated_link.js","./async_middleware":"async_middleware.js","./canvas":"canvas/canvas.js","./collisions.js":"collisions.js","./config":"config.js","./curry.js":"curry.js","./generate_id.js":"generate_id.js","./graphics/draw_line_graph.js":"graphics/draw_line_graph.js","./graphics/value_colors.js":"graphics/value_colors.js","./information_tree":"information_tree/information_tree.js","./input/hotkey_e.js":"input/hotkey_e.js","./input/hotkey_esc.js":"input/hotkey_esc.js","./input/mleft_drag.js":"input/mleft_drag.js","./input/mright_drag.js":"input/mright_drag.js","./linker.js":"linker.js","./mechanics/keyboard_handler.js":"mechanics/keyboard_handler.js","./mechanics/mouse_handler.js":"mechanics/mouse_handler.js","./menu_builder":"menu_builder/menu_builder.js","./model_layer.js":"model_layer.js","./network":"network/network.js","./notification_bar":"notification_bar/notification_bar.js","./object-helper.js":"object-helper.js","./refresh":"refresh.js","./settings":"settings/settings.js","./strict_curry.js":"strict_curry.js","./ui":"ui/ui.js"}],"mechanics/drag_handler.js":[function(require,module,exports){
'use strict';

var arithmetics = require('../canvas/arithmetics.js');

module.exports = function(canvas, loadedModel, startCallback, updateCallback, endCallback, missCallback) {
	var active = false;

	var startPos = {x: 0, y: 0},
		endPos   = {x: 0, y: 0},
		lastPos  = {x: 0, y: 0};

	var deltaPos = {x: 0, y: 0};

	var stopContextMenu = function(evt) {
		evt.preventDefault();
		evt.stopPropagation();
		return false;
	};

	canvas.addEventListener('contextmenu', stopContextMenu);

	var mouseDown = function(event) {
		active = true;

		startPos = arithmetics.mouseToCanvas({x: event.clientX, y: event.clientY}, canvas);
		lastPos = {x: startPos.x, y: startPos.y};

		loadedModel.didDrag = false;

		var result = startCallback(canvas, loadedModel, startPos);
		loadedModel.propagate();

		if (result) {
			if (updateCallback) {
				window.addEventListener('mousemove', mouseMove);
			}

			if (endCallback) {
				window.addEventListener('mouseup', mouseUp);
			}
		} else if (missCallback) {
			missCallback(canvas, loadedModel, startPos);
		}
	};

	canvas.addEventListener('mousedown', mouseDown);

	var mouseMove = function(event) {
		active = true;

		endPos = arithmetics.mouseToCanvas({x: event.clientX, y: event.clientY}, canvas);

		deltaPos.x = lastPos.x - endPos.x;
		deltaPos.y = lastPos.y - endPos.y;

		startPos.x = endPos.x;
		startPos.y = endPos.y;

		loadedModel.didDrag = true;

		updateCallback(canvas, loadedModel, endPos, deltaPos);
		loadedModel.propagate();
		
		lastPos = {x: endPos.x, y: endPos.y};
	};

	var mouseUp = function(event) {
		active = false;

		endPos = arithmetics.mouseToCanvas({x: event.clientX, y: event.clientY}, canvas);

		window.removeEventListener('mousemove', mouseMove);
		window.removeEventListener('mouseup', mouseUp);

		endCallback(canvas, loadedModel, endPos);
		loadedModel.propagate();
	};
};
},{"../canvas/arithmetics.js":"canvas/arithmetics.js"}],"mechanics/keyboard_handler.js":[function(require,module,exports){
'use strict';

module.exports = function(container, canvas, loadedModel, hotkeys) {
    var lookupTable = {};
    hotkeys.forEach(function(hotkey) {
        if(!lookupTable[hotkey.keyCode]) {
            lookupTable[hotkey.keyCode] = [];
        }

        lookupTable[hotkey.keyCode].push(hotkey);
    });

    container.addEventListener('keydown', function(evt) {
        if(!lookupTable[evt.keyCode]) {
            return true;
        }

        lookupTable[evt.keyCode].forEach(function(hotkey) {
            if(!hotkey.onDown || typeof hotkey.onDown !== 'function') {
                return;
            }

            hotkey.onDown(canvas, loadedModel, evt);
        });

        //evt.preventDefault();
        //return false;
    });

    container.addEventListener('keyup', function(evt) {
        if(!lookupTable[evt.keyCode]) {
            return true;
        }

        lookupTable[evt.keyCode].forEach(function(hotkey) {
            if(!hotkey.onUp || typeof hotkey.onUp !== 'function') {
                return;
            }

            hotkey.onUp(canvas, loadedModel, evt);
        });

        //evt.preventDefault();
        //return false;
    });
};
},{}],"mechanics/mouse_handler.js":[function(require,module,exports){
'use strict';

var arithmetics = require('../canvas/arithmetics.js');

module.exports = function(canvas, loadedModel, inputs) {
    var active = false;

    var startPos = {x: 0, y: 0},
        endPos   = {x: 0, y: 0},
        lastPos  = {x: 0, y: 0};

    var deltaPos = {x: 0, y: 0};

    var stopContextMenu = function(evt) {
        evt.preventDefault();
        evt.stopPropagation();
        return false;
    };

    canvas.addEventListener('contextmenu', stopContextMenu);
    var mouseDown = function(event) {
        var button = event.button;
        var middlewares = inputs.filter(function(input) {
            return input.button === button;
        });

        active = true;

        startPos = arithmetics.mouseToCanvas({x: event.pageX, y: event.pageY}, canvas);
        lastPos  = {x: startPos.x, y: startPos.y};

        loadedModel.didDrag = false;

        middlewares.forEach(function(middleware) {
            var startCallback  = middleware.mouseDown,
                updateCallback = middleware.mouseMove,
                endCallback    = middleware.mouseUp,
                missCallback   = middleware.miss;

            var result = startCallback(canvas, loadedModel, startPos);
            if (result) {
                if (updateCallback) {
                    window.addEventListener('mousemove', mouseMove);
                }

                if (endCallback) {
                    window.addEventListener('mouseup', mouseUp);
                }
            } else if (missCallback) {
                missCallback(canvas, loadedModel, startPos);
            }
        });

        loadedModel.propagate();
    };

    canvas.addEventListener('mousedown', mouseDown);

    var mouseMove = function(event) {
        var button = event.button;
        var middlewares = inputs.filter(function(input) {
            return input.button === button;
        });

        active = true;

        endPos = arithmetics.mouseToCanvas({x: event.pageX, y: event.pageY}, canvas);

        deltaPos.x = lastPos.x - endPos.x;
        deltaPos.y = lastPos.y - endPos.y;

        startPos.x = endPos.x;
        startPos.y = endPos.y;

        loadedModel.didDrag = true;

        middlewares.forEach(function(middleware) {
            middleware.mouseMove(canvas, loadedModel, endPos, deltaPos);
        });

        loadedModel.propagate();
        
        lastPos = {x: endPos.x, y: endPos.y};
    };

    var mouseUp = function(event) {
        var button = event.button;
        var middlewares = inputs.filter(function(input) {
            return input.button === button;
        });

        active = false;

        endPos = arithmetics.mouseToCanvas({x: event.pageX, y: event.pageY}, canvas);

        window.removeEventListener('mousemove', mouseMove);
        window.removeEventListener('mouseup', mouseUp);

        middlewares.forEach(function(middleware) {
            middleware.mouseUp(canvas, loadedModel, endPos);
        });
        
        loadedModel.propagate();
    };
};
},{"../canvas/arithmetics.js":"canvas/arithmetics.js"}],"menu_builder/dropdown.js":[function(require,module,exports){
'use strict';

function Option(parent) {
    if (!(this instanceof Option)) {
        throw new Error('Option accessed as generic method.');
    }

    this.element  = document.createElement('div');
    this.callback = null;
    this.parent   = parent;
}

Option.prototype = {
    setValue: function(value) {
        this.value = value;
        this.element.setAttribute('data-value', value);
    },

    setText: function(text) {
        this.text = text;
        this.element.innerHTML = text;
    },

    setId: function(id) {
        this.id = id;
        this.element.setAttribute('data-id', id);
    },

    setCallback: function(callback) {
        this.callback = callback;
    },

    select: function() {
        this.element.className = 'mb-dropdown-selected';
    },

    deselect: function() {
        this.element.className = '';
    }
};

function Dropdown(header, onselect, update) {
    if (!(this instanceof Dropdown)) {
        throw new Error('Dropdown accessed as generic method.');
    }

    this.element         = document.createElement('div');
    this.headerElement   = document.createElement('h4');
    this.container       = document.createElement('div');

    this.headerElement.className = 'mb-dropdown-header';
    this.container.className     = 'mb-dropdown-container';
    this.container.style.display = 'none';

    this.element.appendChild(this.headerElement);
    this.element.appendChild(this.container);

    this.element.className = 'mb-dropdown';
    var that = this;

    var mouseEnter = function() {
        that.toggle();
    };

    var click = function(e) {
        if (e.target.tagName.toLowerCase() !== 'h4') {
            var option = that.options[e.target.getAttribute('data-id')];
            option.update = function(){that.update.call(that)};
            that.onselect.call(option);
        }
    };

    var mouseLeave = function(e) {
        if(that.visible()) {
            that.toggle();
        }
    };

    this.deleteEvents = function() {
        that.element.removeEventListener('mouseenter', mouseEnter);
        that.element.removeEventListener('click',      click);
        that.element.removeEventListener('click',      mouseLeave);
    };

    this.element.addEventListener('mouseenter', mouseEnter);
    this.element.addEventListener('click',      click);
    this.element.addEventListener('mouseleave', mouseLeave);

    this.header                  = header;
    this.headerElement.innerHTML = this.header;

    this.options  = [];
    this.occupied = {};
    this.selected = false;

    this.onselect = onselect;
    this.update   = update;

    this.update();
}

Dropdown.prototype = {
    addOption: function(value, text, callback) {
        if (this.occupied[value]) {
            return;
        }

        var newOption = new Option(this);
        newOption.setValue(value);
        newOption.setText(text);

        newOption.setId(this.options.length);

        if(callback && typeof callback === 'function') {
            newOption.setCallback(callback);
        }

        this.options.push(newOption);
        this.occupied[value] = this.options.length;
    },

    resetOptions: function() {
        this.occupied = {};
        this.options  = [];
    },

    refreshList: function() {
        while(this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }

        this.options.forEach(function(option) {
            this.container.appendChild(option.element);
        }, this);
    },

    select: function(id) {
        if (id === undefined) {
            if(this.selected) {
                this.selected.deselect();
            }
            
            this.selected = this.options[this.options.length - 1];
            this.selected.select();
            //this.headerElement.innerHTML = this.selected.text;
        } else if (typeof id === 'number') {
            if(this.selected) {
                this.selected.deselect();
            }

            this.selected = this.options[id];
            this.selected.select();
            //this.headerElement.innerHTML = this.selected.text;
        }
    },

    toggle: function() {
        if (this.container.style.display === 'none') {
            this.container.style.display = 'block';
            this.container.className += ' mb-dropdown-container-animation';
        } else {
            this.container.style.display = 'none';
            this.container.className = 'mb-dropdown-container';
        }
    },

    visible: function() {
        return this.container.style.display === 'block';
    }
};


module.exports = Dropdown;
},{}],"menu_builder/menu_builder.js":[function(require,module,exports){
'use strict';

var Immutable = null,
    Dropdown  = require('./dropdown.js');

function MenuBuilder() {
    if (!(this instanceof MenuBuilder)) {
        throw new Error('Accessing MenuBuilder as a generic method.');
    }

    this.refreshable = [];
}

MenuBuilder.prototype = {
    updateAll: function() {
        this.refreshable.forEach(function(ele) {
            if (ele.update) {
                ele.update();
            }
        });
    },

    slider: function(defaultValue, min, max, callback, onSlideCallback) {
        var container = this.div('mb-sidebar-slider');

        var minSpan = this.div('value');
        minSpan.innerHTML = defaultValue;
        var maxSpan = this.div('max-value');
        maxSpan.innerHTML = max;

        var input = document.createElement('input');
        
        input.type = 'range';
        input.min = min;
        input.max = max;
        input.value = defaultValue;

        input.addEventListener('change', function(){callback(parseInt(input.value))});
        var onSlide = function(val) {
            minSpan.innerHTML = input.value;
            if(onSlideCallback) {
                onSlideCallback(parseInt(input.value));
            }
        };

        input.addEventListener('input', onSlide);

        input.deleteCallbacks = function() {
            input.removeEventListener('change', callback);
            input.removeEventListener('input',  onSlide);
        }

        container.appendChild(minSpan);
        container.appendChild(input);
        container.appendChild(maxSpan);

        return container;
    },

    div: function(className) {
        var div = document.createElement('div');
        if(className) {
            div.className = className;
        }

        return div;
    },

    button: function(text, callback) {
        var button = document.createElement('button');
        button.addEventListener('click', callback);
        button.deleteEvents = function() {
            button.removeEventListener('click', callback);
        };
        button.appendChild(document.createTextNode(text));
        
        return button;        
    },

    dropdown: function(text, callback, update) {
        var select = new Dropdown(text, callback, update);
        this.refreshable.push(select);
        return select;
    },

    select: function(name, callback) {
        var select = document.createElement('select');

        select.name = name;

        select.addEventListener('change', callback);
        select.deleteEvents = function() {
            select.removeEventListener('click', callback);
        };

        return select;
    },

    option: function(value, text) {
        var option = document.createElement('option');

        option.value     = value;
        option.innerHTML = text;

        return option;
    },
    
    addValueCallback: function(element, callback, event) {
        event = event || 'change';
        
        var cb = function(event) {callback(element.name, element.value); };
        
        element.addEventListener(event, cb);
        element.deleteEvents = function() {
            element.removeEventListener(event, cb);
        };
    },

    input: function(key, value, callback) {
        var input = document.createElement('input');
        
        MenuBuilder.prototype.addValueCallback(input, callback);

        input.setAttribute('value', value);
        input.name  = key;
        input.value = value;
      
        return input;
    },
    
    label: function(key) {
        var label = document.createElement('label');
        label.appendChild(document.createTextNode(key));
        label.htmlFor = key;
      
        return label;  
    },

    p: function() {
        var p = document.createElement('p');

        return p;
    },

    img: function() {
        var img = document.createElement('img');

        return img;
    },

    span: function(key) {
        var span = document.createElement('span');
        if(key && typeof key === 'string') {
            span.innerHTML = key;
        }

        return span;
    },

    menu: function(text, callback) {
        var button = document.createElement('input');
        button.setAttribute('type', 'button');
        button.setAttribute('value', text);
        button.addEventListener('click', callback);
        button.deleteEvents = function() {
            button.removeEventListener('click', callback);
        };
        button.className = 'button';
        
        return button;
    },

    h2: function(text) {
        var e = document.createElement('h2');
        e.innerHTML = text;

        return e;
    }
};

module.exports = new MenuBuilder();

},{"./dropdown.js":"menu_builder/dropdown.js"}],"menu_builder/package.json":[function(require,module,exports){
module.exports={
    "name": "s4u_menu_builder",
    "main": "./menu_builder.js"
}
},{}],"middleware.js":[function(require,module,exports){
'use strict';

var middleware = function(callbacks, error, done) {
	if (error === undefined) {
		error = function(message) {
			throw new Error(message);
		};
	}

	done = function(data) {
		data.done = true;

		return data;
	};

	var next = function(data) {
		var result = this.call(this, data, error, done);

		var pos = callbacks.indexOf(this);

		if (pos === -1 && data.done !== true) {
			throw new Error('something pooped');
		}

		if (pos + 1 === callbacks.length || data.done === true) {
			return data;
		}

		return next.call(callbacks[pos + 1], result);
	};

	return function(data) {
		if (callbacks === null || callbacks.length === 0) {
			throw new Error('callbacks is not containing anything');
		}

		return next.call(callbacks[0], data);
	};
};

module.exports = middleware;
},{}],"mode_layer.js":[function(require,module,exports){
'use strict';

function ModeLayer() {
    if(!(this instanceof ModeLayer)) {
        throw new Error('Accessing ModeLayer as a generic method.');
    }

    this.currentMode = false;
    this.modes = {};

    this.refresh;
}

ModeLayer.prototype = {
    addMode: function(name, callback) {
        if(this.modes[name]) {
            throw new Error('Mode already exists');
        }

        if(!callback || typeof callback !== 'function') {
            throw new Error('Callback invalid.');
        }

        this.modes[name] = callback;
    },

    setMode: function(name) {
        if(this.modes[name]) {
            throw new Error('Mode does not exist. Can\'t set ' + name);
        }

        this.currentMode = this.modes[name];

        if(this.refresh) {
            this.refresh();
        }
    },

    iterateModes: function(callback) {
        var that = this;
        Object.keys(this.modes).forEach(function(key) {
            callback(key, that.modes[key]);
        });
    }
};

module.exports = new ModeLayer();
},{}],"model_layer.js":[function(require,module,exports){
'use strict';

/*
** Dependencies
*/
var backendApi      = require('./api/backend_api.js'),
    Immutable       = null,
    breakout        = require('./breakout.js'),
    notificationBar = require('./notification_bar'),
    Scenario        = require('./scenario').Scenario,
    TimeTable       = require('./scenario').TimeTable,
    menuBuilder     = require('./menu_builder');

var objectHelper    = require('./object-helper');
    
var settings = require('./settings');

/*
** Used to generate a local and incremential ID to avoid collisions for models.
*/
var generateId = -1;

function definePropagations(obj, keys) {
    keys.forEach(function(key) {
        Object.defineProperty(obj, key, {get: function() {
            return this['_'+key];
        }, set: function(newValue) {
            this.changed[key] = true;
            /*if(key === 'scenarios') {
                console.log('Setting: ['+key+']: ' + newValue);
                console.log(new Error().stack);
            }*/
            
            this['_'+key]     = newValue;
        }});
    });
}

function Model(id, data) {
    this.changed     = {};
    this.timestamps  = {};

    this.id          = id;
    this.syncId      = false;
    this.saved       = false;
    this.synced      = false;
    this.syncId      = null;

    this.nextId      = -1;
    this.nodeData    = {};
    this.nodeGui     = {};
    this.links       = {};

    this.selected        = false;
    this.environment     = 'modelling';
    this.sidebar         = settings.sidebar;
    this.floatingWindows = [];
    this.refresh         = false;
    this.resetUI         = false;

    this.settings = {
        name:          'New Model',
        //maxIterations: 4,
        offsetX:       0,
        offsetY:       0,
        zoom:          1,
        linegraph:     false

        //timeStepT:     'Week',
        //timeStepN:     0
    };

    this.scenarios      = {};
    var __ = new Scenario(this);
    this.scenarios[__.id] = __;
    this.loadedScenario = __;

    if(data) {
        Object.keys(data).forEach(function(key) {
            this[key] = data[key];
        }, this);
    }
}

Model.prototype = {
    listeners:   {},
    generateId: function() {
        this.nextId++;

        return this.nextId;
    },

    addListener: function(key, listener) {
        if(!Model.prototype.listeners[key]) {
            Model.prototype.listeners[key] = [];
        }

        if(Model.prototype.listeners[key].indexOf(listener) !== -1) {
            return;
        }

        Model.prototype.listeners[key].push(listener);
    },

    removeListener: function(key, listener) {
        if(!Model.prototype.listeners[key]) {
            return;
        }

        Model.prototype.listeners[key] = Model.prototype.listeners[key].filter(function(value){return value !== listener;});
    },

    removeListeners: function(key) {
        Model.prototype.listeners[key] = [];
    },

    propagate: function() {
        var validListeners = [];
        Object.keys(this.changed).forEach(function(key) {
            var property = this[key];
            if(!property) {
                return;
            }

            var _l = Model.prototype.listeners[key];
            if(!_l || _l.length === 0) {
                return;
            }

            _l.forEach(function(listener) {
                if(validListeners.indexOf(listener) !== -1) {
                    return;
                }

                validListeners.push(listener);
            });
        }, this);

        this.changed = {};
        validListeners.forEach(function(listener) {
            listener.call(this);
        }, this);
    },

    scenariosToJson: function() {
        var scenarios = [];
        Object.keys(this.scenarios).forEach(function(key) {
            var scenario = this.scenarios[key];
            scenarios.push(scenario.toJson(this));
        }, this);

        return scenarios;
    }
};

definePropagations(Model.prototype, [
    'id',
    'environment',
    'sidebar',
    'refresh',
    'floatingWindows',
    'resetUI',
    'saved',
    'synced',
    'syncId',
    'nextId',
    'selected',
    'nodeData',
    'nodeGui',
    'links',
    'settings',
    'treeSettings',
    'loadedScenario',
    'scenarios'
]);

module.exports = {
    newModel: function(data) {
        generateId++;
        return new Model(generateId, data);
    },

    moveModel: function(model) {
        var newModel = this.newModel();

        newModel.id              = model.id;
        newModel.environment     = model.environment;
        newModel.sidebar         = model.sidebar;
        newModel.refresh         = false;
        newModel.resetUI         = false;
        newModel.floatingWindows = model.floatingWindows;
        newModel.saved           = model.saved;
        newModel.synced          = model.synced;
        newModel.syncId          = model.syncId;
        newModel.nextId          = model.nextId;
        newModel.selected        = null;
        newModel.nodeData        = model.nodeData;
        newModel.nodeGui         = model.nodeGui;
        newModel.links           = model.links;
        newModel.settings        = model.settings;
        newModel.treeSettings    = model.treeSettings;
        newModel.loadedScenario  = model.loadedScenario;
        newModel.scenarios       = model.scenarios;

        model.floatingWindows.forEach(function(floatingWindow) {
            floatingWindow.destroyWindow();

            if(floatingWindow.hide) {
                floatingWindow.hide();
            }
        });

        model.floatingWindows = [];
        model.nodeData        = {};
        model.nodeGui         = {};
        model.links           = {};
        model.treeSettings    = {};
        var _                 = new Scenario(model);
        model.scenarios       = {};
        model.scenarios[_.id] = _;
        model.loadedScenario  = _;
        model.settings        = {};

        return newModel;
    },

    saveModel: function(loadedModel, onDone) {
        var data = {
            modelId:   loadedModel.settings.syncId,
            settings:  loadedModel.settings,
            nodes:     breakout.nodes(loadedModel),
            links:     breakout.links(loadedModel),
            scenarios: loadedModel.scenariosToJson()
        };

        backendApi('/models/save', data, function(response, err) {
            if (err) {
                console.error(response);
                console.error(err);
                //notificationBar.notify('Couldn't save model: ' + (response.errors || 'null'));
                return;
            }

            try {

            loadedModel.synced         = true;
            loadedModel.syncId         = response.response.model.id;
            loadedModel.settings.saved = true;

            var nodes      = response.response.nodes;
            var links      = response.response.links;
            var scenarios  = response.response.scenarios;
            var timetables = response.response.timetables;
            var timesteps  = response.response.timesteps;

            var nodeLookup = {};
            nodes.forEach(function(node) {
                loadedModel.nodeData[node.id].syncId = node.syncId;
                loadedModel.nodeGui[node.id].syncId  = node.syncId;

                nodeLookup[node.syncId] = loadedModel.nodeData[node.id];
            });

            links.forEach(function(link) {
                loadedModel.links[link.id].syncId = link.syncId;
            });

            var scenarioLookup = {};
            scenarios.forEach(function(scenario) {
                loadedModel.scenarios[scenario.id].syncId = scenario.syncId;
                scenarioLookup[scenario.syncId] = loadedModel.scenarios[scenario.id];
            });

            var timetableLookup = {};
            timetables.forEach(function(timetable) {
                scenarioLookup[timetable.scenario].data[nodeLookup[timetable.node].id].syncId = timetable.syncId;
                timetableLookup[timetable.syncId] = scenarioLookup[timetable.scenario].data[nodeLookup[timetable.node]];
            });

            /*timesteps.forEach(function(timestep) {
                timetableLookup[timestep.timetable]
            });*/



            /*loadedModel = loadedModel.set('syncId',   response.response.id);
            loadedModel = loadedModel.set('settings', loadedModel.settings.set('saved', true));
            _loadedModel(loadedModel);*/

            if(response.response.message) {
                notificationBar.notify(response.response.message);
            } else {
                notificationBar.notify('Model['+loadedModel.settings.name+'] saved.');
            }

            } catch(e) {
                console.error(e);
                throw e;
            }

            onDone();
        });
    },

    deleteModel: function(loadedModel, savedModels, callback) {
        var that = this;
        var modelId = loadedModel.syncId;
        if(loadedModel.syncId !== null && loadedModel.syncId !== undefined) {
            backendApi('/models/' + loadedModel.syncId, {}, function(response, err) {
                if(err) {
                    console.error(response);
                    console.error(err);
                    return;
                }

                delete savedModels.local[loadedModel.id];
                delete savedModels.synced[loadedModel.syncId];
                var firstLocal = objectHelper.first.call(savedModels.local);

                if(firstLocal === undefined) {
                    firstLocal = that.newModel();
                }

                objectHelper.forEach.call(
                    firstLocal,
                    function(value, key) {
                        loadedModel[key] = value;
                    }
                );

                notificationBar.notify(response.response.message);
                callback();
            }, 'DELETE');
        } else {
            delete savedModels.local[loadedModel.id];
            var newModel = this.newModel();
            objectHelper.forEach.call(
                newModel,
                function(value, key) {
                    loadedModel[key] = value;
                }
            );

            callback();
        }
    },
    
    loadSyncModel: function(modelId, callback) {
        var that = this;
        backendApi('/models/bundle/' + modelId, function(response, error) {
            if (error) {
                console.error(response);
                console.error(error);
                return;
            }

            var settings   = response.response.model,
                nodes      = response.response.nodes,
                links      = response.response.links,
                scenarios  = response.response.scenarios,
                timetables = response.response.timetables,
                timesteps  = response.response.timesteps;

            var newState = that.newModel();
            newState.synced = true;
            newState.syncId = settings.id;
            delete newState.scenarios;
            newState.scenarios = {};
                    /*name:          'New Model',
                    maxIterations: 4,
                    offsetX:       0,
                    offsetY:       0,
                    zoom:          1,
                    linegraph:     false,

                    timeStepT:     'Week',
                    timeStepN:     0*/
            newState.settings = {
                name:          settings.name,
                offsetX:       settings.pan_offset_x,
                offsetY:       settings.pan_offset_y,
                zoom:          settings.zoom
            };

            nodes.forEach(function(node) {
                newState.nodeData[node.id] = {
                    id:             node.id,
                    syncId:         node.id,
                    name:           node.name,
                    description:    node.description,
                    type:           node.type,
                    simulateChange: 0,
                    links:          []
                };

                newState.nodeGui[node.id]  = {
                    id:         node.id,
                    syncId:     node.id,
                    radius:     node.radius,
                    x:          node.x,
                    y:          node.y,
                    avatar:     node.avatar,
                    graphColor: node.color
                };
            });

            links.forEach(function(link) {
                if(!link.downstream || !link.upstream) {
                    notificationBar.notify('Model with id ' + modelId + ' is corrupt. Its id is loaded and may be deleted from running \'Delete current\'. Otherwise, contact sysadmin.', 10000);
                    return callback(settings.id);
                }

                newState.links[link.id] = {
                    id:          link.id,
                    syncId:      link.id,
                    coefficient: link.coefficient,
                    node1:       link.upstream,
                    node2:       link.downstream,
                    threshold:   link.threshold,
                    timelag:     link.timelag,
                    type:        link.type || 'fullchannel',
                    width:       8
                };

                newState.nodeData[link.downstream].links.push(link.id);
                newState.nodeData[link.upstream].links.push(link.id);
            });

            scenarios.forEach(function(scenario, index) {
                var newScenario = new Scenario(newState);

                newScenario.id                = scenario.id,
                newScenario.syncId            = scenario.id,
                newScenario.name              = scenario.name,
                newScenario.maxIterations     = scenario.max_iterations,
                newScenario.timeStepN         = scenario.timestep_n,
                newScenario.measurement       = scenario.measurement,
                newScenario.measurementAmount = scenario.measurement_amount,

                newState.scenarios[newScenario.id] = newScenario;

                if(index === 0) {
                    newState.loadedScenario = newState.scenarios[scenario.id];
                }
            });

            var timetableLookup = {};
            timetables.forEach(function(timetable) {
                var node = newState.nodeData[timetable.node];
                var newTimetable = new TimeTable(node, function() {
                    newState.refresh = true;
                    newState.resetUI = true;
                    newState.propagate();
                });

                timetableLookup[timetable.id] = newTimetable;

                newState.scenarios[timetable.scenario].data[node.id] = newTimetable;
            });

            timesteps.forEach(function(timestep) {
                var timetable = timetableLookup[timestep.timetable];
                if(!timetable.timeTable) {
                    timetable.timeTable = {};
                }

                if(!timetable.node.timeTable) {
                    timetable.node.timeTable = {};
                }
                
                timetable.timeTable[timestep.step]      = timestep.value;
                timetable.node.timeTable[timestep.step] = timestep.value;
            });

            /*timetableLookup.forEach(function(tt) {
                tt.refreshTimeTable();
            });*/

            callback(newState);
        });
    }
};

},{"./api/backend_api.js":"api/backend_api.js","./breakout.js":"breakout.js","./menu_builder":"menu_builder/menu_builder.js","./notification_bar":"notification_bar/notification_bar.js","./object-helper":"object-helper.js","./scenario":"scenario/scenario.js","./settings":"settings/settings.js"}],"mouse_handling/handle_down.js":[function(require,module,exports){
'use strict';

var middleware     = require('./../middleware.js'),
    pointRect      = require('./../collisions.js').pointRect,
    hitTest        = require('./../collisions.js').hitTest,
    linker         = require('./../linker.js'),
    aggregatedLink = require('./../aggregated_link.js'),
    icon           = require('../icon');

var objectHelper   = require('./../object-helper.js');

var mouseDownWare = middleware([
    startLinkingIfSelected,
    startMovingIconIfSelected,
    clickAndMove
]);

function clickAndMove(data, error, done, env) {
    var previouslyClickedNodes = objectHelper.filter.call(
        data.nodeGui,
        function(node) {
            return node.clicked;
        }
    );

    previouslyClickedNodes = objectHelper.map.call(
        previouslyClickedNodes,
        function(node) {
            delete node.clicked;
            return node;
        }
    );

    var previouslyClickedLinks = objectHelper.filter.call(
        data.links, function(link) {
            return link.clicked;
        }
    );

    previouslyClickedLinks = objectHelper.map.call(
        previouslyClickedLinks,
        function(link) {
            delete link.clicked;
            return link;
        }
    );

    data.nodeGui = objectHelper.merge.call(data.nodeGui, previouslyClickedNodes);
    data.links   = objectHelper.merge.call(data.links,   previouslyClickedLinks);

    /*// if we click on a icon we want to start moving it!
    var collidedNodes = data.nodeGui.
        filter(function(node) { return node.icon !== undefined && hitTest(data.pos, icon(node)); }).
        slice(-1).
        map(function(node) {
            return node.concat({
                movingIcon: true
            });
         });
    data.nodeGui = data.nodeGui.merge(collidedNodes);

    if (objectHelper.size.call(collidedNodes) > 0) {
        return done(data);
    }*/
    
    // but if we click on the node, we want to move the actual node
    var collidedNodes = objectHelper.filter.call(
        data.nodeGui,
        function(node) {
            return hitTest(node, data.pos);
        }
    );

    collidedNodes = objectHelper.slice.call(collidedNodes, -1);
    collidedNodes = objectHelper.map.call(
        collidedNodes,
        function(node) {
            node = objectHelper.merge.call(node, {
                offsetX:   data.pos.x - (node.x || 0),
                offsetY:   data.pos.y - (node.y || 0),
                clicked:   true
                //selected: true
            });

            return node;
         }
    );

    data.nodeGui = objectHelper.merge.call(data.nodeGui, collidedNodes);

    if (Object.keys(collidedNodes).length > 0) {
        return done(data);
    }

    // if we didn't click any nodes, we check if we clicked any links

    var collidedLinks = objectHelper.filter.call(
        data.links,
        function(link) {
            return hitTest(aggregatedLink(link, data.nodeGui), data.pos);
        }
    );

    collidedLinks = objectHelper.slice.call(collidedLinks, -1);
    collidedLinks = objectHelper.map.call(
        collidedLinks,
        function(link) {
            return objectHelper.merge.call(
                link,
                {
                    offsetX:  data.pos.x - (link.x || 0),
                    offsetY:  data.pos.y - (link.y || 0),
                    clicked:  true
                    //selected: true
                }
            );
        }
    );

    data.links = objectHelper.merge.call(data.links, collidedLinks);

    if (Object.keys(collidedLinks).length > 0) {
        return done(data);
    }

    if(data.env !== 'simulate') {
        return data;
    }

    // If we didn't hit any links, look for clicked origin tables.

    var collidedTables = objectHelper.filter.call(
        data.nodeGui,
        function(node) {
            var w = node.tableWidth,
                h = node.tableHeight;

            var x = node.x - node.radius - w - 8,
                y = node.y - (h / 2);

            return pointRect(data.pos, {x: x, y: y, width: w, height: h});
        }
    );


    collidedTables = objectHelper.map.call(
        collidedTables,
        function(node) {
            return node.concat({
                offsetX: data.pos.x - (node.x || 0),
                offsetY: data.pos.y - (node.y || 0),
                clicked: true
            });
        }
    );

    data.nodeGui = objectHelper.merge.call(data.nodeGui, collidedTables);

    if (objectHelper.size.call(collidedTables) > 0) {
        return done(data);
    }

    return data;
}

function startLinkingIfSelected(data, error, done) {
    // if a node is selected and we click the linker-symbol, then start linking!
	var linkingNodes = objectHelper.filter.call(
        data.nodeGui,
        function(node) {
            return node.selected === true;
        }
    );

    linkingNodes = objectHelper.filter.call(
        linkingNodes,
		function(node) {
            return hitTest(data.pos, linker(node));
        }
    );

    linkingNodes = objectHelper.map.call(
		linkingNodes,
        function(node) {
            node.linking = true;
            return node;
        }
    );

	data.nodeGui = objectHelper.merge.call(data.nodeGui, linkingNodes);

    // if we started to link a node, we use the done-function
    // otherwise it'd go to the next mousehandling-function
    // and try to select something instead
	if (objectHelper.size.call(linkingNodes) > 0) {
		return done(data);
	}

	return data;
}

function startMovingIconIfSelected(data, error, done) {
    // if we have a node selected and we aren't linking and we click an icon, then start moving the icon!
	var movingIconNodes = objectHelper.filter.call(
        data.nodeGui,
		function(node) {
            return node.selected === true && node.linking !== true && node.icon !== undefined;
        }
    );

    movingIconNodes = objectHelper.filter.call(
        movingIconNodes,
		function(node) {
            return hitTest(data.pos, icon(node));
        }
    );
	
    movingIconNodes = objectHelper.map.call(
        movingIconNodes,
        function(node) {
            return node.set('movingIcon', true);
        }
    );

	data.nodeGui = objectHelper.merge.call(data.nodeGui, movingIconNodes);

    // if we started to move a node, we use the done-function
    // otherwise it'd go to the next mousehandling-function
    // and try to select something instead
	if (objectHelper.size.call(movingIconNodes) > 0) {
		return done(data);
	}
    
	return data;
}

module.exports = mouseDownWare;
},{"../icon":"icon.js","./../aggregated_link.js":"aggregated_link.js","./../collisions.js":"collisions.js","./../linker.js":"linker.js","./../middleware.js":"middleware.js","./../object-helper.js":"object-helper.js"}],"mouse_handling/handle_drag.js":[function(require,module,exports){
'use strict';

var middleware   = require('./../middleware.js');
var objectHelper = require('./../object-helper.js');

var mouseDownWare = middleware([
    moveLinker,
    moveIcon,
    moveClickedNodes,
    pan
]);

function pan(data) {
    data.settings.offsetX = (data.settings.offsetX || 0) - data.deltaPos.x;
    data.settings.offsetY = (data.settings.offsetY || 0) - data.deltaPos.y;
    
    return data;
}

function moveClickedNodes(data, error, done) {
    var movingNodes = objectHelper.filter.call(
        data.nodeGui,
        function(node) {
            return node.clicked === true;
        }
    );

    movingNodes = objectHelper.map.call(
        movingNodes,
        function(node) {
            return objectHelper.merge.call(
                node,
                {
                    x: data.pos.x - node.offsetX,
                    y: data.pos.y - node.offsetY
                }
            );
        }
    );

    data.nodeGui = objectHelper.merge.call(data.nodeGui, movingNodes);
    
    if (Object.keys(movingNodes).length > 0) {
        return done(data);
    }

    return data;
}

function moveLinker(data, error, done) {
    var movingLinker = objectHelper.filter.call(
        data.nodeGui,
        function(node) {
            return node.linking === true;
        }
    );

    movingLinker = objectHelper.map.call(
        movingLinker,
        function(node) {
            return objectHelper.merge.call(node, {
                linkerX: data.pos.x,
                linkerY: data.pos.y
            });
        }
    );

    data.nodeGui = objectHelper.merge.call(data.nodeGui, movingLinker);
    
    if (Object.keys(movingLinker).length > 0) {
        return done(data);
    }

    return data;
}

function moveIcon(data, error, done) {
    var movingIcons = objectHelper.filter.call(
        data.nodeGui,
        function(node) {
            return node.movingIcon === true;
        }
    );

    movingIcons = objectHelper.map.call(
        movingIcons,
        function(node) {
            return node.merge({
                iconXOffset: data.pos.x - node.x,
                iconYOffset: data.pos.y - node.y
            });
        }
    );

    data.nodeGui = objectHelper.merge.call(data.nodeGui, movingIcons);

    if (Object.keys(movingIcons).length > 0) {
        return done(data);
    }
    
    return data;
}

module.exports = mouseDownWare;
},{"./../middleware.js":"middleware.js","./../object-helper.js":"object-helper.js"}],"mouse_handling/handle_up.js":[function(require,module,exports){
'use strict';

var middleware   = require('./../middleware.js'),
    hitTest      = require('./../collisions.js').hitTest,
    linker       = require('./../linker.js'),
    Immutable    = null,
    modelLayer   = require('./../model_layer.js'),
    generateLink = require('./../util/generate_link.js'),
    objectHelper = require('./../object-helper.js'),
    createLink   = require('../structures/create_link');

var mouseDownWare = middleware([
    link,
    //stopClicked,
    stopLinking,
    stopMovingIcon,
    deselect,
    select
]);

/*function stopClicked(data) {
    data.nodeGui = data.nodeGui.merge(
            data.nodeGui.filter(function(obj) { return obj.clicked === true; })
                .map(function(obj) { return obj.delete('clicked').delete('offsetX').delete('offsetY'); })
    );

    return data;
}*/

function generateHexColor() {
    return Math.round(Math.random() * 255).toString(16);
}

function generateColor() {
    return '#' + generateHexColor() + generateHexColor() + generateHexColor();
}

function link(data) {
    generateLink(data.loadedModel);

    return data;
}

function stopLinking(data) {
    var linkers = objectHelper.filter.call(
        data.nodeGui,
        function(node) {
            return node.linking === true;
        }
    );

    linkers = objectHelper.map.call(
        linkers,
        function(node) {
            delete node.linkerX;
            delete node.linkerY;
            delete node.linking;
            
            node.clicked = true;
            return node;
        }
    );

    data.nodeGui = objectHelper.merge.call(data.nodeGui);

    return data;
}

function stopMovingIcon(data) {
    var icons = objectHelper.filter.call(
        data.nodeGui,
        function(node) {
            return node.movingIcon === true;
        }
    );

    icons = objectHelper.map.call(
        icons,
        function(node) {
            return node.delete('movingIcon');
        }
    );

    data.nodeGui = objectHelper.merge.call(data.nodeGui, icons);

    return data;
}

function deselect(data) {
    if(data.didDrag) {
        return data;
    }

    var selectedNodes = objectHelper.filter.call(
        data.nodeGui,
        function(node) {
            return node.selected === true && !node.clicked
        }
    );

    selectedNodes = objectHelper.map.call(
        selectedNodes,
        function(node) {
            data.selected = {};
            delete node.selected;
            delete node.offsetX;
            delete node.offsetY;

            return node;
        }
    );

    data.nodeGui = objectHelper.merge.call(data.nodeGui, selectedNodes);

    var selectedLinks = objectHelper.filter.call(
        data.links,
        function(link) {
            return link.selected === true && !link.clicked;
        }
    );

    selectedLinks = objectHelper.map.call(
        data.links,
        function(link) {
            data.selected = {};
            delete link.selected;
            delete link.offsetX;
            delete link.offsetY;
            return link;
        }
    );

    data.links = objectHelper.merge.call(data.links, selectedLinks);

    return data;
}

function select(data, error, done) {
    var selectedNodes = objectHelper.filter.call(
        data.nodeGui,
        function(node) {
            return node.clicked;
        }
    );
    
    selectedNodes = objectHelper.map.call(
        selectedNodes,
        function(node) {
            if(node.msSinceClicked !== undefined && node.msSinceClicked + 300 > Date.now()) {
                data.selected = node;
                node.selected = true;
                delete node.msSinceClicked;
                return node;
            }

            node.linegraph  = data.linegraph ? !node.linegraph : false,
            node.graphColor = generateColor();
            node.msSinceClicked = Date.now();
            return node;
        }
    );

    var selectedLinks = objectHelper.filter.call(
        data.links,
        function(link) {
            return link.clicked;
        }
    );

    selectedLinks = objectHelper.map.call(
        selectedLinks,
        function(link) {
            if(link.msSinceClicked !== undefined && link.msSinceClicked + 300 > Date.now()) {
                data.selected = link;
                link.selected = true;
                delete link.msSinceClicked;
                return link;
            }

            link.msSinceClicked = Date.now();
            return link;
        }
    );

    data.nodeGui = objectHelper.merge.call(data.nodeGui, selectedNodes);
    data.links   = objectHelper.merge.call(data.links,   selectedLinks);

    return data;
}

module.exports = mouseDownWare;
},{"../structures/create_link":"structures/create_link.js","./../collisions.js":"collisions.js","./../linker.js":"linker.js","./../middleware.js":"middleware.js","./../model_layer.js":"model_layer.js","./../object-helper.js":"object-helper.js","./../util/generate_link.js":"util/generate_link.js"}],"network/network.js":[function(require,module,exports){
'use strict';

function validateDomain(domain) {
    var check = domain.match(/^(http[s]?):\/\/([a-zA-Z0-9\.]+)\/?.*$|^(http[s]?):\/\/([a-zA-Z0-9\.]+):(\d+)\/?.*$/);

    if(check === null) {
        console.error(domain);
        throw new Error('Domain of invalid structure!');
    }

    return domain;
}

function sendData(domain, path, jsonData, callback, method) {
    if(typeof domain !== 'string') {
        throw new Error('sendData got invalid type for domain or port!');
    }

    if(jsonData && typeof jsonData === 'function') {
        if(callback && typeof callback === 'string') {
            method = callback;
        }

        callback = jsonData;
        jsonData = null;
    }

    if(jsonData) {
        if(typeof jsonData !== 'object') {
            throw new Error('Expected JS object as jsonData.');
        }

        jsonData = JSON.stringify(jsonData, null, 4);
    }

    var httpRequest = new XMLHttpRequest(),
        requestPath;

    validateDomain(domain);

    if (!httpRequest) {
        console.error('Giving up :( Cannot create an XMLHTTP instance');
        return false;
    }

    httpRequest.onreadystatechange = function() {
        if (httpRequest.readyState === 4) {
            try {
                var rt = JSON.parse(httpRequest.responseText);
                rt.status = httpRequest.status;
                
                if (httpRequest.status === 200) {
                    if (callback) {
                        callback(rt);
                    } else {
                        console.warn('No callback was sent with the query against ' + path);
                    }
                } else {
                    callback(rt);
                }
            } catch(err) {
                callback(undefined, err);
            }
        }
    };

    if (!method) {
        if (jsonData && typeof jsonData !== 'function') {
            method = 'POST';
        } else {
            method = 'GET';
        }
    }

    if(domain.charAt(domain.length - 1) === '/') {
        domain = domain.slice(0, domain.length - 1);
    }

    if(path.charAt(0) !== '/') {
        path = '/' + path;
    }

    httpRequest.open(method, domain + path);
    httpRequest.setRequestHeader('Content-Type', 'application/json');
    if (jsonData && typeof jsonData !== 'function') {
        //console.log(JSON.stringify(jsonData, null, 4));
        httpRequest.send(jsonData);
    } else {
        httpRequest.send();
    }
}

module.exports = sendData;
},{}],"network/package.json":[function(require,module,exports){
module.exports={
    "name": "s4u_network",
    "main": "./network.js"
}
},{}],"node/node.js":[function(require,module,exports){
'use strict';

module.exports = {
};
},{}],"node/package.json":[function(require,module,exports){
module.exports={
    "name": "sense4us-node",
    "main": "./node.js"
}
},{}],"notification_bar/notification_bar.js":[function(require,module,exports){
'use strict';

var Popup = require('./popup.js');

function NotificationBar() {
    if (!(this instanceof NotificationBar)) {
        throw new Error('Accessing NotificationBar as a generic method.');
    }

    this.container = null;
}

NotificationBar.prototype = {
    setContainer: function(container) {
        this.container = container;
        this.notify('Initialized.');
    },

    notify: function(text, delay) {
        if (this.container === null) {
            return false;
        }

        var popup = new Popup(text);
        var that = this;
        this.container.appendChild(popup.element);
        setTimeout(function() {
            popup.fadeOut(function() {
                that.container.removeChild(popup.element);
            });
        }, delay || 4000);
    }
};

module.exports = new NotificationBar();
},{"./popup.js":"notification_bar/popup.js"}],"notification_bar/package.json":[function(require,module,exports){
module.exports={
    "name": "s4u_notification_bar",
    "main": "./notification_bar.js"
}
},{}],"notification_bar/popup.js":[function(require,module,exports){
'use strict';

function Popup(text) {
    if (!(this instanceof Popup)) {
        throw new Error('Accessing Popup as a generic method.');
    }

    if (!text || typeof text !== 'string') {
        throw new Error('Popup constructor parameters given are invalid.');
    }

    this.element           = document.createElement('div');
    this.element.innerHTML = text;
    this.text              = text;

    this.element.className = 'fade-in';
}

Popup.prototype = {
    fadeOut: function(onEnd) {
        this.element.className = 'fade-out';
        setTimeout(function() {
            onEnd();
        }, 1000);
    }
};

module.exports = Popup;
},{}],"object-helper.js":[function(require,module,exports){
'use strict';

function forEach(callback, thisArg) {
    var that = this;
    Object.keys(this).forEach(function(key, i, arr) {
        callback.call(thisArg, that[key], key, i, arr);
    });
};

function filter(callback) {
    var newObj = {},
        that   = this;
    Object.keys(this).forEach(function(key, i, arr) {
        if(callback(that[key], key, i, arr)) {
            newObj[key] = that[key];
        }
    });

    return newObj;
};

function copyArray(arr) {
    var newArr = [];

    arr.forEach(function(value) {
        if(Array.isArray(value)) {
            newArr.push(copyArray(value));
        } else if(typeof value === 'object') {
            newArr.push(copy.call(value.copy));
        } else {
            newArr.push(value);
        }
    });

    return newArr;
}

function copy() {
    var newObj   = {};

    Object.keys(this).forEach(function(key) {
        var value = this[key];
        if(Array.isArray(value)) {
            newObj[key] = copyArray(value);
        } else if(typeof value === 'object' && value) {
            newObj[key] = copy.call(value);
        } else {
            newObj[key] = value;
        }
    }, this);

    return newObj
};

function size() {
    return Object.keys(this).length;
};

function map(callback) {
    var newObj = {},
        that   = this;
    Object.keys(this).forEach(function(key, i, arr) {
        newObj[key] = callback(that[key], key, i, arr);
    });

    return newObj;
};

function merge() {
    var newObj = {},
        that   = this;

    Object.keys(this).forEach(function(key) {
        newObj[key] = that[key];
    });

    for(var i = 0; i < arguments.length; i++) {
        if(typeof arguments[i] !== 'object') {
            return;
        }

        var obj = arguments[i];
        Object.keys(obj).forEach(function(key) {
            newObj[key] = obj[key];
        });
    }

    return newObj;
};

function slice(from, to) {
    var newObj = {},
        that   = this;

    var slice = Object.keys(this).slice(from, to);
    slice.forEach(function(key) {
        newObj[key] = that[key];
    });

    return newObj;
};

function first() {
    var arr = Object.keys(this);
    var length = arr.length;
    if(length === 0) {
        return undefined;
    }

    return this[arr[0]];
};

function last() {
    var arr = Object.keys(this);
    var length = arr.length;
    if(length === 0) {
        return undefined;
    }

    return this[arr[arr.length-1]];
};

function lastKey() {
    var arr = Object.keys(this);
    var length = arr.length;
    if(length === 0) {
        return undefined;
    }

    return arr[arr.length-1];
};

module.exports = {
    filter:  filter,
    slice:   slice,
    first:   first,
    last:    last,
    size:    size,
    lastKey: lastKey,
    merge:   merge,
    map:     map,
    forEach: forEach,
    copy:    copy
};
},{}],"refresh.js":[function(require,module,exports){
'use strict';

var curry = require('./curry');

var linker = require('./linker.js');

var aggregatedLink = require('./aggregated_link.js');

var colorValues    = require('./graphics/value_colors.js');
var objectHelper   = require('./object-helper.js');

var drawNode       = require('./graphics/draw_node.js'),
    drawTimeTable  = require('./graphics/draw_time_table.js');

var drawSelectedMenu = curry(require('./selected_menu').drawSelectedMenu, document.getElementById('sidebar')),
    drawLinker       = require('./graphics/draw_linker.js'),
    drawLink         = require('./graphics/draw_link.js'),   
    drawChange       = require('./graphics/draw_change.js'), 
    drawText         = require('./graphics/draw_text.js'),
    drawActor        = require('./graphics/draw_actor.js');

var updateSelected = require('./selected_menu').updateSelected;

function clearCanvasAndTransform(ctx, canvas, loadedModel, selectedMenu, next) {
    ctx.clearRect(
        -loadedModel.settings.offsetX,
        -loadedModel.settings.offsetY,
        canvas.width,
        canvas.height
    );
    /*ctx.clearRect(
        (-loadedModel.settings.offsetX || 0) * (2 - loadedModel.settings.scaleX || 1),
        (-loadedModel.settings.offsetY || 0) * (2 - loadedModel.settings.scaleX || 1),
        canvas.width  * (2 - (loadedModel.settings.scaleX || 1)),
        canvas.height * (2 - (loadedModel.settings.scaleY || 1))
    );*/
    
    ctx.setTransform(
        loadedModel.settings.scaleX  || 1,
        0,
        0,
        loadedModel.settings.scaleY  || 1,
        loadedModel.settings.offsetX || 0,
        loadedModel.settings.offsetY || 0
    );

    next();
}

function drawNodes(ctx, canvas, loadedModel, selectedMenu, next) {
    // draw all the nodes

    objectHelper.forEach.call(
        loadedModel.nodeData,
        function drawEachNode(n) { 
            var nodeGui = objectHelper.merge.call(n, loadedModel.nodeGui[n.id]);
            if(!loadedModel.settings.linegraph) {
                nodeGui.linegraph = false;
            }

            drawNode(ctx, nodeGui);
        }
    );

    next();
}

function drawLinks(ctx, canvas, loadedModel, selectedMenu, next) {
    // draw the links and arrows
    var actors = {};
    objectHelper.forEach.call(
        loadedModel.links,
        function drawLinksAndArrows(link) {
            var nodeData = loadedModel.nodeData[link.node1];
            if(nodeData.type.toUpperCase() === 'ACTOR') {
                if(!actors[link.node2]) {
                    actors[link.node2] = 0;
                }

                actors[link.node2] += 1;
                var layer = actors[link.node2];
                drawActor(ctx, layer, link, loadedModel);
            } else {
                drawLink(ctx, aggregatedLink(link, loadedModel.nodeGui));
            }
        }
    );

    next();
}

function drawNodeDescriptions(ctx, canvas, loadedModel, selectedMenu, next) {
    // draw all the node descriptions
    objectHelper.forEach.call(
        loadedModel.nodeData,
        function drawEachNodeText(n) { 
            var nodeGui = objectHelper.merge.call(n, loadedModel.nodeGui[n.id]);
            drawText(
                ctx,
                nodeGui.name,
                nodeGui.x,
                nodeGui.y + nodeGui.radius + 4,
                colorValues.neutral,
                true
            );
            /*
            ** If you add more environment specific code, please bundle
            ** it up into another method.
            **
            ** e.g. drawNodeInSimulation(nodeGui)
            */
            if(loadedModel.environment === 'simulate' ) {
                if(nodeGui.timeTable) {
                    drawTimeTable(ctx, nodeGui);
                } else if(nodeGui.type.toUpperCase() !== 'ACTOR') {
                    drawChange(ctx, nodeGui.x, nodeGui.y + nodeGui.radius / 6, Math.round(n.simulateChange[loadedModel.loadedScenario.timeStepN] * 100) / 100);
                }
            }
        }
    );

    next();
}

function _drawLinker(ctx, canvas, loadedModel, selectedMenu, next) {
    // if there are nodes selected that aren't currently linking, we want to draw the linker
    var filteredNodes = objectHelper.filter.call(
        loadedModel.nodeGui,
        function drawLinkerOnSelectedNodes(node) {
            return node.selected === true && node.linking !== true;
        }
    );

    objectHelper.forEach.call(
        filteredNodes,
        function(n) {
            drawLinker(ctx, linker, n);
        }
    );

    next();
}

function drawLinkingLine(ctx, canvas, loadedModel, selectedMenu, next) {
    // if we are currently linking, we want to draw the link we're creating
    var linkingNodes = objectHelper.filter.call(
        loadedModel.nodeGui,
        function drawLinkingArrow(node) {
            return node.linking === true;
        }
    );

    objectHelper.forEach.call(
        linkingNodes,
        function(node) {
            var linkerForNode = linker(node);
            drawLink(ctx, {
                    type:         'fullchannel',
                    x1:           node.x,
                    y1:           node.y,
                    x2:           node.linkerX,
                    y2:           node.linkerY,
                    fromRadius:   node.radius,
                    targetRadius: 0,
                    width:        8
                }
            );
        }
    );

    // if we are linking, we want to draw the dot above everything else
    linkingNodes = objectHelper.filter.call(
        loadedModel.nodeGui,
        function drawLinkerDotWhileLinking(node) {
            return node.linking === true;
        }
    );

    objectHelper.forEach.call(
        linkingNodes,
        function(d){
            drawLinker(ctx, linker, d)
        }
    );
    
    next();
}

module.exports = {
    clearCanvasAndTransform: clearCanvasAndTransform,
    drawNodes:               drawNodes,
    drawLinks:               drawLinks,
    drawNodeDescriptions:    drawNodeDescriptions,
    _drawLinker:             _drawLinker,
    drawLinkingLine:         drawLinkingLine
};
},{"./aggregated_link.js":"aggregated_link.js","./curry":"curry.js","./graphics/draw_actor.js":"graphics/draw_actor.js","./graphics/draw_change.js":"graphics/draw_change.js","./graphics/draw_link.js":"graphics/draw_link.js","./graphics/draw_linker.js":"graphics/draw_linker.js","./graphics/draw_node.js":"graphics/draw_node.js","./graphics/draw_text.js":"graphics/draw_text.js","./graphics/draw_time_table.js":"graphics/draw_time_table.js","./graphics/value_colors.js":"graphics/value_colors.js","./linker.js":"linker.js","./object-helper.js":"object-helper.js","./selected_menu":"selected_menu/selected_menu.js"}],"scenario/package.json":[function(require,module,exports){
module.exports={
    "name": "scenario",
    "main": "./scenario.js"
}
},{}],"scenario/scenario.js":[function(require,module,exports){
var FloatingWindow = require('./../floating_window/floating_window.js'),
    menuBuilder    = require('./../menu_builder');

var objectHelper = require('./../object-helper.js');

var timeTableId = -1;
function TimeTable(node, onChange) {
    timeTableId++;
    this.id     = timeTableId;
    this.syncId = false;

    this.node   = node;
    this.data   = objectHelper.copy.call(node);

    this.data.id = timeTableId;

    this.node.timeTable = this.data.timeTable;

    this.header   = node.name;
    this.onChange = onChange;

    this.container = menuBuilder.div('menu');

    this.timeTable = this.data.timeTable;

    this.timeTableDiv;
    this.rowContainer;
    this.rows = {};

    this.dropdowns  = {};
    this.inputs     = {};
}

TimeTable.prototype = {
    setTimeStep: function(timeStepInput, timeStep, newStep) {
        var storingValue = this.timeTable[timeStep];
        if(this.timeTable[newStep]) {
            return timeStepInput.value = timeStep;
        }

        this.timeTable[newStep] = this.timeTable[timeStep];
        delete this.timeTable[timeStep];

        this.node.timeTable[newStep] = this.node.timeTable[timeStep];
        delete this.node.timeTable[timeStep];

        this.rows[newStep] = this.rows[timeStep];
        delete this.rows[timeStep];

        timeStepInput.value = newStep;

        this.refreshTimeTable();

        this.onChange();
    },
    
    setTimeValue: function(timeValueInput, timeStep, newValue) {
        newValue = Number(newValue);
        this.timeTable[timeStep] = newValue;
        timeValueInput.value     = newValue;

        this.node.timeTable[timeStep] = newValue;

        this.onChange();
    },

    addTimeRow: function(timeStep, timeValue) {
        if(!this.timeTable) {
            this.timeTable = {};
        }

        var containerDiv = this.timeTableDiv;
        if(!containerDiv) {
            var containerDiv = menuBuilder.div();
                containerDiv.className = 'mb-time-table';

            containerDiv.appendChild(menuBuilder.label(key));

            this.timeTableDiv = containerDiv;
        }

        var rowContainer = this.rowContainer;
        if(!rowContainer) {
            rowContainer      = menuBuilder.div('row-container');
            this.rowContainer = rowContainer;

            containerDiv.appendChild(rowContainer);
        }

        var that = this;

        var rowDiv = menuBuilder.div('time-row');
        this.rows[timeStep] = rowDiv;

        var timeStepLabel       = menuBuilder.span('T');
        timeStepLabel.className = 'label';

        var timeStepInput = menuBuilder.input('time-step', timeStep, function(input, newStep) {
            that.setTimeStep(timeStepInput, timeStep, newStep);
        });

        timeStepInput.className = 'time-step';

        var timeValueLabel = menuBuilder.span('V');
        timeValueLabel.className = 'label';

        var timeValueInput = menuBuilder.input('time-value', timeValue, function(input, newValue) {
            that.setTimeValue(timeValueInput, timeStep, newValue);
        });

        timeValueInput.className = 'time-value';

        rowDiv.appendChild(timeStepLabel);
        rowDiv.appendChild(timeStepInput);
        rowDiv.appendChild(timeValueLabel);
        rowDiv.appendChild(timeValueInput);

        rowDiv.stepInput  = timeStepInput;
        rowDiv.valueInput = timeValueInput;

        rowContainer.appendChild(rowDiv);

        this.node.timeTable[timeStep] = timeValue;
    },

    removeTimeRow: function() {
        if (this.timeTable === undefined || this.timeTable === null || this.timeTable.size() === 0) {
            return;
        }
        
        this.timeTable = this.timeTable.slice(0, -1);

        var element = this.rows.last();
        this.rowContainer.removeChild(element);

        delete this.rows[this.rows.lastKey()];

        this.node.timeTable = this.node.timeTable.slice(0, -1);

        this.onChange();
    },

    refreshTimeTable: function() {
        if(!this.rowContainer) {
            return;
        }

        while(this.rowContainer.firstChild) {
            this.rowContainer.removeChild(this.rowContainer.firstChild);
        }

        this.rows.forEach(function(row, key) {
            row.stepInput.deleteEvents();
            row.valueInput.deleteEvents();
        });

        this.rows = {};

        this.timeTable.forEach(function(timeValue, timeStep) {
            this.addTimeRow(timeStep, timeValue);
            this.node.timeTable[timeStep] = timeValue;
        }, this);
    },

    destroyTimeTable: function() {
        if(!this.rowContainer) {
            return;
        }

        while(this.rowContainer.firstChild) {
            this.rowContainer.removeChild(this.rowContainer.firstChild);
        }

        this.rows.forEach(function(row, key) {
            row.stepInput.deleteEvents();
            row.valueInput.deleteEvents();
        });

        this.rows = {};
    },

    generateTimeTable: function() {
        var containerDiv = this.timeTableDiv;
        if(!containerDiv) {
            var containerDiv = menuBuilder.div();
                containerDiv.className = 'mb-time-table';

            containerDiv.appendChild(menuBuilder.label(this.node.name || 'TimeTable'));

            this.timeTableDiv = containerDiv;
        } else {
            while(this.timeTableDiv.firstChild) {
                this.timeTableDiv.removeChild(this.timeTableDiv.firstChild);
            }

            this.timeTableDiv.appendChild(menuBuilder.label(this.node.name || 'TimeTable'));

            objectHelper.forEach.call(
                this.rows,
                function(row, key) {
                    row.stepInput.deleteEvents();
                    row.valueInput.deleteEvents();
                }
            );

            this.rows = {};
            this.rowContainer = null;
        }

        var rowContainer = this.rowContainer;
        if(!rowContainer) {
            rowContainer      = menuBuilder.div('row-container');
            this.rowContainer = rowContainer;

            containerDiv.appendChild(rowContainer);
        }

        if(!this.timeTable) {
            this.timeTable = {};
        }

        this.node.timeTable = this.timeTable;
        objectHelper.forEach.call(
            this.timeTable,
            function(timeValue, timeStep) {
                this.addTimeRow(timeStep, timeValue);
            },
            this
        );

        var that = this;
        containerDiv.appendChild(menuBuilder.button('Add row', function addTimeTableRow() {
            if (that.timeTable === undefined || that.timeTable === null) {
                that.addTimeRow(0, 0);
            } else {
                var highestIndex = 0;
                objectHelper.forEach.call(
                    that.timeTable,
                    function(value, key) {
                        var x;
                        if(!isNaN(x = parseInt(key)) && x > highestIndex) {
                            highestIndex = x;
                        }
                    }
                );

                var index = highestIndex + 1;
                var value = 0;
                that.timeTable[index] = value;
                that.addTimeRow(index, value);

                that.onChange();
            }
        }));

        containerDiv.appendChild(menuBuilder.button('Remove row', function removeTimeTableRow() {
            that.removeTimeRow();
        }));

        return containerDiv;
    }
};

function Scenario(loadedModel, syncId) {
    this.id     = loadedModel.generateId();
    this.syncId = syncId;

    this.container    = menuBuilder.div('mb-scenario');
    this.name         = 'New scenario';
    this.data         = {};

    this.measurement         = 'Week';
    this.measurementAmount   = 1;
    this.maxIterations       = 4;
    this.timeStepN           = 0;

    this.changedTables = {};
}

Scenario.prototype = {
    setName: function(name) {
        this.name = name;

        return this;
    },

    refresh: function(loadedModel) {
        this.generateScenarioContainer(loadedModel);

        return this;
    },

    setNodes: function() {
        /*this.loadedModel.nodeData.forEach(function(data) {
            console.log(data);
        });*/

        return this;
    },

    toJson: function(loadedModel) {
        return {
            id:                this.id,
            syncId:            this.syncId,
            name:              this.name,
            maxIterations:     this.maxIterations,
            measurement:       this.measurement,
            measurementAmount: this.measurementAmount,
            timeStepN:         this.timeStepN,
            tables: objectHelper.map.call(
                this.data,
                function(timeTable) {
                    return {
                        id:        timeTable.id,
                        syncId:    timeTable.syncId,
                        timetable: timeTable.timeTable
                    };
                }
            )
        };
    },

    generateScenarioContainer: function(loadedModel) {
        while(this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }

        objectHelper.forEach.call(
            loadedModel.nodeData,
            function(node) {
                if(node.type !== 'origin') {
                    return;
                }

                var data = this.data[node.id];
                if(!data) {
                    data = new TimeTable(node, function() {
                        loadedModel.refresh = true;
                        loadedModel.resetUI = true;
                        loadedModel.propagate();
                    });
                    this.data[node.id] = data;
                }
                
                this.container.appendChild(data.generateTimeTable());
            },
            this
        );

        loadedModel.refresh = true;
        loadedModel.propagate();

        return this;
    }
};

function ScenarioEditor(loadedModel) {
    this.loadedModel     = loadedModel;
    this.floatingWindow  = new FloatingWindow(20, 20, 440, 400, 'mb-scenario-editor');
    this.floatingWindow.killButton.removeEventListener('click', this.floatingWindow.killCallback);
    var that = this;
    this.floatingWindow.killButton.killCallback = function() {
        that.destroyWindow();
    };
    this.floatingWindow.killButton.addEventListener('click', this.floatingWindow.killCallback);
    this.container       = this.floatingWindow.container;
    this.body            = this.floatingWindow.body;
    this.scenarios       = loadedModel.scenarios;
    this.currentScenario = undefined;

    this.options              = menuBuilder.div('options');
    this.options.style.height = '40px';

    this.selectedIndex = 0;

    this.scenarioContainer = menuBuilder.div('table-container');
    this.scenarioContainer.style.height = '360px';

    this.body.appendChild(this.options);
    this.body.appendChild(this.scenarioContainer);

    this.loadedModel.floatingWindows.push(this);
    this.generateOptions();

    document.body.appendChild(this.container);
}

ScenarioEditor.prototype = {
    destroyWindow: function() {
        this.floatingWindow.destroyWindow();
        this.container = null;
        this.body      = null;

        this.deleteScenario.deleteEvents();
        this.newScenario.deleteEvents();
        this.scenarioDropdown.deleteEvents();

        this.deleteScenario   = null;
        this.newScenario      = null;
        this.scenarioDropdown = null;

        var index = this.loadedModel.floatingWindows.indexOf(this);
        if(index === -1) {
            return;
        }

        this.loadedModel.floatingWindows.splice(index, 1);
    },

    createWindow: function() {
        this.floatingWindow.createWindow();
        this.container = this.floatingWindow.container;
        this.body      = this.floatingWindow.body;

        this.options              = menuBuilder.div('options');
        this.options.style.height = '40px';

        this.scenarioContainer = menuBuilder.div('table-container');
        this.scenarioContainer.style.height = '360px';

        this.body.appendChild(this.options);
        this.body.appendChild(this.scenarioContainer);
        this.generateOptions();

        document.body.appendChild(this.container);
    },

    generateOptions: function() {
        var that = this;
        this.scenarioDropdown = menuBuilder.select('text', function() {
            var value = parseInt(this.value);
            if(!that.scenarios[value]) {
                return;
            }

            that.setScenario(that.scenarios[value]);
            //that.scenarios[value].refresh(that.loadedModel);
            that.selectedIndex = value;

            that.loadedModel.resetUI = true;
            that.loadedModel.propagate();
        });

        this.deleteScenario   = menuBuilder.button('Delete scenario', function() {

        });

        this.newScenario = menuBuilder.button('New scenario', function() {
            var scenario = new Scenario(that.loadedModel);
            scenario.setName(objectHelper.size.call(that.scenarios) + ': New scenario');
            that.setScenario(scenario);
            that.scenarios[scenario.id] = scenario;
            //scenario.refresh(that.loadedModel);

            var option = menuBuilder.option(scenario.id, scenario.name);
            that.scenarioDropdown.appendChild(option);

            var index = that.scenarioDropdown.options.length - 1;
            that.scenarioDropdown.options[index].selected = true;
            that.selectedIndex = index;

            that.loadedModel.resetUI = true;
            that.loadedModel.propagate();
        });

        this.scenarioDropdown.className = 'scenario-select';
        this.deleteScenario.className   = 'scenario-delete';
        this.newScenario.className      = 'scenario-new';

        this.options.appendChild(this.scenarioDropdown);
        this.options.appendChild(this.deleteScenario);
        this.options.appendChild(this.newScenario);

        objectHelper.forEach.call(
            this.loadedModel.scenarios,
            function(scenario) {
                var option = menuBuilder.option(scenario.id, scenario.name);
                if(scenario.id === this.currentScenario) {
                    option.selected = true;
                }

                this.scenarioDropdown.appendChild(option);
            },
            this
        );

        if(objectHelper.size.call(this.loadedModel.scenarios) === 0) {
            var scenario = new Scenario(this.loadedModel);
            scenario.setName(this.scenarios.size() + ': New scenario');

            this.setScenario(scenario);
            this.scenarios.push(scenario);

            var option = menuBuilder.option(that.loadedModel.scenarios.length - 1, scenario.name);
            this.scenarioDropdown.appendChild(option);
            this.selectedIndex = 0;
        } else {
            this.setScenario(this.loadedModel.loadedScenario);
            this.loadedModel.loadedScenario.refresh(this.loadedModel);
            /*this.setScenario(this.loadedModel.scenarios[this.selectedIndex]);
            this.loadedModel.scenarios[this.selectedIndex].refresh(this.loadedModel);*/
        }
    },

    setScenario: function(scenario) {
        this.currentScenario            = scenario;
        this.loadedModel.loadedScenario = scenario;
        //scenario.generateScenarioContainer();
        while(this.scenarioContainer.firstChild) {
            this.scenarioContainer.removeChild(this.scenarioContainer.firstChild);
        }

        this.scenarioContainer.appendChild(this.currentScenario.container);
    },

    refresh: function() {
        if(this.hidden) {
            return;
        }

        if(this.container === null && this.body === null) {
            this.createWindow();
        }

        this.currentScenario.refresh(this.loadedModel);
    }
};

module.exports = {
    ScenarioEditor: ScenarioEditor,
    Scenario:       Scenario,
    TimeTable:      TimeTable
};
},{"./../floating_window/floating_window.js":"floating_window/floating_window.js","./../menu_builder":"menu_builder/menu_builder.js","./../object-helper.js":"object-helper.js"}],"selected_menu/buttons.js":[function(require,module,exports){
'use strict';

var objectHelper = require('./../object-helper');

module.exports = [
    {
        header: 'Delete selected',
        ignoreModelSettings: true,
        replacingObj:        true,
        callback: function(loadedModel, selectedData) {
            selectedData.forEach(function(data) {
                if(data.data.relativeChange !== undefined) {
                    delete loadedModel.nodeData[data.data.id];
                    var links = loadedModel.nodeGui[data.data.id];
                    objectHelper.forEach.call(
                        links,
                        function(link, key) {
                            delete loadedModel.links[link];
                        }
                    );
                    delete loadedModel.nodeGui[data.data.id];
                } else if(data.data.x !== undefined || data.data.y !== undefined) {
                    if(data.data.links) {
                        data.data.links.forEach(function(link, key) {
                            delete loadedModel.links[link];
                        });
                    }

                    delete loadedModel.nodeGui[data.data.id];
                } else if(data.data.coefficient !== undefined) {
                    delete loadedModel.links[data.data.id];
                }

                loadedModel.selected = false;

                loadedModel.refresh = true;
                loadedModel.resetUI = true;
                loadedModel.propagate();
            });
        }
    }
];
},{"./../object-helper":"object-helper.js"}],"selected_menu/package.json":[function(require,module,exports){
module.exports={
    "name": "s4u_selected_menu",
    "main": "./selected_menu.js"
}
},{}],"selected_menu/selected_menu.js":[function(require,module,exports){
'use strict';

var Immutable   = null,
    menuBuilder = require('./../menu_builder'),
    settings    = require('./../settings'),
    buttons     = require('./buttons.js');

var objectHelper = require('./../object-helper.js');

var CONFIG      = require('./../config.js');

var url = CONFIG.get('url');
if(url.charAt(url.length - 1) !== '/') {
    url = url + '/';
}

function generateHexColor() {
    return Math.round(Math.random() * 255).toString(16);
}

function generateColor() {
    return '#' + generateHexColor() + generateHexColor() + generateHexColor();
}

function generateAvatarDiv(avatar, selected, name) {
    var avatarDiv = menuBuilder.div();
    var img = menuBuilder.img();

    avatarDiv.className = 'avatarPreview';

    if (selected === avatar.src) {
        avatarDiv.className += ' selected';
    }

    img.src         = url + avatar.src;
    avatarDiv.value = url + avatar.src;
    avatarDiv.name  = avatar.header || name;

    avatarDiv.appendChild(img);

    return avatarDiv;
}

function createAvatarButtons(header, value, callback, images) {
    var avatarsDiv = menuBuilder.div();
    
    avatarsDiv.className = 'avatars';
    
    images.forEach(function(avatar) {
        var avatarDiv = generateAvatarDiv(avatar, value, header);

        menuBuilder.addValueCallback(avatarDiv, callback, 'click');

        avatarsDiv.appendChild(avatarDiv);
    });

    avatarsDiv.deleteEvents = function() {
        for(var i = 0; i < avatarsDiv.children.length; i++) {
            var child = avatarsDiv.children[i];
            child.deleteEvents();
        }
    };

    return avatarsDiv;
}

function createAvatarSelector(header, value, callback) {
    var containerDiv = menuBuilder.div();

    containerDiv.appendChild(menuBuilder.label(header));

    settings.avatars.forEach(function(avatarGroup) {
        var avatarsDiv = createAvatarButtons(header, value, 
            function(key, value) {
                var oldAvatar = avatarsDiv.querySelectorAll('.selected')[0];
                if (oldAvatar) {
                    oldAvatar.className = 'avatarPreview';
                }
                
                var newAvatar = avatarsDiv.querySelectorAll('[src="' + value + '"]')[0].parentElement;
                newAvatar.className = 'avatarPreview selected';
                callback(key, value);
            },
            avatarGroup.images
        );
    
        containerDiv.appendChild(menuBuilder.label(avatarGroup.header));
        containerDiv.appendChild(avatarsDiv);
    });

    return containerDiv;
}

function Data(loadedModel, filter, data) {
    this.data = data;
    this.container = menuBuilder.div('menu');
    this.filter = filter;

    this.loadedModel = loadedModel;

    this.timetable;
    this.timetableDiv;
    this.rowContainer;
    this.rows = {};

    this.dropdowns  = {};
    this.inputs     = {};
}

Data.prototype = {
    refresh: function() {
        this.inputs.forEach(function(input, key) {
            input.value = this.data[key];
        });
    },

    updateFilter: function(filter) {
        this.filter = filter;
        this.createMenu();
    },

    deleteEvents: function() {
        objectHelper.forEach.call(
            this.rows,
            function(row, key) {
                row.stepInput.deleteEvents();
                row.valueInput.deleteEvents();
            }
        );

        objectHelper.forEach.call(
            this.dropdowns,
            function(dropdown) {
                dropdown.deleteEvents();
            }
        );

        objectHelper.forEach.call(
            this.inputs,
            function(input) {
                input.deleteEvents();
            }
        );
    },

    addTimeRow: function(timeStep, timeValue) {
        if(!this.timetable) {
            this.timetable = {};
        }

        var containerDiv = this.timetableDiv;
        if(!containerDiv) {
            var containerDiv = menuBuilder.div();
                containerDiv.className = 'mb-time-table';

            containerDiv.appendChild(menuBuilder.label(key));

            this.timetableDiv = containerDiv;
        }

        var rowContainer = this.rowContainer;
        if(!rowContainer) {
            rowContainer      = menuBuilder.div('row-container');
            this.rowContainer = rowContainer;

            containerDiv.appendChild(rowContainer);
        }

        var that = this;

        var rowDiv = menuBuilder.div('time-row');
        this.rows[timeStep] = rowDiv;

        var timeStepLabel       = menuBuilder.span('T');
        timeStepLabel.className = 'label';

        var timeStepInput = menuBuilder.input('time-step', timeStep, function(input, newStep) {
            if(newStep.match(/^\d+$/) === null) {
                timeStepInput.value = timeStep;
                return;
            }

            var storingValue = that.timetable[timeStep];
            if(that.timetable[newStep]) {
                return timeStepInput.value = timeStep;
            }

            that.timetable[newStep] = that.timetable[timeStep];
            delete that.timetable[timeStep];
            that.rows[newStep] = that.rows[timeStep];
            delete that.rows[timeStep];

            timeStepInput.value = newStep;

            that.refreshTimeTable();

            that.loadedModel.refresh = true;
            that.loadedModel.resetUI = true;
            that.loadedModel.propagate();
        });

        timeStepInput.className = 'time-step';

        var timeValueLabel = menuBuilder.span('V');
        timeValueLabel.className = 'label';

        var timeValueInput = menuBuilder.input('time-value', timeValue, function(input, newValue) {
            if(newValue.match(/^\d+\.?\d*$/) === null) {
                timeValueInput.value = that.timetable[timeStep];
                return;
            }

            that.timetable[timeStep] = Number(newValue);
            timeValueInput.value     = newValue;

            that.loadedModel.refresh = true;
            that.loadedModel.resetUI = true;
            that.loadedModel.propagate();
        });

        timeValueInput.className = 'time-value';

        rowDiv.appendChild(timeStepLabel);
        rowDiv.appendChild(timeStepInput);
        rowDiv.appendChild(timeValueLabel);
        rowDiv.appendChild(timeValueInput);

        rowDiv.stepInput  = timeStepInput;
        rowDiv.valueInput = timeValueInput;

        rowContainer.appendChild(rowDiv);
    },

    refreshTimeTable: function() {
        if(!this.rowContainer) {
            return;
        }

        while(this.rowContainer.firstChild) {
            this.rowContainer.removeChild(this.rowContainer.firstChild);
        }

        this.deleteEvents();

        this.rows = {};

        this.timetable.forEach(function(timeValue, timeStep) {
            this.addTimeRow(timeStep, timeValue);
        }, this);
    },

    generateTimeTable: function(key, value, header) {
        var containerDiv = this.timetableDiv;
        if(!containerDiv) {
            var containerDiv = menuBuilder.div();
                containerDiv.className = 'mb-time-table';

            containerDiv.appendChild(menuBuilder.label(header || key));

            this.timetableDiv = containerDiv;
        } else {
            while(this.timetableDiv.firstChild) {
                this.timetableDiv.removeChild(this.timetableDiv.firstChild);
            }

            this.timetableDiv.appendChild(menuBuilder.label(header || key));

            this.rows.forEach(function(row, key) {
                row.stepInput.deleteEvents();
                row.valueInput.deleteEvents();
            });

            this.rows = {};

            this.rowContainer = null;
        }

        var rowContainer = this.rowContainer;
        if(!rowContainer) {
            rowContainer      = menuBuilder.div('row-container');
            this.rowContainer = rowContainer;

            containerDiv.appendChild(rowContainer);
        }

        this.timetable = value;
        objectHelper.forEach.call(
            this.timetable,
            function(timeValue, timeStep) {
                this.addTimeRow(timeStep, timeValue);
            },
            this
        );

        var that = this;
        containerDiv.appendChild(menuBuilder.button('Add row', function addTimeTableRow() {
            if (that.timetable === undefined || that.timetable === null) {
                that.addTimeRow(0, 0);
            } else {
                var highestIndex = 0;
                objectHelper.forEach.call(
                    that.timetable,
                    function(value, key) {
                        var x;
                        if(!isNaN(x = parseInt(key)) && x > highestIndex) {
                            highestIndex = x;
                        }
                    }
                );

                var index = highestIndex + 1;
                var value = 0;
                that.timetable[index] = value;
                that.addTimeRow(index, value);

                that.loadedModel.refresh = true;
                that.loadedModel.resetUI = true;
                that.loadedModel.propagate();
            }
        }));

        containerDiv.appendChild(menuBuilder.button('Remove row', function removeTimeTableRow() {
            if (that.timetable === undefined || that.timetable === null || that.timetable.size() === 0) {
                return;
            }

            that.data[key] = that.timetable.slice(0, -1);
            that.timetable = that.data[key];

            var element = that.rows.last();
            that.rowContainer.removeChild(element);

            delete that.rows[that.rows.lastKey()];

            that.loadedModel.refresh = true;
            that.loadedModel.resetUI = true;
            that.loadedModel.propagate();
        }));

        return containerDiv;
    },

    generateDropdown: function(key, options, value) {
        var that = this;
        var containerSelect = menuBuilder.select(key, function(evt) {
            that.data[key] = this.value;

            that.loadedModel.refresh = true;
            that.loadedModel.propagate();
        });

        options.forEach(function(option) {
            var optionElement = menuBuilder.option(option, option);
            if(option === value) {
                optionElement.selected = 'selected';
            }
            
            containerSelect.appendChild(optionElement);
        });

        return containerSelect;
    },

    generateInput: function(key, value) {
        var container = menuBuilder.div();

        var that = this;
        container.appendChild(menuBuilder.label(key));

        this.inputs[key] = menuBuilder.input(
            key,
            value,
            function(thatKey, newValue) {
                that.data[thatKey] = newValue;

                that.loadedModel.refresh = true;
                that.loadedModel.resetUI = true;
                that.loadedModel.propagate();
            }
        );

        /*var focus = function(evt) {
            console.log('Document:', document.activeElement);
            console.log('Focused:', that.inputs[key]);
            console.log(evt);
        };

        var focusOut = function(evt) {
            console.log('Document:', document.activeElement);
            console.log('Focus lost:', that.inputs[key]);
            console.log(evt);
        };

        var deleteFocus = function() {
            that.inputs[key].removeEventListener('focus', focus);
            that.inputs[key].removeEventListener('focusout', focusout);
        };

        this.inputs[key].deleteEvent = function() {
            deleteFocus();
            this.inputs[key].deleteEvents();
        }

        this.inputs[key].addEventListener('focus',    focus);
        this.inputs[key].addEventListener('focusout', focusOut);*/

        container.appendChild(this.inputs[key]);

        return container;
    },

    createMenu: function() {
        var element = this.container;
        while(element.firstChild) {
            element.removeChild(element.firstChild);
        }

        var that = this;
        if(this.data.type && this.data.type.toUpperCase() === 'ACTOR') {
            var randomColor = menuBuilder.button('Randomize color', function() {
                that.loadedModel.nodeGui[that.data.id].color = generateColor();
                that.loadedModel.refresh = true;
                that.loadedModel.propagate();
            });

            element.appendChild(randomColor);
            var links = this.loadedModel.nodeGui[this.data.id].links;
            if(!links) {
                links = [];
            }

            links.forEach(function(link) {
                link = this.loadedModel.links[link];
                if(!link) {
                    return;
                }

                var targetedNode = this.loadedModel.nodeData[link.node2];
                var button = menuBuilder.button('Delete acting upon ' + targetedNode.name, function() {
                    delete that.loadedModel.links[link.id];
                    that.loadedModel.nodeGui[that.data.id].links = [];

                    that.loadedModel.refresh = true;
                    that.loadedModel.resetUI = true;
                    that.loadedModel.propagate();
                });

                element.appendChild(button);
            }, this);
        }

        objectHelper.forEach.call(this.data, function(value, key) {
            if(this.filter.indexOf(key) === -1) {
                return;
            }

            if (key === 'timeTable') {
                element.appendChild(this.generateTimeTable(key, value));
            } else if(this.data.coefficient !== undefined && key === 'type') {
                element.appendChild(this.generateDropdown(key, ['fullchannel', 'halfchannel'], value));
            } else {
                element.appendChild(this.generateInput(key, value));
            }
        }, this);

        return element;
    }
};

function SelectedMenu(loadedModel) {
    this.dataObjects = [];
    this.data        = [];
    this.container   = menuBuilder.div();
    this.inputs      = {};

    this.loadedModel = loadedModel;

    this.buttons;
}

SelectedMenu.prototype = {
    show: function() {
        this.container.style.display = 'block';
    },

    hide: function() {
        this.container.style.display = 'none';
    },

    refresh: function() {
        this.data.forEach(function(obj) {
            obj.refresh();
        });
    },

    updateFilter: function(filter) {
        this.data.forEach(function(obj) {
            obj.updateFilter(filter);
        });
    },

    loopData: function(callback, thisArg) {
        this.data.forEach(function(obj, key) {
            callback.call(this, obj, key);
        }, thisArg);
    },

    addData: function(filter, data) {
        if(this.dataObjects.indexOf(data) !== -1) {
            console.warn('Exists');
            console.warn(this.dataObjects, data);
            return;
        }

        this.dataObjects.push(data);
        this.data.push(new Data(this.loadedModel, filter, data));

        if(!this.buttons) {
            this.buttons = this.generateButtons(buttons);
            this.container.appendChild(this.buttons);
        }

        this.container.appendChild(this.data[this.data.length - 1].createMenu());
    },

    removeData: function(data) {
        var i = 0;
        this.dataObjects = this.dataObjects.filter(function(keptData, index) {
            if(keptData === data) {
                i = index;
                return false;
            }

            return true;
        });

        this.data[i].deleteEvents();
        var element = this.data[i].container;
        this.container.removeChild(element);

        this.data = this.data.slice(0, i).concat(this.data.slice(i+1));

        if(this.data.length === 0 && this.dataObjects.length === 0) {
            this.container.parentElement.removeChild(this.container);
        }
    },

    setDataFilter: function(dataFilter) {
        this.dataFilter = dataFilter;
    },

    generateButtons: function(list) {
        var containerDiv = menuBuilder.div();
        containerDiv.className = 'menu';

        var isModel = false;
        this.data.forEach(function(obj) {
            if(obj.data.maxIterations) {
                isModel = true;
            }
        });

        var that = this;
        list.forEach(function(button) {
            if(isModel && button.ignoreModelSettings === true) {
                return;
            }

            if(button.replacingObj) {
                containerDiv.appendChild(menuBuilder.button(button.header, function() {
                    button.callback(that.loadedModel, that.data);
                }));
            } else {
                /* No buttons are not replacing obj right now. There is one button. */
            }
        }, this);

        return containerDiv;
    }
};

var namespace = {
    Data:                 Data,
    SelectedMenu:         SelectedMenu,
    createAvatarSelector: createAvatarSelector,
    createAvatarButtons:  createAvatarButtons
};

module.exports = namespace;

},{"./../config.js":"config.js","./../menu_builder":"menu_builder/menu_builder.js","./../object-helper.js":"object-helper.js","./../settings":"settings/settings.js","./buttons.js":"selected_menu/buttons.js"}],"settings/menu.js":[function(require,module,exports){
'use strict';

var Immutable  = null,
    backendApi = require('./../api/backend_api.js'),
    modelling  = require('./modelling.js'),
    simulate   = require('./simulate.js'),
    windows    = require('./windows.js'),
    modelLayer = require('./../model_layer.js');

var objectHelper = require('./../object-helper.js');

var modeUpdate = function(loadedModel, savedModels) {
    var element = this;

    element.resetOptions();
    element.addOption('modelling', 'Modelling');
    element.addOption('simulate',  'Simulate');

    element.refreshList();
};

var modeCallback = function(loadedModel, savedModels) {
    var option = this.value;

    this.parent.toggle();
    switch(option) {
        case 'modelling':
            loadedModel.sidebar     = modelling;
            loadedModel.environment = 'modelling';
            break;
        case 'simulate':
            loadedModel.sidebar     = simulate;
            loadedModel.environment = 'simulate';
            break;
    }

    loadedModel.refresh = true;
    loadedModel.resetUI = true;

    if(!loadedModel.selected) {
        loadedModel.selected = loadedModel.settings;
    }

    loadedModel.propagate();
};

var projectUpdate = function(loadedModel, savedModels) {
    var element = this;

    element.resetOptions();
    element.addOption('new',    'New Model');
    element.addOption('save',   'Save Current');
    element.addOption('delete', 'Delete Current');

    backendApi('/models/all', function(response, error) {
        if(error) {
            console.error(error);
            throw new Error('projectUpdate: /models/all crashed');
        }

        objectHelper.forEach.call(
            savedModels.local,
            function(model) {
                element.addOption(model.id, model.settings.name);
            }
        );

        var models = response.response;
        models.forEach(function(model) {
            if(!savedModels.synced[model.id]) {
                savedModels.synced[model.id] = model.name;
            }
        });

        objectHelper.forEach.call(
            savedModels.synced,
            function(model, key) {
                if(typeof model === 'string') {
                    element.addOption(key, model);
                } else {
                    element.addOption(model.syncId, model.settings.name);
                }
            }
        );

        if(error) {
            element.refreshList();
            return;
        }

        element.refreshList();
    });
};

var projectCallback = function(loadedModel, savedModels) {
    var option      = this.value,
        that        = this,
        text        = this.text.match(/^(\s\*\s)?(.*)$/)[2];

    modelLayer = require('./../model_layer.js');
    var m;
    if(loadedModel.synced === true) {
        m = modelLayer.moveModel(loadedModel);
        savedModels.synced[loadedModel.syncId] = m;
    } else {
        m = modelLayer.moveModel(loadedModel);
        savedModels.local[loadedModel.id] = m;
    }

    this.parent.toggle();
    switch(option) {
        case 'new':
            var m = modelLayer.newModel();

            objectHelper.forEach.call(
                m,
                function(value, key) {
                    loadedModel[key] = value;
                }
            );

            savedModels.local[loadedModel.id] = m;

            that.parent.toggle();
            projectUpdate.call(this.parent, loadedModel, savedModels);
            break;
        case 'save':
            objectHelper.forEach.call(
                m,
                function(value, key) {
                    loadedModel[key] = value;
                }
            );

            modelLayer.saveModel(loadedModel, function() {
                projectUpdate.call(that.parent, loadedModel, savedModels);

                loadedModel.refresh = true;
                loadedModel.resetUI = true;
                loadedModel.propagate();
            });
            return;
            break;
        case 'delete':
            modelLayer.deleteModel(loadedModel, savedModels, function() {
                projectUpdate.call(that.parent, loadedModel, savedModels);
                loadedModel.refresh = true;
                loadedModel.resetUI = true;
                loadedModel.propagate();
            });
            return;
            break;
        case undefined:
            break;
        default:
            if(savedModels.local[option] === undefined || savedModels.local[option].settings.name !== text) {
                if(typeof savedModels.synced[option] === 'string') {
                    modelLayer.loadSyncModel(option, function(newState) {
                        if(typeof newState === 'number') {
                            loadedModel.syncId = newState;
                            loadedModel.id     = newState;

                            loadedModel.refresh = true;
                            loadedModel.resetUI = true;
                            loadedModel.propagate();
                            return;
                        }

                        loadedModel.nodeGui  = {};
                        loadedModel.nodeData = {};
                        loadedModel.propagate();

                        savedModels.synced[option] = newState;
                        objectHelper.forEach.call(
                            newState,
                            function(value, key) {
                                loadedModel[key] = value;
                            }
                        );

                        loadedModel.refresh = true;
                        loadedModel.propagate();
                    });
                } else {
                    loadedModel.nodeGui  = {};
                    loadedModel.nodeData = {};
                    loadedModel.propagate();

                    var savedModel = savedModels.synced[option];
                    objectHelper.forEach.call(
                        savedModel,
                        function(value, key) {
                            loadedModel[key] = value;
                        }
                    );

                    loadedModel.refresh = true;
                }
            } else {
                loadedModel.nodeGui  = {};
                loadedModel.nodeData = {};
                loadedModel.propagate();
                
                var savedModel = savedModels.local[option];
                objectHelper.forEach.call(
                    savedModel,
                    function(value, key) {
                        loadedModel[key] = value;
                    }
                );

                loadedModel.refresh = true;
            }
    }

    loadedModel.resetUI = true;
    loadedModel.propagate();

    return loadedModel;
};

var menu = [
    {
        header:   'Project',
        type:     'DROPDOWN',
        update:   projectUpdate,
        callback: projectCallback
    },

    {
        header:   'Mode',
        type:     'DROPDOWN',
        update:   modeUpdate,
        callback: modeCallback
    },

    windows
];

module.exports = menu;

},{"./../api/backend_api.js":"api/backend_api.js","./../model_layer.js":"model_layer.js","./../object-helper.js":"object-helper.js","./modelling.js":"settings/modelling.js","./simulate.js":"settings/simulate.js","./windows.js":"settings/windows.js"}],"settings/modelling.js":[function(require,module,exports){
'use strict';

var Immutable        = null,
    createNode       = require('../structures/create_node'),
    createOriginNode = require('../structures/create_origin'),
    createActorNode  = require('../structures/create_actor');

var model = [
/*     {
        header: 'Create Intermediate',
        callback: createNode
    }),

     {
        header: 'Create Origin',
        callback: createOriginNode
    }),

     {
        header: 'Create Actor',
        callback: createActorNode
    }),
*/
    {
        header:   'Actors',
        callback: createActorNode,
        type:     'LIST',
        images: [
            {src: 'img/avatars/executive_actor.png',   header: 'Executive actor'},
            {src: 'img/avatars/legislative_actor.png', header: 'Legislative actor'},
            {src: 'img/avatars/unofficial_actor.png',  header: 'Unofficial actor'}
        ]
    },

    {
        header:   'Policy Instruments',
        callback: createOriginNode,
        type:     'LIST',
        images: [
            {src: 'img/avatars/instrument_financial.png',        header: 'Financial instrument'},
            {src: 'img/avatars/instrument_fiscal.png',           header: 'Fiscal instrument'},
            {src: 'img/avatars/instrument_market.png',           header: 'Market instrument'},
            {src: 'img/avatars/instrument_regulatory.png',       header: 'Regulatory instrument'},
            {src: 'img/avatars/instrument_informational.png',    header: 'Informational instrument'},
            {src: 'img/avatars/instrument_capacitybuilding.png', header: 'Capacity-building instrument'},
            {src: 'img/avatars/instrument_cooperation.png',      header: 'Cooperation instrument'}
        ]
    },

    {
        header:   'External Factors',
        callback: createOriginNode,
        type:     'LIST',
        images: [
            {src: 'img/avatars/barriers_and_forces.png', header: 'Drivers and barriers'},
            {src: 'img/avatars/constraints.png',         header: 'External factors and constraints'},
            {src: 'img/avatars/social_change.png',       header: 'Social, demographic, and behavioural change'}
        ]
    },

    {
        header:   'Policy Impacts',
        callback: createNode,
        type:     'LIST',
        images: [
            {src: 'img/avatars/Impact_node1.png',  header: 'Impact of change'},
            {src: 'img/avatars/Impact_node2.png',  header: 'Impact of change'},
            {src: 'img/avatars/Impact_node3.png',  header: 'Impact of change'},
            {src: 'img/avatars/Impact_node4.png',  header: 'Impact of change'},
            {src: 'img/avatars/Impact_node5.png',  header: 'Impact of change'},
            {src: 'img/avatars/Impact_node6.png',  header: 'Impact of change'},
            {src: 'img/avatars/Impact_node7.png',  header: 'Impact of change'},
            {src: 'img/avatars/Impact_node8.png',  header: 'Impact of change'},
            {src: 'img/avatars/Impact_node9.png',  header: 'Impact of change'},
            {src: 'img/avatars/Impact_node10.png', header: 'Impact of change'},
            {src: 'img/avatars/Impact_node11.png', header: 'Impact of change'},
            {src: 'img/avatars/Impact_node12.png', header: 'Impact of change'}
        ]
    }

    /*{
        header: 'Policy Instruments',
        callback: createActorNode,
        type: 'LIST',
        images: [
            {
                src: 'img/avatars/barriers_and_forces.png'
            },
            {
                src: 'img/avatars/instrument_financial.png'
            },
            {
                src: 'img/avatars/instrument_regulatory.png'
            },
            {
                src: 'img/avatars/constraints.png'
            },
            {
                src: 'img/avatars/instrument_fiscal.png'
            },
            {
                src: 'img/avatars/social_change.png'
            }
        ]
    }),

    {
        header: 'Controllable actors',
        callback: createOriginNode,
        type: 'LIST',
        images: [
            {
                src: 'img/avatars/instrument_capacitybuilding.png'
            },
            {
                src: 'img/avatars/instrument_informational.png'
            },
            {
                src: 'img/avatars/instrument_cooperation.png'
            },
            {
                src: 'img/avatars/instrument_market.png'
            }
        ]
    })*/
];

module.exports = model;
},{"../structures/create_actor":"structures/create_actor.js","../structures/create_node":"structures/create_node.js","../structures/create_origin":"structures/create_origin.js"}],"settings/package.json":[function(require,module,exports){
module.exports={
    "name": "s4u_settings",
    "main": "./settings.js"
}
},{}],"settings/settings.js":[function(require,module,exports){
'use strict';

var modelling = require('./modelling.js'),
    menu      = require('./menu.js');

var data = {
    avatars: [
        {
            header: 'Policy Instruments',
            type: 'actor',
            images: [
                {
                    src: 'img/avatars/barriers_and_forces.png'
                },
                {
                    src: 'img/avatars/instrument_financial.png'
                },
                {
                    src: 'img/avatars/instrument_regulatory.png'
                },
                {
                    src: 'img/avatars/constraints.png'
                },
                {
                    src: 'img/avatars/instrument_fiscal.png'
                },
                {
                    src: 'img/avatars/social_change.png'
                },
                {
                    src: 'img/avatars/instrument_capacitybuilding.png'
                },
                {
                    src: 'img/avatars/instrument_informational.png'
                },
                {
                    src: 'img/avatars/instrument_cooperation.png'
                },
                {
                    src: 'img/avatars/instrument_market.png'
                }
            ]
        },
        {
            header: 'Controlling actors',
            type: 'origin',
            images: [
                {
                    src: 'img/avatars/barriers_and_forces.png'
                },
                {
                    src: 'img/avatars/instrument_financial.png'
                },
                {
                    src: 'img/avatars/instrument_regulatory.png'
                },
                {
                    src: 'img/avatars/constraints.png'
                },
                {
                    src: 'img/avatars/instrument_fiscal.png'
                },
                {
                    src: 'img/avatars/social_change.png'
                },
                {
                    src: 'img/avatars/instrument_capacitybuilding.png'
                },
                {
                    src: 'img/avatars/instrument_informational.png'
                },
                {
                    src: 'img/avatars/instrument_cooperation.png'
                },
                {
                    src: 'img/avatars/instrument_market.png'
                }
            ]
        }
    ],

    sidebar: modelling,
    menu:    menu
};

module.exports = data;

},{"./menu.js":"settings/menu.js","./modelling.js":"settings/modelling.js"}],"settings/simulate.js":[function(require,module,exports){
'use strict';

var Immutable       = null,
    breakout        = require('./../breakout.js'),
    backendApi      = require('./../api/backend_api.js'),
    objectHelper    = require('./../object-helper.js'),
    notificationBar = require('./../notification_bar');

var simulate = [
    {
        header: 'Simulate',
        type:   'BUTTON',
        ajax:   true,
        callback: function(loadedModel) {
            var data = {
                timestep: loadedModel.loadedScenario.maxIterations,
                nodes:    breakout.nodes(loadedModel),
                links:    breakout.links(loadedModel),
                scenario: loadedModel.loadedScenario.toJson()
            };

            objectHelper.forEach.call(
                loadedModel.nodeData,
                function(node) {
                    node.simulateChange = [];
                }
            );

            backendApi('/models/simulate', data, function(response, err) {
                if(err) {
                    console.error(err);
                    console.error(response);
                    notificationBar.notify(response.response.message);
                    return;
                }

                var timeSteps = response.response;
                var nodeData  = loadedModel.nodeData;
                timeSteps.forEach(function(timeStep) {
                    timeStep.forEach(function(node) {
                        var currentNode = nodeData[node.id];
                        currentNode.simulateChange.push(node.relativeChange);
                    });
                });

                loadedModel.refresh  = true;
                loadedModel.settings = loadedModel.settings;
                loadedModel.propagate();
            });
        }
    },

    {
        header: 'Linegraph',
        type:   'BUTTON',
        ajax:   true,
        callback: function(loadedModel) {
            var settings       = loadedModel.settings;
            settings.linegraph = !settings.linegraph

            loadedModel.refresh = true;
            loadedModel.propagate();
        }
    },

    {
        header: 'Time step T',
        type:   'DROPDOWN',
        values: [
            'Week',
            'Month',
            'Year'
        ],

        setDefault: function(model, values) {
            var selected = model.loadedScenario.measurement;
            for(var i = 0; i < values.length; i++) {
                if(values[i] === selected) {
                    return i;
                }
            }

            return 0;
        },

        callback: function(model, value) {
            model.loadedScenario.measurement = value;
        }
    },

    {
        header: 'Time step N',
        type:   'SLIDER',

        defaultValue: function(model) {
            return model.loadedScenario.timeStepN;
        },

        range: function(model) {
            return [0, model.loadedScenario.maxIterations];
        },

        onSlide: function(model, value) {
            model.loadedScenario.timeStepN = value;

            model.refresh = true;
            model.propagate();
        },

        callback: function(model, value) {
            model.loadedScenario.timeStepN = value;
        }
    },

    {
        header: 'Max iterations',
        type:   'INPUT',

        defaultValue: function(model) {
            return model.loadedScenario.maxIterations;
        },

        onChange: function(model, value) {
            model.loadedScenario.maxIterations = parseInt(value);
        }
    }
];

module.exports = simulate;

},{"./../api/backend_api.js":"api/backend_api.js","./../breakout.js":"breakout.js","./../notification_bar":"notification_bar/notification_bar.js","./../object-helper.js":"object-helper.js"}],"settings/windows.js":[function(require,module,exports){
'use strict';

var ScenarioEditor = require('./../scenario').ScenarioEditor;

function update(loadedModel, savedModels) {
    var element = this;

    element.resetOptions();
    element.addOption('scenario', 'Scenario Editor');

    element.refreshList();
}

function callback(loadedModel, savedModels) {
    var option = this.value;

    this.parent.toggle();

    switch(option.toUpperCase()) {
        case 'SCENARIO':
            var scenarioEditor = new ScenarioEditor(loadedModel);
            /*var scenarioEditor = floatingWindow.createWindow(20, 20, 440, 400);
            var scenarioContainer = createScenarioEditor(loadedModel, savedModels);
            scenarioEditor.appendChild(scenarioContainer);
            document.body.appendChild(scenarioEditor);*/
            break;
    }
}

module.exports = {
    header:   'Windows',
    type:     'DROPDOWN',
    update:   update,
    callback: callback
};

},{"./../scenario":"scenario/scenario.js"}],"strict_curry.js":[function(require,module,exports){
'use strict';

// a function to generate a function which has predefined parameters
function strictCurry(fn) {
    // arguments are all arguments used to call the strictCurry-function
    // it's not an array, so we can't splice it
    // but by using apply we can use the Array's splice-function
    // to get all arguments after the first one (which is the function to be curried)
    var predefinedArguments = Array.prototype.splice.call(arguments, 1);

    // the curried function!
    return function() {
        // we must first get the additional arguments, again we have to splice them
        // though from zero this time, since we want to use all inserted arguments
        var newArguments = Array.prototype.splice.call(arguments, 0);

        // the predefined arguments together with the new ones
        var allArguments = predefinedArguments.concat(newArguments);

        // we call the function with all the arguments
        return fn.apply(this, allArguments);
    };
}

module.exports = strictCurry;
},{}],"structures/create_actor.js":[function(require,module,exports){
'use strict';

var Immutable  = null,
    createNode = require('./create_node');

function generateHexColor() {
    return Math.round(Math.random() * 255).toString(16);
}

function generateColor() {
    return '#' + generateHexColor() + generateHexColor() + generateHexColor();
}

module.exports = function createActorNode(model, data, gui) {
    gui.color = generateColor();
    return createNode(model, data, gui, 'actor');
};
},{"./create_node":"structures/create_node.js"}],"structures/create_link.js":[function(require,module,exports){
'use strict';

var Immutable = null;

module.exports = function createLink(model, source, destination, type) {
    return {
        id:          model.generateId(),
        node1:       source,
        node2:       destination,
        coefficient: 1,
        type:        type || 'fullchannel',
        timelag:     0,
        threshold:   0,
        width:       8
    };
};

},{}],"structures/create_node.js":[function(require,module,exports){
'use strict';

var objectHelper = require('./../object-helper.js');

module.exports = function createNode(model, data, gui, type) {
    var id = model.generateId();

    var nodeData = {
        id:              id,
        syncId:          false,
        value:           0,
        relativeChange:  0,
        simulateChange:  [],
        type:            type || 'intermediate',
        initialValue:    0,
        measurementUnit: '',
        description:     ''
    };

    var nodeGui = {
        id:     id,
        x:      400,
        y:      100,
        radius: 45
    };

    if(data !== undefined) {
        nodeData = objectHelper.merge.call(nodeData, data);
    }

    if(gui !== undefined) {
        nodeGui = objectHelper.merge.call(nodeGui, gui);
    }

    model.nodeData[id] = nodeData;
    model.nodeGui[id]  = nodeGui;

    if(nodeData.timeTable) {
        objectHelper.forEach.call(
            model.scenarios,
            function(scenario) {
                scenario.refresh(model);
            }
        );
    }

    model.resetUI = true;
    model.refresh = true;
    model.propagate();

    return model;
};

},{"./../object-helper.js":"object-helper.js"}],"structures/create_origin.js":[function(require,module,exports){
'use strict';

var Immutable  = null,
    createNode = require('./create_node');

module.exports = function createOriginNode(model, data, gui) {
    if(!data) {
        data = {};
    }
    
    data.timeTable = {
        0: 0,
        1: 10,
        2: -4
    };
    
    return createNode(model, data, gui, 'origin');
};
},{"./create_node":"structures/create_node.js"}],"ui/package.json":[function(require,module,exports){
module.exports={
    "name": "s4u_ui",
    "main": "./ui.js"
}
},{}],"ui/sidebar.js":[function(require,module,exports){
'use strict';

var selectedMenu = require('./../selected_menu'),
    menuBuilder  = require('./../menu_builder');

function Sidebar(sidebarData, loadedModel) {
    this.container = menuBuilder.div('menu');
    this.data = sidebarData;

    this.loadedModel = loadedModel;

    this.lists     = [];
    this.buttons   = [];
    this.dropdowns = [];
    this.sliders   = [];
    this.inputs    = [];
}

Sidebar.prototype = {
    deleteEvents: function() {
        this.lists.forEach(function(list) {
            list.deleteEvents();
        });
    },

    createList: function(data) {
        var that = this;
        var label = menuBuilder.label(data.header);
        if(data.images) {
            var list = selectedMenu.createAvatarButtons('avatar', null, function(key, value) {
                data.callback(that.loadedModel, {name: key}, {avatar: value});
            }, data.images);

            this.lists.push(list);

            this.container.appendChild(label);
            this.container.appendChild(list);
        }
    },

    createButton: function(data) {
        var that = this;
        var button = menuBuilder.button(data.header, function() {
            data.callback(that.loadedModel);
        });

        this.container.appendChild(button);
    },

    createDropdown: function(data) {
        var label    = menuBuilder.label(data.header);
        var that     = this;
        var dropdown = menuBuilder.select(data.header, function(val, evt) {
            data.callback(that.loadedModel, this.value);
        });

        var defaultIndex = data.setDefault(this.loadedModel, data.values);
        data.values.forEach(function(value, index) {
            //console.log(defaultValue, value);
            var option = menuBuilder.option(value, value);
            if(defaultIndex === index) {
                option.selected = 'selected';
            }

            dropdown.appendChild(option);
        });

        this.container.appendChild(dropdown);
    },

    createSlider: function(data) {
        var that = this;

        var range        = data.range(this.loadedModel);
        var defaultValue = data.defaultValue(this.loadedModel);

        var onSlide = function(value) {
            if(data.onSlide) {
                data.onSlide(that.loadedModel, value);
            }
        };

        var callback = function(val) {
            data.callback(that.loadedModel, val);
        };

        var slider = menuBuilder.slider(defaultValue, range[0], range[1], callback, onSlide);

        this.container.appendChild(menuBuilder.label(data.header));
        this.container.appendChild(slider);
    },

    createInput: function(data) {
        var that = this;

        var defaultValue = data.defaultValue(this.loadedModel);
        var onChange     = data.onChange;

        var label = menuBuilder.label(data.header);
        var input = menuBuilder.input('not-used', defaultValue, function(input, iteration) {
            onChange(that.loadedModel, iteration);
        });

        this.container.appendChild(label);
        this.container.appendChild(input);
    },

    createMenu: function(loadedModel) {
        while(this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }

        this.data.forEach(function(data) {
            switch(data.type.toUpperCase()) {
                case 'LIST':
                    this.lists.push(data);
                    this.createList(data);
                    break;

                case 'BUTTON':
                    this.buttons.push(data);
                    this.createButton(data);
                    break;
                    
                case 'DROPDOWN':
                    this.dropdowns.push(data);
                    this.createDropdown(data);
                    break;
                    
                case 'SLIDER':
                    this.sliders.push(data);
                    this.createSlider(data);
                    break;
                case 'INPUT':
                    this.inputs.push(data);
                    this.createInput(data);
            }
            
        }, this);
    }
};

module.exports = Sidebar;
},{"./../menu_builder":"menu_builder/menu_builder.js","./../selected_menu":"selected_menu/selected_menu.js"}],"ui/sidebar_manager.js":[function(require,module,exports){
'use strict';

var menuBuilder = require('./../menu_builder');
var selectedMenu = require('./../selected_menu');
var SelectedMenu = selectedMenu.SelectedMenu;

var Sidebar = require('./sidebar');

function SidebarManager(container) {
    this.sidebars        = [];
    this.sidebarElements = [];

    this.container = container;

    this.sidebarContainer      = menuBuilder.div('menu');
    this.selectedMenuContainer = menuBuilder.div('menu');

    this.container.appendChild(this.sidebarContainer);
    this.container.appendChild(this.selectedMenuContainer);

    this.currentSidebar;
    this.selectedMenu;

    this.selectedData = [];
    this.selected     = {};
}

SidebarManager.prototype = {
    addSidebar: function(sidebar, loadedModel) {
        if(this.gotSidebar(sidebar)) {
            if(this.currentSidebar === sidebar) {
                this.currentSidebar.refresh(loadedModel);
                return;
            }

            this.setSidebar(sidebar, loadedModel);
            return;
        }

        this.sidebars.push(sidebar);
        this.sidebarElements.push(new Sidebar(sidebar, loadedModel));

        this.setSidebar(sidebar, loadedModel);
    },

    setSidebar: function(sidebar, loadedModel) {
        var element = this.gotSidebar(sidebar);
        if(!element) {
            return;
        }

        this.currentSidebar = element;
        this.currentSidebar.createMenu(loadedModel);

        while(this.sidebarContainer.firstChild) {
            this.sidebarContainer.removeChild(this.sidebarContainer.firstChild);
        }

        this.sidebarContainer.appendChild(this.currentSidebar.container);
    },

    gotSidebar: function(sidebar) {
        var index = this.sidebars.indexOf(sidebar);
        return index !== -1 ? this.sidebarElements[index] : false;
    },

    setEnvironment: function(environment) {
        this.environment = environment;
    },

    setLoadedModel: function(loadedModel) {
        this.loadedModel = loadedModel;
    },

    linkModellingFilter: ['type', 'threshold', 'coefficient', 'timelag'],
    linkSimulateFilter:  ['type', 'threshold', 'coefficient', 'timelag'],

    dataModellingFilter: ['timeTable', 'name', 'description'],
    dataSimulateFilter:  ['timeTable'],

    modelModellingFilter: ['name'],
    modelSimulateFilter:  ['maxIterations'],

    getLinkFilter: function() {
        switch(this.environment) {
            case 'modelling':
                return SidebarManager.prototype.linkModellingFilter;
            case 'simulate':
                return SidebarManager.prototype.linkSimulateFilter;
        }
        
    },

    getModelFilter: function() {
        switch(this.environment) {
            case 'modelling':
                return SidebarManager.prototype.modelModellingFilter;
            case 'simulate':
                return SidebarManager.prototype.modelSimulateFilter;
        }
    },

    getDataFilter: function() {
        switch(this.environment) {
            case 'modelling':
                return SidebarManager.prototype.dataModellingFilter;
            case 'simulate':
                return SidebarManager.prototype.dataSimulateFilter;
        }
    },

    getFilter: function(data) {
        if(data.coefficient !== undefined) {
            return this.getLinkFilter();
        }

        if(data.x !== undefined && data.y !== undefined || data.simulateChange !== undefined) {
            return this.getDataFilter();
        }

        return this.getModelFilter();
    },

    setSelectedMenu: function() {
        var selectedData       = [],
            previouslySelected = [],
            notSelected        = [],
            stillSelected      = [];

        for(var i = 0; i < arguments.length; i++) {
            var data = arguments[i];
            selectedData.push(data);
        }

        previouslySelected = this.selectedData.filter(function(data) {
            if(selectedData.indexOf(data) !== -1) {
                return false;
            }

            return true;
        });

        notSelected = selectedData.filter(function(data) {
            if(this.selectedData.indexOf(data) !== -1) {
                stillSelected.push(data);
                return false;
            }

            return true;
        }, this);

        previouslySelected.forEach(function(data) {
            var selectedMenu = this.selected[data.id];
            if(!selectedMenu) {
                return;
            }

            selectedMenu.removeData(data);
            if(selectedMenu.data.length === 0) {
                delete this.selected[data.id];
            }
        }, this);

        notSelected.forEach(function(data) {
            if(data === undefined) {
                console.warn(selectedData);
                console.warn(previouslySelected);
                console.warn(notSelected);
                console.warn(this.selectedData);
                console.warn('NOT SELECTED?', data);
            }
            
            var selectedMenu = this.selected[data.id];
            if(!selectedMenu) {
                this.selected[data.id] = new SelectedMenu(this.loadedModel);
                selectedMenu = this.selected[data.id];
                this.selectedMenuContainer.appendChild(selectedMenu.container);
            }

            selectedMenu.addData(this.getFilter(data), data);
        }, this);

        var updated = [];
        stillSelected.forEach(function(data) {
            if(updated.indexOf(data.id) !== -1) {
                return;
            }

            var selectedMenu = this.selected[data.id];

            selectedMenu.loopData(function(dataObj) {
                dataObj.updateFilter(this.getFilter(dataObj.data));
            }, this);

            updated.push(data.id);
        }, this);

        this.selectedData = selectedData;
    }
};

module.exports = SidebarManager;
},{"./../menu_builder":"menu_builder/menu_builder.js","./../selected_menu":"selected_menu/selected_menu.js","./sidebar":"ui/sidebar.js"}],"ui/ui.js":[function(require,module,exports){
'use strict';

/*
** Author:      Robin Swenson
** Description: Namespace to setup the interface.
*/

/*
** Dependencies
*/

/* The CONFIG object has its config loaded in main.js */
var CONFIG       = require('./../config.js'),
    menuBuilder  = require('./../menu_builder'),
    selectedMenu = require('./../selected_menu/selected_menu'),
    Immutable    = null;

function createDropdown(element, select, refresh, changeCallbacks, updateModelCallback) {
    var dropdownElement = document.createElement('select');
    var values = element.values;

    var selected = select(changeCallbacks.loadedModel(), element.values);

    values.forEach(function(value, index) {
        var option = document.createElement('option');
        option.innerHTML = value;
        option.value     = value;

        if(selected === index) {
            option.selected = true;
        }

        dropdownElement.appendChild(option);
    });

    dropdownElement.addEventListener('change', function(e) {
        updateModelCallback(element.callback(changeCallbacks.loadedModel(), null, dropdownElement.value));
    });

    return dropdownElement;
}

function createButton(element, refresh, changeCallbacks, updateModelCallback) {
    var buttonElement;
    if(element.ajax === true) {
        buttonElement = menuBuilder.button(element.header, function() {
            element.callback(refresh, changeCallbacks);
        });
    } else {
        buttonElement = menuBuilder.button(element.header, function() {
            updateModelCallback(element.callback(changeCallbacks.loadedModel()));
        });
    }

    return buttonElement;
}

function createSlider(element, changeCallbacks, updateModelCallback) {
    var inputElement;
    var setupModel = changeCallbacks.loadedModel();
    var defaultValue = element.defaultValue(setupModel);
    var ranges = element.range(setupModel);

    var container = menuBuilder.div();
    container.className = 'mb-sidebar-slider';

    var valueSpan = menuBuilder.span();
    valueSpan.innerHTML = defaultValue;
    valueSpan.className = 'value';

    var maxValueSpan = menuBuilder.span();
    maxValueSpan.innerHTML = ranges[1];
    maxValueSpan.className = 'max-value';

    if(element.ajax === true) {
        inputElement = menuBuilder.slider(defaultValue, ranges[0], ranges[1], function(value) {
            element.callback(parseInt(this.value), changeCallbacks);
        });
    } else {
        inputElement = menuBuilder.slider(defaultValue, ranges[0], ranges[1], function(value) {
            var model = changeCallbacks.loadedModel();
            valueSpan.innerHTML = this.value;
            updateModelCallback(element.callback(parseInt(this.value), model));
        }, function(value) {
            valueSpan.innerHTML = this.value;
        });
    }

    container.appendChild(valueSpan);
    container.appendChild(maxValueSpan);

    var clearer         = menuBuilder.div();
    clearer.style.clear = 'right';

    container.appendChild(clearer);
    container.appendChild(inputElement);

    return container;
}

function MenuItem(data, loadedModel, savedModels) {
    this.data = data;

    this.header   = data.header;
    this.type     = data.type;
    this.callback = data.callback;

    if(data.update) {
        this.update = data.update;
    }

    this.container = menuBuilder.div();
    this.refresh(loadedModel, savedModels);
}

MenuItem.prototype = {
    deleteEvents: function() {
        if(!this.button) {
            return;
        }

        this.button.deleteEvents();
    },

    refresh: function(loadedModel, savedModels) {
        this.deleteEvents();
        while(this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }

        this.generateItem(loadedModel, savedModels);
    },

    generateItem: function(loadedModel, savedModels) {
        this.deleteEvents();
        var button;

        var that = this;
        if(this.callback !== undefined && this.update !== undefined) {
            var dd = menuBuilder.dropdown(
                this.header,
                function onClick() {
                    that.callback.call(
                        this,
                        loadedModel,
                        savedModels
                    );
                },
                
                function update() {
                    that.update.call(
                        this,
                        loadedModel,
                        savedModels
                    );
                }
            );

            button              = dd.element;
            button.deleteEvents = dd.deleteEvents;
        } else if (this.callback !== undefined) {
            button = menuBuilder.button(this.header, function(evt) {
                that.callback();
                //updateModelCallback(menu.callback(UIData));
            });
        }

        if(button === null) {
            throw new Error('Invalid button type.');
            return;
        }

        this.button = button;
        this.container.appendChild(button);
    }
};

function Menu(container, data) {
    this.container = menuBuilder.div('menu');
    container.appendChild(this.container);
    this.data      = data;

    this.menuItems = [];
}

Menu.prototype = {
    deleteEvents: function() {
        this.menuItems.forEach(function(item) {
            item.deleteEvents();
        });
    },

    resetMenu: function(loadedModel, savedModels) {
        this.deleteEvents();
        while(this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }

        this.createMenu(loadedModel, savedModels);
    },

    createMenu: function(loadedModel, savedModels) {
        this.data.forEach(function(menuItem) {
            var item = new MenuItem(menuItem, loadedModel, savedModels);
            this.menuItems.push(item);

            this.container.appendChild(item.container);
        }, this);
    }
};

module.exports = {
    Sidebar:        require('./sidebar'),
    SidebarManager: require('./sidebar_manager'),
    Menu:           Menu
    /*UIRefresh:      UIRefresh,
    menuRefresh:    menuRefresh,
    sidebarRefresh: sidebarRefresh*/
};

},{"./../config.js":"config.js","./../menu_builder":"menu_builder/menu_builder.js","./../selected_menu/selected_menu":"selected_menu/selected_menu.js","./sidebar":"ui/sidebar.js","./sidebar_manager":"ui/sidebar_manager.js"}],"util/generate_link.js":[function(require,module,exports){
'use strict';

var hitTest      = require('./../collisions.js').hitTest,
    createLink   = require('../structures/create_link'),
    linker       = require('./../linker.js'),
    objectHelper = require('./../object-helper.js');

module.exports = function(loadedModel) {
    var nodeData = loadedModel.nodeData,
        nodeGui  = loadedModel.nodeGui,
        links    = loadedModel.links;

    var linkingNodes = objectHelper.filter.call(
        nodeGui,
        function(node) {
            return node.linking === true;
        }
    );

    objectHelper.forEach.call(
        linkingNodes,
        function(node) {
            var hit = objectHelper.filter.call(
                nodeGui,
                function(maybeCollidingNode) {
                    return maybeCollidingNode.linking !== true && hitTest(maybeCollidingNode, linker(node));
                }
            );

            objectHelper.forEach.call(
                hit,
                function(collided) {
                    var nodeLinks = node.links;
                    if(nodeLinks === undefined) {
                        node.links = [];
                    }

                    var collidedLinks = collided.links;
                    if(collidedLinks === undefined) {
                        collided.links = [];
                    }

                    var nodeId     = node.id,
                        collidedId = collided.id;

                    var sourceData = nodeData[node.id];
                    var destData   = nodeData[collidedId];
                    if(sourceData.type.toUpperCase() === 'ACTOR') {
                        if(destData.type.toUpperCase() !== 'ORIGIN') {
                            return;
                        }

                        loadedModel.resetUI = true;
                    }

                    var sourceGui = nodeGui[nodeId];
                    for(var i = 0; i < sourceGui.links.length; i++) {
                        var link = links[sourceGui.links[i]];
                        if((link.node1 === nodeId && link.node2 === collidedId)
                            || (link.node1 === collidedId && link.node2 === nodeId)) {
                            return;
                        }
                    }

                    var newLink       = createLink(loadedModel, nodeId, collidedId);
                    links[newLink.id] = newLink;

                    nodeGui[nodeId].links.push(newLink.id);
                    nodeGui[collidedId].links.push(newLink.id);
                }
            );
        }
    );
};


},{"../structures/create_link":"structures/create_link.js","./../collisions.js":"collisions.js","./../linker.js":"linker.js","./../object-helper.js":"object-helper.js"}]},{},["main.js"]);
