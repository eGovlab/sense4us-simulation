require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

// rawAsap provides everything we need except exception management.
var rawAsap = require("./raw");
// RawTasks are recycled to reduce GC churn.
var freeTasks = [];
// We queue errors to ensure they are thrown in right order (FIFO).
// Array-as-queue is good enough here, since we are just dealing with exceptions.
var pendingErrors = [];
var requestErrorThrow = rawAsap.makeRequestCallFromTimer(throwFirstError);

function throwFirstError() {
    if (pendingErrors.length) {
        throw pendingErrors.shift();
    }
}

/**
 * Calls a task as soon as possible after returning, in its own event, with priority
 * over other events like animation, reflow, and repaint. An error thrown from an
 * event will not interrupt, nor even substantially slow down the processing of
 * other events, but will be rather postponed to a lower priority event.
 * @param {{call}} task A callable object, typically a function that takes no
 * arguments.
 */
module.exports = asap;
function asap(task) {
    var rawTask;
    if (freeTasks.length) {
        rawTask = freeTasks.pop();
    } else {
        rawTask = new RawTask();
    }
    rawTask.task = task;
    rawAsap(rawTask);
}

// We wrap tasks with recyclable task objects.  A task object implements
// `call`, just like a function.
function RawTask() {
    this.task = null;
}

// The sole purpose of wrapping the task is to catch the exception and recycle
// the task object after its single use.
RawTask.prototype.call = function () {
    try {
        this.task.call();
    } catch (error) {
        if (asap.onerror) {
            // This hook exists purely for testing purposes.
            // Its name will be periodically randomized to break any code that
            // depends on its existence.
            asap.onerror(error);
        } else {
            // In a web browser, exceptions are not fatal. However, to avoid
            // slowing down the queue of pending tasks, we rethrow the error in a
            // lower priority turn.
            pendingErrors.push(error);
            requestErrorThrow();
        }
    } finally {
        this.task = null;
        freeTasks[freeTasks.length] = this;
    }
};

},{"./raw":2}],2:[function(require,module,exports){
(function (global){
"use strict";

// Use the fastest means possible to execute a task in its own turn, with
// priority over other events including IO, animation, reflow, and redraw
// events in browsers.
//
// An exception thrown by a task will permanently interrupt the processing of
// subsequent tasks. The higher level `asap` function ensures that if an
// exception is thrown by a task, that the task queue will continue flushing as
// soon as possible, but if you use `rawAsap` directly, you are responsible to
// either ensure that no exceptions are thrown from your task, or to manually
// call `rawAsap.requestFlush` if an exception is thrown.
module.exports = rawAsap;
function rawAsap(task) {
    if (!queue.length) {
        requestFlush();
        flushing = true;
    }
    // Equivalent to push, but avoids a function call.
    queue[queue.length] = task;
}

var queue = [];
// Once a flush has been requested, no further calls to `requestFlush` are
// necessary until the next `flush` completes.
var flushing = false;
// `requestFlush` is an implementation-specific method that attempts to kick
// off a `flush` event as quickly as possible. `flush` will attempt to exhaust
// the event queue before yielding to the browser's own event loop.
var requestFlush;
// The position of the next task to execute in the task queue. This is
// preserved between calls to `flush` so that it can be resumed if
// a task throws an exception.
var index = 0;
// If a task schedules additional tasks recursively, the task queue can grow
// unbounded. To prevent memory exhaustion, the task queue will periodically
// truncate already-completed tasks.
var capacity = 1024;

// The flush function processes all tasks that have been scheduled with
// `rawAsap` unless and until one of those tasks throws an exception.
// If a task throws an exception, `flush` ensures that its state will remain
// consistent and will resume where it left off when called again.
// However, `flush` does not make any arrangements to be called again if an
// exception is thrown.
function flush() {
    while (index < queue.length) {
        var currentIndex = index;
        // Advance the index before calling the task. This ensures that we will
        // begin flushing on the next task the task throws an error.
        index = index + 1;
        queue[currentIndex].call();
        // Prevent leaking memory for long chains of recursive calls to `asap`.
        // If we call `asap` within tasks scheduled by `asap`, the queue will
        // grow, but to avoid an O(n) walk for every task we execute, we don't
        // shift tasks off the queue after they have been executed.
        // Instead, we periodically shift 1024 tasks off the queue.
        if (index > capacity) {
            // Manually shift all values starting at the index back to the
            // beginning of the queue.
            for (var scan = 0, newLength = queue.length - index; scan < newLength; scan++) {
                queue[scan] = queue[scan + index];
            }
            queue.length -= index;
            index = 0;
        }
    }
    queue.length = 0;
    index = 0;
    flushing = false;
}

// `requestFlush` is implemented using a strategy based on data collected from
// every available SauceLabs Selenium web driver worker at time of writing.
// https://docs.google.com/spreadsheets/d/1mG-5UYGup5qxGdEMWkhP6BWCz053NUb2E1QoUTU16uA/edit#gid=783724593

// Safari 6 and 6.1 for desktop, iPad, and iPhone are the only browsers that
// have WebKitMutationObserver but not un-prefixed MutationObserver.
// Must use `global` instead of `window` to work in both frames and web
// workers. `global` is a provision of Browserify, Mr, Mrs, or Mop.
var BrowserMutationObserver = global.MutationObserver || global.WebKitMutationObserver;

// MutationObservers are desirable because they have high priority and work
// reliably everywhere they are implemented.
// They are implemented in all modern browsers.
//
// - Android 4-4.3
// - Chrome 26-34
// - Firefox 14-29
// - Internet Explorer 11
// - iPad Safari 6-7.1
// - iPhone Safari 7-7.1
// - Safari 6-7
if (typeof BrowserMutationObserver === "function") {
    requestFlush = makeRequestCallFromMutationObserver(flush);

// MessageChannels are desirable because they give direct access to the HTML
// task queue, are implemented in Internet Explorer 10, Safari 5.0-1, and Opera
// 11-12, and in web workers in many engines.
// Although message channels yield to any queued rendering and IO tasks, they
// would be better than imposing the 4ms delay of timers.
// However, they do not work reliably in Internet Explorer or Safari.

// Internet Explorer 10 is the only browser that has setImmediate but does
// not have MutationObservers.
// Although setImmediate yields to the browser's renderer, it would be
// preferrable to falling back to setTimeout since it does not have
// the minimum 4ms penalty.
// Unfortunately there appears to be a bug in Internet Explorer 10 Mobile (and
// Desktop to a lesser extent) that renders both setImmediate and
// MessageChannel useless for the purposes of ASAP.
// https://github.com/kriskowal/q/issues/396

// Timers are implemented universally.
// We fall back to timers in workers in most engines, and in foreground
// contexts in the following browsers.
// However, note that even this simple case requires nuances to operate in a
// broad spectrum of browsers.
//
// - Firefox 3-13
// - Internet Explorer 6-9
// - iPad Safari 4.3
// - Lynx 2.8.7
} else {
    requestFlush = makeRequestCallFromTimer(flush);
}

// `requestFlush` requests that the high priority event queue be flushed as
// soon as possible.
// This is useful to prevent an error thrown in a task from stalling the event
// queue if the exception handled by Node.js’s
// `process.on("uncaughtException")` or by a domain.
rawAsap.requestFlush = requestFlush;

// To request a high priority event, we induce a mutation observer by toggling
// the text of a text node between "1" and "-1".
function makeRequestCallFromMutationObserver(callback) {
    var toggle = 1;
    var observer = new BrowserMutationObserver(callback);
    var node = document.createTextNode("");
    observer.observe(node, {characterData: true});
    return function requestCall() {
        toggle = -toggle;
        node.data = toggle;
    };
}

// The message channel technique was discovered by Malte Ubl and was the
// original foundation for this library.
// http://www.nonblocking.io/2011/06/windownexttick.html

// Safari 6.0.5 (at least) intermittently fails to create message ports on a
// page's first load. Thankfully, this version of Safari supports
// MutationObservers, so we don't need to fall back in that case.

// function makeRequestCallFromMessageChannel(callback) {
//     var channel = new MessageChannel();
//     channel.port1.onmessage = callback;
//     return function requestCall() {
//         channel.port2.postMessage(0);
//     };
// }

// For reasons explained above, we are also unable to use `setImmediate`
// under any circumstances.
// Even if we were, there is another bug in Internet Explorer 10.
// It is not sufficient to assign `setImmediate` to `requestFlush` because
// `setImmediate` must be called *by name* and therefore must be wrapped in a
// closure.
// Never forget.

// function makeRequestCallFromSetImmediate(callback) {
//     return function requestCall() {
//         setImmediate(callback);
//     };
// }

// Safari 6.0 has a problem where timers will get lost while the user is
// scrolling. This problem does not impact ASAP because Safari 6.0 supports
// mutation observers, so that implementation is used instead.
// However, if we ever elect to use timers in Safari, the prevalent work-around
// is to add a scroll event listener that calls for a flush.

// `setTimeout` does not call the passed callback if the delay is less than
// approximately 7 in web workers in Firefox 8 through 18, and sometimes not
// even then.

function makeRequestCallFromTimer(callback) {
    return function requestCall() {
        // We dispatch a timeout with a specified delay of 0 for engines that
        // can reliably accommodate that request. This will usually be snapped
        // to a 4 milisecond delay, but once we're flushing, there's no delay
        // between events.
        var timeoutHandle = setTimeout(handleTimer, 0);
        // However, since this timer gets frequently dropped in Firefox
        // workers, we enlist an interval handle that will try to fire
        // an event 20 times per second until it succeeds.
        var intervalHandle = setInterval(handleTimer, 50);

        function handleTimer() {
            // Whichever timer succeeds will cancel both timers and
            // execute the callback.
            clearTimeout(timeoutHandle);
            clearInterval(intervalHandle);
            callback();
        }
    };
}

// This is for `asap.js` only.
// Its name will be periodically randomized to break any code that depends on
// its existence.
rawAsap.makeRequestCallFromTimer = makeRequestCallFromTimer;

// ASAP was originally a nextTick shim included in Q. This was factored out
// into this ASAP package. It was later adapted to RSVP which made further
// amendments. These decisions, particularly to marginalize MessageChannel and
// to capture the MutationObserver implementation in a closure, were integrated
// back into ASAP proper.
// https://github.com/tildeio/rsvp.js/blob/cddf7232546a9cf858524b75cde6f9edf72620a7/lib/rsvp/asap.js

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],3:[function(require,module,exports){
/**
 * @namespace Chart
 */
var Chart = require('./core/core.js')();

require('./core/core.helpers')(Chart);
require('./core/core.element')(Chart);
require('./core/core.animation')(Chart);
require('./core/core.controller')(Chart);
require('./core/core.datasetController')(Chart);
require('./core/core.layoutService')(Chart);
require('./core/core.scaleService')(Chart);
require('./core/core.plugin.js')(Chart);
require('./core/core.scale')(Chart);
require('./core/core.title')(Chart);
require('./core/core.legend')(Chart);
require('./core/core.tooltip')(Chart);

require('./elements/element.arc')(Chart);
require('./elements/element.line')(Chart);
require('./elements/element.point')(Chart);
require('./elements/element.rectangle')(Chart);

require('./scales/scale.linearbase.js')(Chart);
require('./scales/scale.category')(Chart);
require('./scales/scale.linear')(Chart);
require('./scales/scale.logarithmic')(Chart);
require('./scales/scale.radialLinear')(Chart);
require('./scales/scale.time')(Chart);

// Controllers must be loaded after elements
// See Chart.core.datasetController.dataElementType
require('./controllers/controller.bar')(Chart);
require('./controllers/controller.bubble')(Chart);
require('./controllers/controller.doughnut')(Chart);
require('./controllers/controller.line')(Chart);
require('./controllers/controller.polarArea')(Chart);
require('./controllers/controller.radar')(Chart);

require('./charts/Chart.Bar')(Chart);
require('./charts/Chart.Bubble')(Chart);
require('./charts/Chart.Doughnut')(Chart);
require('./charts/Chart.Line')(Chart);
require('./charts/Chart.PolarArea')(Chart);
require('./charts/Chart.Radar')(Chart);
require('./charts/Chart.Scatter')(Chart);

window.Chart = module.exports = Chart;

},{"./charts/Chart.Bar":4,"./charts/Chart.Bubble":5,"./charts/Chart.Doughnut":6,"./charts/Chart.Line":7,"./charts/Chart.PolarArea":8,"./charts/Chart.Radar":9,"./charts/Chart.Scatter":10,"./controllers/controller.bar":11,"./controllers/controller.bubble":12,"./controllers/controller.doughnut":13,"./controllers/controller.line":14,"./controllers/controller.polarArea":15,"./controllers/controller.radar":16,"./core/core.animation":17,"./core/core.controller":18,"./core/core.datasetController":19,"./core/core.element":20,"./core/core.helpers":21,"./core/core.js":22,"./core/core.layoutService":23,"./core/core.legend":24,"./core/core.plugin.js":25,"./core/core.scale":26,"./core/core.scaleService":27,"./core/core.title":28,"./core/core.tooltip":29,"./elements/element.arc":30,"./elements/element.line":31,"./elements/element.point":32,"./elements/element.rectangle":33,"./scales/scale.category":34,"./scales/scale.linear":35,"./scales/scale.linearbase.js":36,"./scales/scale.logarithmic":37,"./scales/scale.radialLinear":38,"./scales/scale.time":39}],4:[function(require,module,exports){
"use strict";

module.exports = function(Chart) {

	Chart.Bar = function(context, config) {
		config.type = 'bar';

		return new Chart(context, config);
	};

};
},{}],5:[function(require,module,exports){
"use strict";

module.exports = function(Chart) {

	Chart.Bubble = function(context, config) {
		config.type = 'bubble';
		return new Chart(context, config);
	};

};
},{}],6:[function(require,module,exports){
"use strict";

module.exports = function(Chart) {

	Chart.Doughnut = function(context, config) {
		config.type = 'doughnut';

		return new Chart(context, config);
	};

};
},{}],7:[function(require,module,exports){
"use strict";

module.exports = function(Chart) {

	Chart.Line = function(context, config) {
		config.type = 'line';

		return new Chart(context, config);
	};

};
},{}],8:[function(require,module,exports){
"use strict";

module.exports = function(Chart) {

	Chart.PolarArea = function(context, config) {
		config.type = 'polarArea';

		return new Chart(context, config);
	};

};
},{}],9:[function(require,module,exports){
"use strict";

module.exports = function(Chart) {
	
	Chart.Radar = function(context, config) {
		config.options = Chart.helpers.configMerge({ aspectRatio: 1 }, config.options);
		config.type = 'radar';

		return new Chart(context, config);
	};

};

},{}],10:[function(require,module,exports){
"use strict";

module.exports = function(Chart) {

	var defaultConfig = {
		hover: {
			mode: 'single'
		},

		scales: {
			xAxes: [{
				type: "linear", // scatter should not use a category axis
				position: "bottom",
				id: "x-axis-1" // need an ID so datasets can reference the scale
			}],
			yAxes: [{
				type: "linear",
				position: "left",
				id: "y-axis-1"
			}]
		},

		tooltips: {
			callbacks: {
				title: function(tooltipItems, data) {
					// Title doesn't make sense for scatter since we format the data as a point
					return '';
				},
				label: function(tooltipItem, data) {
					return '(' + tooltipItem.xLabel + ', ' + tooltipItem.yLabel + ')';
				}
			}
		}
	};

	// Register the default config for this type
	Chart.defaults.scatter = defaultConfig;

	// Scatter charts use line controllers
	Chart.controllers.scatter = Chart.controllers.line;

	Chart.Scatter = function(context, config) {
		config.type = 'scatter';
		return new Chart(context, config);
	};

};
},{}],11:[function(require,module,exports){
"use strict";

module.exports = function(Chart) {

	var helpers = Chart.helpers;

	Chart.defaults.bar = {
		hover: {
			mode: "label"
		},

		scales: {
			xAxes: [{
				type: "category",

				// Specific to Bar Controller
				categoryPercentage: 0.8,
				barPercentage: 0.9,

				// grid line settings
				gridLines: {
					offsetGridLines: true
				}
			}],
			yAxes: [{
				type: "linear"
			}]
		}
	};

	Chart.controllers.bar = Chart.DatasetController.extend({

		dataElementType: Chart.elements.Rectangle,

		initialize: function(chart, datasetIndex) {
			Chart.DatasetController.prototype.initialize.call(this, chart, datasetIndex);

			// Use this to indicate that this is a bar dataset.
			this.getMeta().bar = true;
		},

		// Get the number of datasets that display bars. We use this to correctly calculate the bar width
		getBarCount: function getBarCount() {
			var me = this;
			var barCount = 0;
			helpers.each(me.chart.data.datasets, function(dataset, datasetIndex) {
				var meta = me.chart.getDatasetMeta(datasetIndex);
				if (meta.bar && me.chart.isDatasetVisible(datasetIndex)) {
					++barCount;
				}
			}, me);
			return barCount;
		},

		update: function update(reset) {
			var me = this;
			helpers.each(me.getMeta().data, function(rectangle, index) {
				me.updateElement(rectangle, index, reset);
			}, me);
		},

		updateElement: function updateElement(rectangle, index, reset) {
			var me = this;
			var meta = me.getMeta();
			var xScale = me.getScaleForId(meta.xAxisID);
			var yScale = me.getScaleForId(meta.yAxisID);
			var scaleBase = yScale.getBasePixel();
			var rectangleElementOptions = me.chart.options.elements.rectangle;
			var custom = rectangle.custom || {};
			var dataset = me.getDataset();

			helpers.extend(rectangle, {
				// Utility
				_xScale: xScale,
				_yScale: yScale,
				_datasetIndex: me.index,
				_index: index,

				// Desired view properties
				_model: {
					x: me.calculateBarX(index, me.index),
					y: reset ? scaleBase : me.calculateBarY(index, me.index),

					// Tooltip
					label: me.chart.data.labels[index],
					datasetLabel: dataset.label,

					// Appearance
					base: reset ? scaleBase : me.calculateBarBase(me.index, index),
					width: me.calculateBarWidth(index),
					backgroundColor: custom.backgroundColor ? custom.backgroundColor : helpers.getValueAtIndexOrDefault(dataset.backgroundColor, index, rectangleElementOptions.backgroundColor),
					borderSkipped: custom.borderSkipped ? custom.borderSkipped : rectangleElementOptions.borderSkipped,
					borderColor: custom.borderColor ? custom.borderColor : helpers.getValueAtIndexOrDefault(dataset.borderColor, index, rectangleElementOptions.borderColor),
					borderWidth: custom.borderWidth ? custom.borderWidth : helpers.getValueAtIndexOrDefault(dataset.borderWidth, index, rectangleElementOptions.borderWidth)
				}
			});
			rectangle.pivot();
		},

		calculateBarBase: function(datasetIndex, index) {
			var me = this;
			var meta = me.getMeta();
			var yScale = me.getScaleForId(meta.yAxisID);
			var base = 0;

			if (yScale.options.stacked) {
				var chart = me.chart;
				var datasets = chart.data.datasets;
				var value = datasets[datasetIndex].data[index];

				if (value < 0) {
					for (var i = 0; i < datasetIndex; i++) {
						var negDS = datasets[i];
						var negDSMeta = chart.getDatasetMeta(i);
						if (negDSMeta.bar && negDSMeta.yAxisID === yScale.id && chart.isDatasetVisible(i)) {
							base += negDS.data[index] < 0 ? negDS.data[index] : 0;
						}
					}
				} else {
					for (var j = 0; j < datasetIndex; j++) {
						var posDS = datasets[j];
						var posDSMeta = chart.getDatasetMeta(j);
						if (posDSMeta.bar && posDSMeta.yAxisID === yScale.id && chart.isDatasetVisible(j)) {
							base += posDS.data[index] > 0 ? posDS.data[index] : 0;
						}
					}
				}

				return yScale.getPixelForValue(base);
			}

			return yScale.getBasePixel();
		},

		getRuler: function(index) {
			var me = this;
			var meta = me.getMeta();
			var xScale = me.getScaleForId(meta.xAxisID);
			var datasetCount = me.getBarCount();

			var tickWidth;

			if (xScale.options.type === 'category') {
				tickWidth = xScale.getPixelForTick(index + 1) - xScale.getPixelForTick(index);
			} else {
				// Average width
				tickWidth = xScale.width / xScale.ticks.length;
			}
			var categoryWidth = tickWidth * xScale.options.categoryPercentage;
			var categorySpacing = (tickWidth - (tickWidth * xScale.options.categoryPercentage)) / 2;
			var fullBarWidth = categoryWidth / datasetCount;

			if (xScale.ticks.length !== me.chart.data.labels.length) {
			    var perc = xScale.ticks.length / me.chart.data.labels.length;
			    fullBarWidth = fullBarWidth * perc;
			}

			var barWidth = fullBarWidth * xScale.options.barPercentage;
			var barSpacing = fullBarWidth - (fullBarWidth * xScale.options.barPercentage);

			return {
				datasetCount: datasetCount,
				tickWidth: tickWidth,
				categoryWidth: categoryWidth,
				categorySpacing: categorySpacing,
				fullBarWidth: fullBarWidth,
				barWidth: barWidth,
				barSpacing: barSpacing
			};
		},

		calculateBarWidth: function(index) {
			var xScale = this.getScaleForId(this.getMeta().xAxisID);
			var ruler = this.getRuler(index);
			return xScale.options.stacked ? ruler.categoryWidth : ruler.barWidth;
		},

		// Get bar index from the given dataset index accounting for the fact that not all bars are visible
		getBarIndex: function(datasetIndex) {
			var barIndex = 0;
			var meta, j;

			for (j = 0; j < datasetIndex; ++j) {
				meta = this.chart.getDatasetMeta(j);
				if (meta.bar && this.chart.isDatasetVisible(j)) {
					++barIndex;
				}
			}

			return barIndex;
		},

		calculateBarX: function(index, datasetIndex) {
			var me = this;
			var meta = me.getMeta();
			var xScale = me.getScaleForId(meta.xAxisID);
			var barIndex = me.getBarIndex(datasetIndex);

			var ruler = me.getRuler(index);
			var leftTick = xScale.getPixelForValue(null, index, datasetIndex, me.chart.isCombo);
			leftTick -= me.chart.isCombo ? (ruler.tickWidth / 2) : 0;

			if (xScale.options.stacked) {
				return leftTick + (ruler.categoryWidth / 2) + ruler.categorySpacing;
			}

			return leftTick +
				(ruler.barWidth / 2) +
				ruler.categorySpacing +
				(ruler.barWidth * barIndex) +
				(ruler.barSpacing / 2) +
				(ruler.barSpacing * barIndex);
		},

		calculateBarY: function(index, datasetIndex) {
			var me = this;
			var meta = me.getMeta();
			var yScale = me.getScaleForId(meta.yAxisID);
			var value = me.getDataset().data[index];

			if (yScale.options.stacked) {

				var sumPos = 0,
					sumNeg = 0;

				for (var i = 0; i < datasetIndex; i++) {
					var ds = me.chart.data.datasets[i];
					var dsMeta = me.chart.getDatasetMeta(i);
					if (dsMeta.bar && dsMeta.yAxisID === yScale.id && me.chart.isDatasetVisible(i)) {
						if (ds.data[index] < 0) {
							sumNeg += ds.data[index] || 0;
						} else {
							sumPos += ds.data[index] || 0;
						}
					}
				}

				if (value < 0) {
					return yScale.getPixelForValue(sumNeg + value);
				} else {
					return yScale.getPixelForValue(sumPos + value);
				}
			}

			return yScale.getPixelForValue(value);
		},

		draw: function(ease) {
			var me = this;
			var easingDecimal = ease || 1;
			helpers.each(me.getMeta().data, function(rectangle, index) {
				var d = me.getDataset().data[index];
				if (d !== null && d !== undefined && !isNaN(d)) {
					rectangle.transition(easingDecimal).draw();
				}
			}, me);
		},

		setHoverStyle: function(rectangle) {
			var dataset = this.chart.data.datasets[rectangle._datasetIndex];
			var index = rectangle._index;

			var custom = rectangle.custom || {};
			var model = rectangle._model;
			model.backgroundColor = custom.hoverBackgroundColor ? custom.hoverBackgroundColor : helpers.getValueAtIndexOrDefault(dataset.hoverBackgroundColor, index, helpers.getHoverColor(model.backgroundColor));
			model.borderColor = custom.hoverBorderColor ? custom.hoverBorderColor : helpers.getValueAtIndexOrDefault(dataset.hoverBorderColor, index, helpers.getHoverColor(model.borderColor));
			model.borderWidth = custom.hoverBorderWidth ? custom.hoverBorderWidth : helpers.getValueAtIndexOrDefault(dataset.hoverBorderWidth, index, model.borderWidth);
		},

		removeHoverStyle: function(rectangle) {
			var dataset = this.chart.data.datasets[rectangle._datasetIndex];
			var index = rectangle._index;
			var custom = rectangle.custom || {};
			var model = rectangle._model;
			var rectangleElementOptions = this.chart.options.elements.rectangle;

			model.backgroundColor = custom.backgroundColor ? custom.backgroundColor : helpers.getValueAtIndexOrDefault(dataset.backgroundColor, index, rectangleElementOptions.backgroundColor);
			model.borderColor = custom.borderColor ? custom.borderColor : helpers.getValueAtIndexOrDefault(dataset.borderColor, index, rectangleElementOptions.borderColor);
			model.borderWidth = custom.borderWidth ? custom.borderWidth : helpers.getValueAtIndexOrDefault(dataset.borderWidth, index, rectangleElementOptions.borderWidth);
		}

	});


	// including horizontalBar in the bar file, instead of a file of its own
	// it extends bar (like pie extends doughnut)
	Chart.defaults.horizontalBar = {
		hover: {
			mode: "label"
		},

		scales: {
			xAxes: [{
				type: "linear",
				position: "bottom"
			}],
			yAxes: [{
				position: "left",
				type: "category",

				// Specific to Horizontal Bar Controller
				categoryPercentage: 0.8,
				barPercentage: 0.9,

				// grid line settings
				gridLines: {
					offsetGridLines: true
				}
			}]
		},
		elements: {
			rectangle: {
				borderSkipped: 'left'
			}
		},
		tooltips: {
			callbacks: {
				title: function(tooltipItems, data) {
					// Pick first xLabel for now
					var title = '';

					if (tooltipItems.length > 0) {
						if (tooltipItems[0].yLabel) {
							title = tooltipItems[0].yLabel;
						} else if (data.labels.length > 0 && tooltipItems[0].index < data.labels.length) {
							title = data.labels[tooltipItems[0].index];
						}
					}

					return title;
				},
				label: function(tooltipItem, data) {
					var datasetLabel = data.datasets[tooltipItem.datasetIndex].label || '';
				return datasetLabel + ': ' + tooltipItem.xLabel;
				}
			}
		}
	};

	Chart.controllers.horizontalBar = Chart.controllers.bar.extend({
		updateElement: function updateElement(rectangle, index, reset, numBars) {
			var me = this;
			var meta = me.getMeta();
			var xScale = me.getScaleForId(meta.xAxisID);
			var yScale = me.getScaleForId(meta.yAxisID);
			var scaleBase = xScale.getBasePixel();
			var custom = rectangle.custom || {};
			var dataset = me.getDataset();
			var rectangleElementOptions = me.chart.options.elements.rectangle;

			helpers.extend(rectangle, {
				// Utility
				_xScale: xScale,
				_yScale: yScale,
				_datasetIndex: me.index,
				_index: index,

				// Desired view properties
				_model: {
					x: reset ? scaleBase : me.calculateBarX(index, me.index),
					y: me.calculateBarY(index, me.index),

					// Tooltip
					label: me.chart.data.labels[index],
					datasetLabel: dataset.label,

					// Appearance
					base: reset ? scaleBase : me.calculateBarBase(me.index, index),
					height: me.calculateBarHeight(index),
					backgroundColor: custom.backgroundColor ? custom.backgroundColor : helpers.getValueAtIndexOrDefault(dataset.backgroundColor, index, rectangleElementOptions.backgroundColor),
					borderSkipped: custom.borderSkipped ? custom.borderSkipped : rectangleElementOptions.borderSkipped,
					borderColor: custom.borderColor ? custom.borderColor : helpers.getValueAtIndexOrDefault(dataset.borderColor, index, rectangleElementOptions.borderColor),
					borderWidth: custom.borderWidth ? custom.borderWidth : helpers.getValueAtIndexOrDefault(dataset.borderWidth, index, rectangleElementOptions.borderWidth)
				},

				draw: function () {
					var ctx = this._chart.ctx;
					var vm = this._view;

					var halfHeight = vm.height / 2,
						topY = vm.y - halfHeight,
						bottomY = vm.y + halfHeight,
						right = vm.base - (vm.base - vm.x),
						halfStroke = vm.borderWidth / 2;

					// Canvas doesn't allow us to stroke inside the width so we can
					// adjust the sizes to fit if we're setting a stroke on the line
					if (vm.borderWidth) {
						topY += halfStroke;
						bottomY -= halfStroke;
						right += halfStroke;
					}

					ctx.beginPath();

					ctx.fillStyle = vm.backgroundColor;
					ctx.strokeStyle = vm.borderColor;
					ctx.lineWidth = vm.borderWidth;

					// Corner points, from bottom-left to bottom-right clockwise
					// | 1 2 |
					// | 0 3 |
					var corners = [
						[vm.base, bottomY],
						[vm.base, topY],
						[right, topY],
						[right, bottomY]
					];

					// Find first (starting) corner with fallback to 'bottom'
					var borders = ['bottom', 'left', 'top', 'right'];
					var startCorner = borders.indexOf(vm.borderSkipped, 0);
					if (startCorner === -1)
						startCorner = 0;

					function cornerAt(index) {
						return corners[(startCorner + index) % 4];
					}

					// Draw rectangle from 'startCorner'
					ctx.moveTo.apply(ctx, cornerAt(0));
					for (var i = 1; i < 4; i++)
						ctx.lineTo.apply(ctx, cornerAt(i));

					ctx.fill();
					if (vm.borderWidth) {
						ctx.stroke();
					}
				},

				inRange: function (mouseX, mouseY) {
					var vm = this._view;
					var inRange = false;

					if (vm) {
						if (vm.x < vm.base) {
							inRange = (mouseY >= vm.y - vm.height / 2 && mouseY <= vm.y + vm.height / 2) && (mouseX >= vm.x && mouseX <= vm.base);
						} else {
							inRange = (mouseY >= vm.y - vm.height / 2 && mouseY <= vm.y + vm.height / 2) && (mouseX >= vm.base && mouseX <= vm.x);
						}
					}

					return inRange;
				}
			});

			rectangle.pivot();
		},

		calculateBarBase: function (datasetIndex, index) {
			var me = this;
			var meta = me.getMeta();
			var xScale = me.getScaleForId(meta.xAxisID);
			var base = 0;

			if (xScale.options.stacked) {

				var value = me.chart.data.datasets[datasetIndex].data[index];

				if (value < 0) {
					for (var i = 0; i < datasetIndex; i++) {
						var negDS = me.chart.data.datasets[i];
						var negDSMeta = me.chart.getDatasetMeta(i);
						if (negDSMeta.bar && negDSMeta.xAxisID === xScale.id && me.chart.isDatasetVisible(i)) {
							base += negDS.data[index] < 0 ? negDS.data[index] : 0;
						}
					}
				} else {
					for (var j = 0; j < datasetIndex; j++) {
						var posDS = me.chart.data.datasets[j];
						var posDSMeta = me.chart.getDatasetMeta(j);
						if (posDSMeta.bar && posDSMeta.xAxisID === xScale.id && me.chart.isDatasetVisible(j)) {
							base += posDS.data[index] > 0 ? posDS.data[index] : 0;
						}
					}
				}

				return xScale.getPixelForValue(base);
			}

			return xScale.getBasePixel();
		},

		getRuler: function (index) {
			var me = this;
			var meta = me.getMeta();
			var yScale = me.getScaleForId(meta.yAxisID);
			var datasetCount = me.getBarCount();

			var tickHeight;
			if (yScale.options.type === 'category') {
				tickHeight = yScale.getPixelForTick(index + 1) - yScale.getPixelForTick(index);
			} else {
				// Average width
				tickHeight = yScale.width / yScale.ticks.length;
			}
			var categoryHeight = tickHeight * yScale.options.categoryPercentage;
			var categorySpacing = (tickHeight - (tickHeight * yScale.options.categoryPercentage)) / 2;
			var fullBarHeight = categoryHeight / datasetCount;

			if (yScale.ticks.length !== me.chart.data.labels.length) {
				var perc = yScale.ticks.length / me.chart.data.labels.length;
				fullBarHeight = fullBarHeight * perc;
			}

			var barHeight = fullBarHeight * yScale.options.barPercentage;
			var barSpacing = fullBarHeight - (fullBarHeight * yScale.options.barPercentage);

			return {
				datasetCount: datasetCount,
				tickHeight: tickHeight,
				categoryHeight: categoryHeight,
				categorySpacing: categorySpacing,
				fullBarHeight: fullBarHeight,
				barHeight: barHeight,
				barSpacing: barSpacing,
			};
		},

		calculateBarHeight: function (index) {
			var me = this;
			var yScale = me.getScaleForId(me.getMeta().yAxisID);
			var ruler = me.getRuler(index);
			return yScale.options.stacked ? ruler.categoryHeight : ruler.barHeight;
		},

		calculateBarX: function (index, datasetIndex) {
			var me = this;
			var meta = me.getMeta();
			var xScale = me.getScaleForId(meta.xAxisID);
			var value = me.getDataset().data[index];

			if (xScale.options.stacked) {

				var sumPos = 0,
					sumNeg = 0;

				for (var i = 0; i < datasetIndex; i++) {
					var ds = me.chart.data.datasets[i];
					var dsMeta = me.chart.getDatasetMeta(i);
					if (dsMeta.bar && dsMeta.xAxisID === xScale.id && me.chart.isDatasetVisible(i)) {
						if (ds.data[index] < 0) {
							sumNeg += ds.data[index] || 0;
						} else {
							sumPos += ds.data[index] || 0;
						}
					}
				}

				if (value < 0) {
					return xScale.getPixelForValue(sumNeg + value);
				} else {
					return xScale.getPixelForValue(sumPos + value);
				}
			}

			return xScale.getPixelForValue(value);
		},

		calculateBarY: function (index, datasetIndex) {
			var me = this;
			var meta = me.getMeta();
			var yScale = me.getScaleForId(meta.yAxisID);
			var barIndex = me.getBarIndex(datasetIndex);

			var ruler = me.getRuler(index);
			var topTick = yScale.getPixelForValue(null, index, datasetIndex, me.chart.isCombo);
			topTick -= me.chart.isCombo ? (ruler.tickHeight / 2) : 0;

			if (yScale.options.stacked) {
				return topTick + (ruler.categoryHeight / 2) + ruler.categorySpacing;
			}

			return topTick +
				(ruler.barHeight / 2) +
				ruler.categorySpacing +
				(ruler.barHeight * barIndex) +
				(ruler.barSpacing / 2) +
				(ruler.barSpacing * barIndex);
		}
	});
};

},{}],12:[function(require,module,exports){
"use strict";

module.exports = function(Chart) {

	var helpers = Chart.helpers;

	Chart.defaults.bubble = {
		hover: {
			mode: "single"
		},

		scales: {
			xAxes: [{
				type: "linear", // bubble should probably use a linear scale by default
				position: "bottom",
				id: "x-axis-0" // need an ID so datasets can reference the scale
			}],
			yAxes: [{
				type: "linear",
				position: "left",
				id: "y-axis-0"
			}]
		},

		tooltips: {
			callbacks: {
				title: function(tooltipItems, data) {
					// Title doesn't make sense for scatter since we format the data as a point
					return '';
				},
				label: function(tooltipItem, data) {
					var datasetLabel = data.datasets[tooltipItem.datasetIndex].label || '';
					var dataPoint = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
					return datasetLabel + ': (' + dataPoint.x + ', ' + dataPoint.y + ', ' + dataPoint.r + ')';
				}
			}
		}
	};

	Chart.controllers.bubble = Chart.DatasetController.extend({

		dataElementType: Chart.elements.Point,

		update: function update(reset) {
			var me = this;
			var meta = me.getMeta();
			var points = meta.data;

			// Update Points
			helpers.each(points, function(point, index) {
				me.updateElement(point, index, reset);
			});
		},

		updateElement: function(point, index, reset) {
			var me = this;
			var meta = me.getMeta();
			var xScale = me.getScaleForId(meta.xAxisID);
			var yScale = me.getScaleForId(meta.yAxisID);

			var custom = point.custom || {};
			var dataset = me.getDataset();
			var data = dataset.data[index];
			var pointElementOptions = me.chart.options.elements.point;
			var dsIndex = me.index;

			helpers.extend(point, {
				// Utility
				_xScale: xScale,
				_yScale: yScale,
				_datasetIndex: dsIndex,
				_index: index,

				// Desired view properties
				_model: {
					x: reset ? xScale.getPixelForDecimal(0.5) : xScale.getPixelForValue(data, index, dsIndex, me.chart.isCombo),
					y: reset ? yScale.getBasePixel() : yScale.getPixelForValue(data, index, dsIndex),
					// Appearance
					radius: reset ? 0 : custom.radius ? custom.radius : me.getRadius(data),

					// Tooltip
					hitRadius: custom.hitRadius ? custom.hitRadius : helpers.getValueAtIndexOrDefault(dataset.hitRadius, index, pointElementOptions.hitRadius)
				}
			});

			// Trick to reset the styles of the point
			Chart.DatasetController.prototype.removeHoverStyle.call(me, point, pointElementOptions);

			var model = point._model;
			model.skip = custom.skip ? custom.skip : (isNaN(model.x) || isNaN(model.y));

			point.pivot();
		},

		getRadius: function(value) {
			return value.r || this.chart.options.elements.point.radius;
		},

		setHoverStyle: function(point) {
			var me = this;
			Chart.DatasetController.prototype.setHoverStyle.call(me, point);

			// Radius
			var dataset = me.chart.data.datasets[point._datasetIndex];
			var index = point._index;
			var custom = point.custom || {};
			var model = point._model;
			model.radius = custom.hoverRadius ? custom.hoverRadius : (helpers.getValueAtIndexOrDefault(dataset.hoverRadius, index, me.chart.options.elements.point.hoverRadius)) + me.getRadius(dataset.data[index]);
		},

		removeHoverStyle: function(point) {
			var me = this;
			Chart.DatasetController.prototype.removeHoverStyle.call(me, point, me.chart.options.elements.point);

			var dataVal = me.chart.data.datasets[point._datasetIndex].data[point._index];
			var custom = point.custom || {};
			var model = point._model;

			model.radius = custom.radius ? custom.radius : me.getRadius(dataVal);
		}
	});
};

},{}],13:[function(require,module,exports){
"use strict";

module.exports = function(Chart) {

	var helpers = Chart.helpers,
		defaults = Chart.defaults;

	defaults.doughnut = {
		animation: {
			//Boolean - Whether we animate the rotation of the Doughnut
			animateRotate: true,
			//Boolean - Whether we animate scaling the Doughnut from the centre
			animateScale: false
		},
		aspectRatio: 1,
		hover: {
			mode: 'single'
		},
		legendCallback: function(chart) {
			var text = [];
			text.push('<ul class="' + chart.id + '-legend">');

			var data = chart.data;
			var datasets = data.datasets;
			var labels = data.labels;

			if (datasets.length) {
				for (var i = 0; i < datasets[0].data.length; ++i) {
					text.push('<li><span style="background-color:' + datasets[0].backgroundColor[i] + '"></span>');
					if (labels[i]) {
						text.push(labels[i]);
					}
					text.push('</li>');
				}
			}

			text.push('</ul>');
			return text.join("");
		},
		legend: {
			labels: {
				generateLabels: function(chart) {
					var data = chart.data;
					if (data.labels.length && data.datasets.length) {
						return data.labels.map(function(label, i) {
							var meta = chart.getDatasetMeta(0);
							var ds = data.datasets[0];
							var arc = meta.data[i];
							var custom = arc.custom || {};
							var getValueAtIndexOrDefault = helpers.getValueAtIndexOrDefault;
							var arcOpts = chart.options.elements.arc;
							var fill = custom.backgroundColor ? custom.backgroundColor : getValueAtIndexOrDefault(ds.backgroundColor, i, arcOpts.backgroundColor);
							var stroke = custom.borderColor ? custom.borderColor : getValueAtIndexOrDefault(ds.borderColor, i, arcOpts.borderColor);
							var bw = custom.borderWidth ? custom.borderWidth : getValueAtIndexOrDefault(ds.borderWidth, i, arcOpts.borderWidth);

							return {
								text: label,
								fillStyle: fill,
								strokeStyle: stroke,
								lineWidth: bw,
								hidden: isNaN(ds.data[i]) || meta.data[i].hidden,

								// Extra data used for toggling the correct item
								index: i
							};
						});
					} else {
						return [];
					}
				}
			},

			onClick: function(e, legendItem) {
				var index = legendItem.index;
				var chart = this.chart;
				var i, ilen, meta;

				for (i = 0, ilen = (chart.data.datasets || []).length; i < ilen; ++i) {
					meta = chart.getDatasetMeta(i);
					meta.data[index].hidden = !meta.data[index].hidden;
				}

				chart.update();
			}
		},

		//The percentage of the chart that we cut out of the middle.
		cutoutPercentage: 50,

		//The rotation of the chart, where the first data arc begins.
		rotation: Math.PI * -0.5,

		//The total circumference of the chart.
		circumference: Math.PI * 2.0,

		// Need to override these to give a nice default
		tooltips: {
			callbacks: {
				title: function() {
					return '';
				},
				label: function(tooltipItem, data) {
					return data.labels[tooltipItem.index] + ': ' + data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
				}
			}
		}
	};

	defaults.pie = helpers.clone(defaults.doughnut);
	helpers.extend(defaults.pie, {
		cutoutPercentage: 0
	});


	Chart.controllers.doughnut = Chart.controllers.pie = Chart.DatasetController.extend({

		dataElementType: Chart.elements.Arc,

		linkScales: helpers.noop,

		// Get index of the dataset in relation to the visible datasets. This allows determining the inner and outer radius correctly
		getRingIndex: function getRingIndex(datasetIndex) {
			var ringIndex = 0;

			for (var j = 0; j < datasetIndex; ++j) {
				if (this.chart.isDatasetVisible(j)) {
					++ringIndex;
				}
			}

			return ringIndex;
		},

		update: function update(reset) {
			var me = this;
			var chart = me.chart,
				chartArea = chart.chartArea,
				opts = chart.options,
				arcOpts = opts.elements.arc,
				availableWidth = chartArea.right - chartArea.left - arcOpts.borderWidth,
				availableHeight = chartArea.bottom - chartArea.top - arcOpts.borderWidth,
				minSize = Math.min(availableWidth, availableHeight),
				offset = {
					x: 0,
					y: 0
				},
				meta = me.getMeta(),
				cutoutPercentage = opts.cutoutPercentage,
				circumference = opts.circumference;

			// If the chart's circumference isn't a full circle, calculate minSize as a ratio of the width/height of the arc
			if (circumference < Math.PI * 2.0) {
				var startAngle = opts.rotation % (Math.PI * 2.0);
				startAngle += Math.PI * 2.0 * (startAngle >= Math.PI ? -1 : startAngle < -Math.PI ? 1 : 0);
				var endAngle = startAngle + circumference;
				var start = {x: Math.cos(startAngle), y: Math.sin(startAngle)};
				var end = {x: Math.cos(endAngle), y: Math.sin(endAngle)};
				var contains0 = (startAngle <= 0 && 0 <= endAngle) || (startAngle <= Math.PI * 2.0 && Math.PI * 2.0 <= endAngle);
				var contains90 = (startAngle <= Math.PI * 0.5 && Math.PI * 0.5 <= endAngle) || (startAngle <= Math.PI * 2.5 && Math.PI * 2.5 <= endAngle);
				var contains180 = (startAngle <= -Math.PI && -Math.PI <= endAngle) || (startAngle <= Math.PI && Math.PI <= endAngle);
				var contains270 = (startAngle <= -Math.PI * 0.5 && -Math.PI * 0.5 <= endAngle) || (startAngle <= Math.PI * 1.5 && Math.PI * 1.5 <= endAngle);
				var cutout = cutoutPercentage / 100.0;
				var min = {x: contains180 ? -1 : Math.min(start.x * (start.x < 0 ? 1 : cutout), end.x * (end.x < 0 ? 1 : cutout)), y: contains270 ? -1 : Math.min(start.y * (start.y < 0 ? 1 : cutout), end.y * (end.y < 0 ? 1 : cutout))};
				var max = {x: contains0 ? 1 : Math.max(start.x * (start.x > 0 ? 1 : cutout), end.x * (end.x > 0 ? 1 : cutout)), y: contains90 ? 1 : Math.max(start.y * (start.y > 0 ? 1 : cutout), end.y * (end.y > 0 ? 1 : cutout))};
				var size = {width: (max.x - min.x) * 0.5, height: (max.y - min.y) * 0.5};
				minSize = Math.min(availableWidth / size.width, availableHeight / size.height);
				offset = {x: (max.x + min.x) * -0.5, y: (max.y + min.y) * -0.5};
			}

			chart.outerRadius = Math.max(minSize / 2, 0);
			chart.innerRadius = Math.max(cutoutPercentage ? (chart.outerRadius / 100) * (cutoutPercentage) : 1, 0);
			chart.radiusLength = (chart.outerRadius - chart.innerRadius) / chart.getVisibleDatasetCount();
			chart.offsetX = offset.x * chart.outerRadius;
			chart.offsetY = offset.y * chart.outerRadius;

			meta.total = me.calculateTotal();

			me.outerRadius = chart.outerRadius - (chart.radiusLength * me.getRingIndex(me.index));
			me.innerRadius = me.outerRadius - chart.radiusLength;

			helpers.each(meta.data, function(arc, index) {
				me.updateElement(arc, index, reset);
			});
		},

		updateElement: function(arc, index, reset) {
			var me = this;
			var chart = me.chart,
				chartArea = chart.chartArea,
				opts = chart.options,
				animationOpts = opts.animation,
				arcOpts = opts.elements.arc,
				centerX = (chartArea.left + chartArea.right) / 2,
				centerY = (chartArea.top + chartArea.bottom) / 2,
				startAngle = opts.rotation, // non reset case handled later
				endAngle = opts.rotation, // non reset case handled later
				dataset = me.getDataset(),
				circumference = reset && animationOpts.animateRotate ? 0 : arc.hidden ? 0 : me.calculateCircumference(dataset.data[index]) * (opts.circumference / (2.0 * Math.PI)),
				innerRadius = reset && animationOpts.animateScale ? 0 : me.innerRadius,
				outerRadius = reset && animationOpts.animateScale ? 0 : me.outerRadius,
				custom = arc.custom || {},
				valueAtIndexOrDefault = helpers.getValueAtIndexOrDefault;

			helpers.extend(arc, {
				// Utility
				_datasetIndex: me.index,
				_index: index,

				// Desired view properties
				_model: {
					x: centerX + chart.offsetX,
					y: centerY + chart.offsetY,
					startAngle: startAngle,
					endAngle: endAngle,
					circumference: circumference,
					outerRadius: outerRadius,
					innerRadius: innerRadius,
					label: valueAtIndexOrDefault(dataset.label, index, chart.data.labels[index])
				}
			});

			var model = arc._model;
			// Resets the visual styles
			this.removeHoverStyle(arc);

			// Set correct angles if not resetting
			if (!reset || !animationOpts.animateRotate) {
				if (index === 0) {
					model.startAngle = opts.rotation;
				} else {
					model.startAngle = me.getMeta().data[index - 1]._model.endAngle;
				}

				model.endAngle = model.startAngle + model.circumference;
			}

			arc.pivot();
		},

		removeHoverStyle: function(arc) {
			Chart.DatasetController.prototype.removeHoverStyle.call(this, arc, this.chart.options.elements.arc);
		},

		calculateTotal: function() {
			var dataset = this.getDataset();
			var meta = this.getMeta();
			var total = 0;
			var value;

			helpers.each(meta.data, function(element, index) {
				value = dataset.data[index];
				if (!isNaN(value) && !element.hidden) {
					total += Math.abs(value);
				}
			});

			return total;
		},

		calculateCircumference: function(value) {
			var total = this.getMeta().total;
			if (total > 0 && !isNaN(value)) {
				return (Math.PI * 2.0) * (value / total);
			} else {
				return 0;
			}
		}
	});
};

},{}],14:[function(require,module,exports){
"use strict";

module.exports = function(Chart) {

	var helpers = Chart.helpers;

	Chart.defaults.line = {
		showLines: true,

		hover: {
			mode: "label"
		},

		scales: {
			xAxes: [{
				type: "category",
				id: 'x-axis-0'
			}],
			yAxes: [{
				type: "linear",
				id: 'y-axis-0'
			}]
		}
	};

	function lineEnabled(dataset, options) {
		return helpers.getValueOrDefault(dataset.showLine, options.showLines);
	}

	Chart.controllers.line = Chart.DatasetController.extend({

		datasetElementType: Chart.elements.Line,

		dataElementType: Chart.elements.Point,

		addElementAndReset: function(index) {
			var me = this;
			var options = me.chart.options;
			var meta = me.getMeta();

			Chart.DatasetController.prototype.addElementAndReset.call(me, index);

			// Make sure bezier control points are updated
			if (lineEnabled(me.getDataset(), options) && meta.dataset._model.tension !== 0) {
				me.updateBezierControlPoints();
			}
		},

		update: function update(reset) {
			var me = this;
			var meta = me.getMeta();
			var line = meta.dataset;
			var points = meta.data || [];
			var options = me.chart.options;
			var lineElementOptions = options.elements.line;
			var scale = me.getScaleForId(meta.yAxisID);
			var i, ilen, custom;
			var dataset = me.getDataset();
			var showLine = lineEnabled(dataset, options);

			// Update Line
			if (showLine) {
				custom = line.custom || {};

				// Compatibility: If the properties are defined with only the old name, use those values
				if ((dataset.tension !== undefined) && (dataset.lineTension === undefined)) {
					dataset.lineTension = dataset.tension;
				}

				// Utility
				line._scale = scale;
				line._datasetIndex = me.index;
				// Data
				line._children = points;
				// Model
				line._model = {
					// Appearance
					// The default behavior of lines is to break at null values, according
					// to https://github.com/chartjs/Chart.js/issues/2435#issuecomment-216718158
					// This option gives linse the ability to span gaps
					spanGaps: dataset.spanGaps ? dataset.spanGaps : false,
					tension: custom.tension ? custom.tension : helpers.getValueOrDefault(dataset.lineTension, lineElementOptions.tension),
					backgroundColor: custom.backgroundColor ? custom.backgroundColor : (dataset.backgroundColor || lineElementOptions.backgroundColor),
					borderWidth: custom.borderWidth ? custom.borderWidth : (dataset.borderWidth || lineElementOptions.borderWidth),
					borderColor: custom.borderColor ? custom.borderColor : (dataset.borderColor || lineElementOptions.borderColor),
					borderCapStyle: custom.borderCapStyle ? custom.borderCapStyle : (dataset.borderCapStyle || lineElementOptions.borderCapStyle),
					borderDash: custom.borderDash ? custom.borderDash : (dataset.borderDash || lineElementOptions.borderDash),
					borderDashOffset: custom.borderDashOffset ? custom.borderDashOffset : (dataset.borderDashOffset || lineElementOptions.borderDashOffset),
					borderJoinStyle: custom.borderJoinStyle ? custom.borderJoinStyle : (dataset.borderJoinStyle || lineElementOptions.borderJoinStyle),
					fill: custom.fill ? custom.fill : (dataset.fill !== undefined ? dataset.fill : lineElementOptions.fill),
					// Scale
					scaleTop: scale.top,
					scaleBottom: scale.bottom,
					scaleZero: scale.getBasePixel()
				};

				line.pivot();
			}

			// Update Points
			for (i=0, ilen=points.length; i<ilen; ++i) {
				me.updateElement(points[i], i, reset);
			}

			if (showLine && line._model.tension !== 0) {
				me.updateBezierControlPoints();
			}

			// Now pivot the point for animation
			for (i=0, ilen=points.length; i<ilen; ++i) {
				points[i].pivot();
			}
		},

		getPointBackgroundColor: function(point, index) {
			var backgroundColor = this.chart.options.elements.point.backgroundColor;
			var dataset = this.getDataset();
			var custom = point.custom || {};

			if (custom.backgroundColor) {
				backgroundColor = custom.backgroundColor;
			} else if (dataset.pointBackgroundColor) {
				backgroundColor = helpers.getValueAtIndexOrDefault(dataset.pointBackgroundColor, index, backgroundColor);
			} else if (dataset.backgroundColor) {
				backgroundColor = dataset.backgroundColor;
			}

			return backgroundColor;
		},

		getPointBorderColor: function(point, index) {
			var borderColor = this.chart.options.elements.point.borderColor;
			var dataset = this.getDataset();
			var custom = point.custom || {};

			if (custom.borderColor) {
				borderColor = custom.borderColor;
			} else if (dataset.pointBorderColor) {
				borderColor = helpers.getValueAtIndexOrDefault(dataset.pointBorderColor, index, borderColor);
			} else if (dataset.borderColor) {
				borderColor = dataset.borderColor;
			}

			return borderColor;
		},

		getPointBorderWidth: function(point, index) {
			var borderWidth = this.chart.options.elements.point.borderWidth;
			var dataset = this.getDataset();
			var custom = point.custom || {};

			if (custom.borderWidth) {
				borderWidth = custom.borderWidth;
			} else if (dataset.pointBorderWidth) {
				borderWidth = helpers.getValueAtIndexOrDefault(dataset.pointBorderWidth, index, borderWidth);
			} else if (dataset.borderWidth) {
				borderWidth = dataset.borderWidth;
			}

			return borderWidth;
		},

		updateElement: function(point, index, reset) {
			var me = this;
			var meta = me.getMeta();
			var custom = point.custom || {};
			var dataset = me.getDataset();
			var datasetIndex = me.index;
			var value = dataset.data[index];
			var yScale = me.getScaleForId(meta.yAxisID);
			var xScale = me.getScaleForId(meta.xAxisID);
			var pointOptions = me.chart.options.elements.point;
			var x, y;

			// Compatibility: If the properties are defined with only the old name, use those values
			if ((dataset.radius !== undefined) && (dataset.pointRadius === undefined)) {
				dataset.pointRadius = dataset.radius;
			}
			if ((dataset.hitRadius !== undefined) && (dataset.pointHitRadius === undefined)) {
				dataset.pointHitRadius = dataset.hitRadius;
			}

			x = xScale.getPixelForValue(value, index, datasetIndex, me.chart.isCombo);
			y = reset ? yScale.getBasePixel() : me.calculatePointY(value, index, datasetIndex, me.chart.isCombo);

			// Utility
			point._xScale = xScale;
			point._yScale = yScale;
			point._datasetIndex = datasetIndex;
			point._index = index;

			// Desired view properties
			point._model = {
				x: x,
				y: y,
				skip: custom.skip || isNaN(x) || isNaN(y),
				// Appearance
				radius: custom.radius || helpers.getValueAtIndexOrDefault(dataset.pointRadius, index, pointOptions.radius),
				pointStyle: custom.pointStyle || helpers.getValueAtIndexOrDefault(dataset.pointStyle, index, pointOptions.pointStyle),
				backgroundColor: me.getPointBackgroundColor(point, index),
				borderColor: me.getPointBorderColor(point, index),
				borderWidth: me.getPointBorderWidth(point, index),
				tension: meta.dataset._model ? meta.dataset._model.tension : 0,
				// Tooltip
				hitRadius: custom.hitRadius || helpers.getValueAtIndexOrDefault(dataset.pointHitRadius, index, pointOptions.hitRadius)
			};
		},

		calculatePointY: function(value, index, datasetIndex, isCombo) {
			var me = this;
			var chart = me.chart;
			var meta = me.getMeta();
			var yScale = me.getScaleForId(meta.yAxisID);
			var sumPos = 0;
			var sumNeg = 0;
			var i, ds, dsMeta;

			if (yScale.options.stacked) {
				for (i = 0; i < datasetIndex; i++) {
					ds = chart.data.datasets[i];
					dsMeta = chart.getDatasetMeta(i);
					if (dsMeta.type === 'line' && chart.isDatasetVisible(i)) {
						if (ds.data[index] < 0) {
							sumNeg += ds.data[index] || 0;
						} else {
							sumPos += ds.data[index] || 0;
						}
					}
				}

				if (value < 0) {
					return yScale.getPixelForValue(sumNeg + value);
				} else {
					return yScale.getPixelForValue(sumPos + value);
				}
			}

			return yScale.getPixelForValue(value);
		},

		updateBezierControlPoints: function() {
			var meta = this.getMeta();
			var area = this.chart.chartArea;
			var points = meta.data || [];
			var i, ilen, point, model, controlPoints;

			for (i=0, ilen=points.length; i<ilen; ++i) {
				point = points[i];
				model = point._model;
				controlPoints = helpers.splineCurve(
					helpers.previousItem(points, i)._model,
					model,
					helpers.nextItem(points, i)._model,
					meta.dataset._model.tension
				);

				model.controlPointPreviousX = controlPoints.previous.x;
				model.controlPointPreviousY = controlPoints.previous.y;
				model.controlPointNextX = controlPoints.next.x;
				model.controlPointNextY = controlPoints.next.y;
			}
		},

		draw: function(ease) {
			var me = this;
			var meta = me.getMeta();
			var points = meta.data || [];
			var easingDecimal = ease || 1;
			var i, ilen;

			// Transition Point Locations
			for (i=0, ilen=points.length; i<ilen; ++i) {
				points[i].transition(easingDecimal);
			}

			// Transition and Draw the line
			if (lineEnabled(me.getDataset(), me.chart.options)) {
				meta.dataset.transition(easingDecimal).draw();
			}

			// Draw the points
			for (i=0, ilen=points.length; i<ilen; ++i) {
				points[i].draw();
			}
		},

		setHoverStyle: function(point) {
			// Point
			var dataset = this.chart.data.datasets[point._datasetIndex];
			var index = point._index;
			var custom = point.custom || {};
			var model = point._model;

			model.radius = custom.hoverRadius || helpers.getValueAtIndexOrDefault(dataset.pointHoverRadius, index, this.chart.options.elements.point.hoverRadius);
			model.backgroundColor = custom.hoverBackgroundColor || helpers.getValueAtIndexOrDefault(dataset.pointHoverBackgroundColor, index, helpers.getHoverColor(model.backgroundColor));
			model.borderColor = custom.hoverBorderColor || helpers.getValueAtIndexOrDefault(dataset.pointHoverBorderColor, index, helpers.getHoverColor(model.borderColor));
			model.borderWidth = custom.hoverBorderWidth || helpers.getValueAtIndexOrDefault(dataset.pointHoverBorderWidth, index, model.borderWidth);
		},

		removeHoverStyle: function(point) {
			var me = this;
			var dataset = me.chart.data.datasets[point._datasetIndex];
			var index = point._index;
			var custom = point.custom || {};
			var model = point._model;

			// Compatibility: If the properties are defined with only the old name, use those values
			if ((dataset.radius !== undefined) && (dataset.pointRadius === undefined)) {
				dataset.pointRadius = dataset.radius;
			}

			model.radius = custom.radius || helpers.getValueAtIndexOrDefault(dataset.pointRadius, index, me.chart.options.elements.point.radius);
			model.backgroundColor = me.getPointBackgroundColor(point, index);
			model.borderColor = me.getPointBorderColor(point, index);
			model.borderWidth = me.getPointBorderWidth(point, index);
		}
	});
};

},{}],15:[function(require,module,exports){
"use strict";

module.exports = function(Chart) {

	var helpers = Chart.helpers;

	Chart.defaults.polarArea = {

		scale: {
			type: "radialLinear",
			lineArc: true // so that lines are circular
		},

		//Boolean - Whether to animate the rotation of the chart
		animation: {
			animateRotate: true,
			animateScale: true
		},

		aspectRatio: 1,
		legendCallback: function(chart) {
			var text = [];
			text.push('<ul class="' + chart.id + '-legend">');

			var data = chart.data;
			var datasets = data.datasets;
			var labels = data.labels;

			if (datasets.length) {
				for (var i = 0; i < datasets[0].data.length; ++i) {
					text.push('<li><span style="background-color:' + datasets[0].backgroundColor[i] + '">');
					if (labels[i]) {
						text.push(labels[i]);
					}
					text.push('</span></li>');
				}
			}

			text.push('</ul>');
			return text.join("");
		},
		legend: {
			labels: {
				generateLabels: function(chart) {
					var data = chart.data;
					if (data.labels.length && data.datasets.length) {
						return data.labels.map(function(label, i) {
							var meta = chart.getDatasetMeta(0);
							var ds = data.datasets[0];
							var arc = meta.data[i];
							var custom = arc.custom || {};
							var getValueAtIndexOrDefault = helpers.getValueAtIndexOrDefault;
							var arcOpts = chart.options.elements.arc;
							var fill = custom.backgroundColor ? custom.backgroundColor : getValueAtIndexOrDefault(ds.backgroundColor, i, arcOpts.backgroundColor);
							var stroke = custom.borderColor ? custom.borderColor : getValueAtIndexOrDefault(ds.borderColor, i, arcOpts.borderColor);
							var bw = custom.borderWidth ? custom.borderWidth : getValueAtIndexOrDefault(ds.borderWidth, i, arcOpts.borderWidth);

							return {
								text: label,
								fillStyle: fill,
								strokeStyle: stroke,
								lineWidth: bw,
								hidden: isNaN(ds.data[i]) || meta.data[i].hidden,

								// Extra data used for toggling the correct item
								index: i
							};
						});
					} else {
						return [];
					}
				}
			},

			onClick: function(e, legendItem) {
				var index = legendItem.index;
				var chart = this.chart;
				var i, ilen, meta;

				for (i = 0, ilen = (chart.data.datasets || []).length; i < ilen; ++i) {
					meta = chart.getDatasetMeta(i);
					meta.data[index].hidden = !meta.data[index].hidden;
				}

				chart.update();
			}
		},

		// Need to override these to give a nice default
		tooltips: {
			callbacks: {
				title: function() {
					return '';
				},
				label: function(tooltipItem, data) {
					return data.labels[tooltipItem.index] + ': ' + tooltipItem.yLabel;
				}
			}
		}
	};

	Chart.controllers.polarArea = Chart.DatasetController.extend({

		dataElementType: Chart.elements.Arc,

		linkScales: helpers.noop,

		update: function update(reset) {
			var me = this;
			var chart = me.chart;
			var chartArea = chart.chartArea;
			var meta = me.getMeta();
			var opts = chart.options;
			var arcOpts = opts.elements.arc;
			var minSize = Math.min(chartArea.right - chartArea.left, chartArea.bottom - chartArea.top);
			chart.outerRadius = Math.max((minSize - arcOpts.borderWidth / 2) / 2, 0);
			chart.innerRadius = Math.max(opts.cutoutPercentage ? (chart.outerRadius / 100) * (opts.cutoutPercentage) : 1, 0);
			chart.radiusLength = (chart.outerRadius - chart.innerRadius) / chart.getVisibleDatasetCount();

			me.outerRadius = chart.outerRadius - (chart.radiusLength * me.index);
			me.innerRadius = me.outerRadius - chart.radiusLength;

			meta.count = me.countVisibleElements();

			helpers.each(meta.data, function(arc, index) {
				me.updateElement(arc, index, reset);
			});
		},

		updateElement: function(arc, index, reset) {
			var me = this;
			var chart = me.chart;
			var chartArea = chart.chartArea;
			var dataset = me.getDataset();
			var opts = chart.options;
			var animationOpts = opts.animation;
			var arcOpts = opts.elements.arc;
			var custom = arc.custom || {};
			var scale = chart.scale;
			var getValueAtIndexOrDefault = helpers.getValueAtIndexOrDefault;
			var labels = chart.data.labels;

			var circumference = me.calculateCircumference(dataset.data[index]);
			var centerX = (chartArea.left + chartArea.right) / 2;
			var centerY = (chartArea.top + chartArea.bottom) / 2;

			// If there is NaN data before us, we need to calculate the starting angle correctly.
			// We could be way more efficient here, but its unlikely that the polar area chart will have a lot of data
			var visibleCount = 0;
			var meta = me.getMeta();
			for (var i = 0; i < index; ++i) {
				if (!isNaN(dataset.data[i]) && !meta.data[i].hidden) {
					++visibleCount;
				}
			}

			var negHalfPI = -0.5 * Math.PI;
			var distance = arc.hidden ? 0 : scale.getDistanceFromCenterForValue(dataset.data[index]);
			var startAngle = (negHalfPI) + (circumference * visibleCount);
			var endAngle = startAngle + (arc.hidden ? 0 : circumference);

			var resetRadius = animationOpts.animateScale ? 0 : scale.getDistanceFromCenterForValue(dataset.data[index]);

			helpers.extend(arc, {
				// Utility
				_datasetIndex: me.index,
				_index: index,
				_scale: scale,

				// Desired view properties
				_model: {
					x: centerX,
					y: centerY,
					innerRadius: 0,
					outerRadius: reset ? resetRadius : distance,
					startAngle: reset && animationOpts.animateRotate ? negHalfPI : startAngle,
					endAngle: reset && animationOpts.animateRotate ? negHalfPI : endAngle,
					label: getValueAtIndexOrDefault(labels, index, labels[index])
				}
			});

			// Apply border and fill style
			me.removeHoverStyle(arc);

			arc.pivot();
		},

		removeHoverStyle: function(arc) {
			Chart.DatasetController.prototype.removeHoverStyle.call(this, arc, this.chart.options.elements.arc);
		},

		countVisibleElements: function() {
			var dataset = this.getDataset();
			var meta = this.getMeta();
			var count = 0;

			helpers.each(meta.data, function(element, index) {
				if (!isNaN(dataset.data[index]) && !element.hidden) {
					count++;
				}
			});

			return count;
		},

		calculateCircumference: function(value) {
			var count = this.getMeta().count;
			if (count > 0 && !isNaN(value)) {
				return (2 * Math.PI) / count;
			} else {
				return 0;
			}
		}
	});
};

},{}],16:[function(require,module,exports){
"use strict";

module.exports = function(Chart) {

	var helpers = Chart.helpers;

	Chart.defaults.radar = {
		scale: {
			type: "radialLinear"
		},
		elements: {
			line: {
				tension: 0 // no bezier in radar
			}
		}
	};

	Chart.controllers.radar = Chart.DatasetController.extend({

		datasetElementType: Chart.elements.Line,

		dataElementType: Chart.elements.Point,

		linkScales: helpers.noop,

		addElementAndReset: function(index) {
			Chart.DatasetController.prototype.addElementAndReset.call(this, index);

			// Make sure bezier control points are updated
			this.updateBezierControlPoints();
		},

		update: function update(reset) {
			var me = this;
			var meta = me.getMeta();
			var line = meta.dataset;
			var points = meta.data;
			var custom = line.custom || {};
			var dataset = me.getDataset();
			var lineElementOptions = me.chart.options.elements.line;
			var scale = me.chart.scale;

			// Compatibility: If the properties are defined with only the old name, use those values
			if ((dataset.tension !== undefined) && (dataset.lineTension === undefined)) {
				dataset.lineTension = dataset.tension;
			}

			helpers.extend(meta.dataset, {
				// Utility
				_datasetIndex: me.index,
				// Data
				_children: points,
				_loop: true,
				// Model
				_model: {
					// Appearance
					tension: custom.tension ? custom.tension : helpers.getValueOrDefault(dataset.lineTension, lineElementOptions.tension),
					backgroundColor: custom.backgroundColor ? custom.backgroundColor : (dataset.backgroundColor || lineElementOptions.backgroundColor),
					borderWidth: custom.borderWidth ? custom.borderWidth : (dataset.borderWidth || lineElementOptions.borderWidth),
					borderColor: custom.borderColor ? custom.borderColor : (dataset.borderColor || lineElementOptions.borderColor),
					fill: custom.fill ? custom.fill : (dataset.fill !== undefined ? dataset.fill : lineElementOptions.fill),
					borderCapStyle: custom.borderCapStyle ? custom.borderCapStyle : (dataset.borderCapStyle || lineElementOptions.borderCapStyle),
					borderDash: custom.borderDash ? custom.borderDash : (dataset.borderDash || lineElementOptions.borderDash),
					borderDashOffset: custom.borderDashOffset ? custom.borderDashOffset : (dataset.borderDashOffset || lineElementOptions.borderDashOffset),
					borderJoinStyle: custom.borderJoinStyle ? custom.borderJoinStyle : (dataset.borderJoinStyle || lineElementOptions.borderJoinStyle),

					// Scale
					scaleTop: scale.top,
					scaleBottom: scale.bottom,
					scaleZero: scale.getBasePosition()
				}
			});

			meta.dataset.pivot();

			// Update Points
			helpers.each(points, function(point, index) {
				me.updateElement(point, index, reset);
			}, me);


			// Update bezier control points
			me.updateBezierControlPoints();
		},
		updateElement: function(point, index, reset) {
			var me = this;
			var custom = point.custom || {};
			var dataset = me.getDataset();
			var scale = me.chart.scale;
			var pointElementOptions = me.chart.options.elements.point;
			var pointPosition = scale.getPointPositionForValue(index, dataset.data[index]);

			helpers.extend(point, {
				// Utility
				_datasetIndex: me.index,
				_index: index,
				_scale: scale,

				// Desired view properties
				_model: {
					x: reset ? scale.xCenter : pointPosition.x, // value not used in dataset scale, but we want a consistent API between scales
					y: reset ? scale.yCenter : pointPosition.y,

					// Appearance
					tension: custom.tension ? custom.tension : helpers.getValueOrDefault(dataset.tension, me.chart.options.elements.line.tension),
					radius: custom.radius ? custom.radius : helpers.getValueAtIndexOrDefault(dataset.pointRadius, index, pointElementOptions.radius),
					backgroundColor: custom.backgroundColor ? custom.backgroundColor : helpers.getValueAtIndexOrDefault(dataset.pointBackgroundColor, index, pointElementOptions.backgroundColor),
					borderColor: custom.borderColor ? custom.borderColor : helpers.getValueAtIndexOrDefault(dataset.pointBorderColor, index, pointElementOptions.borderColor),
					borderWidth: custom.borderWidth ? custom.borderWidth : helpers.getValueAtIndexOrDefault(dataset.pointBorderWidth, index, pointElementOptions.borderWidth),
					pointStyle: custom.pointStyle ? custom.pointStyle : helpers.getValueAtIndexOrDefault(dataset.pointStyle, index, pointElementOptions.pointStyle),

					// Tooltip
					hitRadius: custom.hitRadius ? custom.hitRadius : helpers.getValueAtIndexOrDefault(dataset.hitRadius, index, pointElementOptions.hitRadius)
				}
			});

			point._model.skip = custom.skip ? custom.skip : (isNaN(point._model.x) || isNaN(point._model.y));
		},
		updateBezierControlPoints: function() {
			var chartArea = this.chart.chartArea;
			var meta = this.getMeta();

			helpers.each(meta.data, function(point, index) {
				var model = point._model;
				var controlPoints = helpers.splineCurve(
					helpers.previousItem(meta.data, index, true)._model,
					model,
					helpers.nextItem(meta.data, index, true)._model,
					model.tension
				);

				// Prevent the bezier going outside of the bounds of the graph
				model.controlPointPreviousX = Math.max(Math.min(controlPoints.previous.x, chartArea.right), chartArea.left);
				model.controlPointPreviousY = Math.max(Math.min(controlPoints.previous.y, chartArea.bottom), chartArea.top);

				model.controlPointNextX = Math.max(Math.min(controlPoints.next.x, chartArea.right), chartArea.left);
				model.controlPointNextY = Math.max(Math.min(controlPoints.next.y, chartArea.bottom), chartArea.top);

				// Now pivot the point for animation
				point.pivot();
			});
		},

		draw: function(ease) {
			var meta = this.getMeta();
			var easingDecimal = ease || 1;

			// Transition Point Locations
			helpers.each(meta.data, function(point, index) {
				point.transition(easingDecimal);
			});

			// Transition and Draw the line
			meta.dataset.transition(easingDecimal).draw();

			// Draw the points
			helpers.each(meta.data, function(point) {
				point.draw();
			});
		},

		setHoverStyle: function(point) {
			// Point
			var dataset = this.chart.data.datasets[point._datasetIndex];
			var custom = point.custom || {};
			var index = point._index;
			var model = point._model;

			model.radius = custom.hoverRadius ? custom.hoverRadius : helpers.getValueAtIndexOrDefault(dataset.pointHoverRadius, index, this.chart.options.elements.point.hoverRadius);
			model.backgroundColor = custom.hoverBackgroundColor ? custom.hoverBackgroundColor : helpers.getValueAtIndexOrDefault(dataset.pointHoverBackgroundColor, index, helpers.getHoverColor(model.backgroundColor));
			model.borderColor = custom.hoverBorderColor ? custom.hoverBorderColor : helpers.getValueAtIndexOrDefault(dataset.pointHoverBorderColor, index, helpers.getHoverColor(model.borderColor));
			model.borderWidth = custom.hoverBorderWidth ? custom.hoverBorderWidth : helpers.getValueAtIndexOrDefault(dataset.pointHoverBorderWidth, index, model.borderWidth);
		},

		removeHoverStyle: function(point) {
			var dataset = this.chart.data.datasets[point._datasetIndex];
			var custom = point.custom || {};
			var index = point._index;
			var model = point._model;
			var pointElementOptions = this.chart.options.elements.point;

			model.radius = custom.radius ? custom.radius : helpers.getValueAtIndexOrDefault(dataset.radius, index, pointElementOptions.radius);
			model.backgroundColor = custom.backgroundColor ? custom.backgroundColor : helpers.getValueAtIndexOrDefault(dataset.pointBackgroundColor, index, pointElementOptions.backgroundColor);
			model.borderColor = custom.borderColor ? custom.borderColor : helpers.getValueAtIndexOrDefault(dataset.pointBorderColor, index, pointElementOptions.borderColor);
			model.borderWidth = custom.borderWidth ? custom.borderWidth : helpers.getValueAtIndexOrDefault(dataset.pointBorderWidth, index, pointElementOptions.borderWidth);
		}
	});
};

},{}],17:[function(require,module,exports){
/*global window: false */
"use strict";

module.exports = function(Chart) {

	var helpers = Chart.helpers;

	Chart.defaults.global.animation = {
		duration: 1000,
		easing: "easeOutQuart",
		onProgress: helpers.noop,
		onComplete: helpers.noop
	};

	Chart.Animation = Chart.Element.extend({
		currentStep: null, // the current animation step
		numSteps: 60, // default number of steps
		easing: "", // the easing to use for this animation
		render: null, // render function used by the animation service

		onAnimationProgress: null, // user specified callback to fire on each step of the animation
		onAnimationComplete: null // user specified callback to fire when the animation finishes
	});

	Chart.animationService = {
		frameDuration: 17,
		animations: [],
		dropFrames: 0,
		request: null,
		addAnimation: function(chartInstance, animationObject, duration, lazy) {
			var me = this;

			if (!lazy) {
				chartInstance.animating = true;
			}

			for (var index = 0; index < me.animations.length; ++index) {
				if (me.animations[index].chartInstance === chartInstance) {
					// replacing an in progress animation
					me.animations[index].animationObject = animationObject;
					return;
				}
			}

			me.animations.push({
				chartInstance: chartInstance,
				animationObject: animationObject
			});

			// If there are no animations queued, manually kickstart a digest, for lack of a better word
			if (me.animations.length === 1) {
				me.requestAnimationFrame();
			}
		},
		// Cancel the animation for a given chart instance
		cancelAnimation: function(chartInstance) {
			var index = helpers.findIndex(this.animations, function(animationWrapper) {
				return animationWrapper.chartInstance === chartInstance;
			});

			if (index !== -1) {
				this.animations.splice(index, 1);
				chartInstance.animating = false;
			}
		},
		requestAnimationFrame: function() {
			var me = this;
			if (me.request === null) {
				// Skip animation frame requests until the active one is executed.
				// This can happen when processing mouse events, e.g. 'mousemove'
				// and 'mouseout' events will trigger multiple renders.
				me.request = helpers.requestAnimFrame.call(window, function() {
					me.request = null;
					me.startDigest();
				});
			}
		},
		startDigest: function() {
			var me = this;

			var startTime = Date.now();
			var framesToDrop = 0;

			if (me.dropFrames > 1) {
				framesToDrop = Math.floor(me.dropFrames);
				me.dropFrames = me.dropFrames % 1;
			}

			var i = 0;
			while (i < me.animations.length) {
				if (me.animations[i].animationObject.currentStep === null) {
					me.animations[i].animationObject.currentStep = 0;
				}

				me.animations[i].animationObject.currentStep += 1 + framesToDrop;

				if (me.animations[i].animationObject.currentStep > me.animations[i].animationObject.numSteps) {
					me.animations[i].animationObject.currentStep = me.animations[i].animationObject.numSteps;
				}

				me.animations[i].animationObject.render(me.animations[i].chartInstance, me.animations[i].animationObject);
				if (me.animations[i].animationObject.onAnimationProgress && me.animations[i].animationObject.onAnimationProgress.call) {
					me.animations[i].animationObject.onAnimationProgress.call(me.animations[i].chartInstance, me.animations[i]);
				}

				if (me.animations[i].animationObject.currentStep === me.animations[i].animationObject.numSteps) {
					if (me.animations[i].animationObject.onAnimationComplete && me.animations[i].animationObject.onAnimationComplete.call) {
						me.animations[i].animationObject.onAnimationComplete.call(me.animations[i].chartInstance, me.animations[i]);
					}

					// executed the last frame. Remove the animation.
					me.animations[i].chartInstance.animating = false;

					me.animations.splice(i, 1);
				} else {
					++i;
				}
			}

			var endTime = Date.now();
			var dropFrames = (endTime - startTime) / me.frameDuration;

			me.dropFrames += dropFrames;

			// Do we have more stuff to animate?
			if (me.animations.length > 0) {
				me.requestAnimationFrame();
			}
		}
	};
};
},{}],18:[function(require,module,exports){
"use strict";

module.exports = function(Chart) {

	var helpers = Chart.helpers;
	//Create a dictionary of chart types, to allow for extension of existing types
	Chart.types = {};

	//Store a reference to each instance - allowing us to globally resize chart instances on window resize.
	//Destroy method on the chart will remove the instance of the chart from this reference.
	Chart.instances = {};

	// Controllers available for dataset visualization eg. bar, line, slice, etc.
	Chart.controllers = {};

	/**
	 * @class Chart.Controller
	 * The main controller of a chart.
	 */
	Chart.Controller = function(instance) {

		this.chart = instance;
		this.config = instance.config;
		this.options = this.config.options = helpers.configMerge(Chart.defaults.global, Chart.defaults[this.config.type], this.config.options || {});
		this.id = helpers.uid();

		Object.defineProperty(this, 'data', {
			get: function() {
				return this.config.data;
			}
		});

		//Add the chart instance to the global namespace
		Chart.instances[this.id] = this;

		if (this.options.responsive) {
			// Silent resize before chart draws
			this.resize(true);
		}

		this.initialize();

		return this;
	};

	helpers.extend(Chart.Controller.prototype, /** @lends Chart.Controller */ {

		initialize: function initialize() {
			var me = this;
			// Before init plugin notification
			Chart.plugins.notify('beforeInit', [me]);

			me.bindEvents();

			// Make sure controllers are built first so that each dataset is bound to an axis before the scales
			// are built
			me.ensureScalesHaveIDs();
			me.buildOrUpdateControllers();
			me.buildScales();
			me.updateLayout();
			me.resetElements();
			me.initToolTip();
			me.update();

			// After init plugin notification
			Chart.plugins.notify('afterInit', [me]);

			return me;
		},

		clear: function clear() {
			helpers.clear(this.chart);
			return this;
		},

		stop: function stop() {
			// Stops any current animation loop occuring
			Chart.animationService.cancelAnimation(this);
			return this;
		},

		resize: function resize(silent) {
			var me = this;
			var chart = me.chart;
			var canvas = chart.canvas;
			var newWidth = helpers.getMaximumWidth(canvas);
			var aspectRatio = chart.aspectRatio;
			var newHeight = (me.options.maintainAspectRatio && isNaN(aspectRatio) === false && isFinite(aspectRatio) && aspectRatio !== 0) ? newWidth / aspectRatio : helpers.getMaximumHeight(canvas);

			var sizeChanged = chart.width !== newWidth || chart.height !== newHeight;

			if (!sizeChanged) {
				return me;
			}

			canvas.width = chart.width = newWidth;
			canvas.height = chart.height = newHeight;

			helpers.retinaScale(chart);

			// Notify any plugins about the resize
			var newSize = { width: newWidth, height: newHeight };
			Chart.plugins.notify('resize', [me, newSize]);

			// Notify of resize
			if (me.options.onResize) {
				me.options.onResize(me, newSize);
			}

			if (!silent) {
				me.stop();
				me.update(me.options.responsiveAnimationDuration);
			}

			return me;
		},

		ensureScalesHaveIDs: function ensureScalesHaveIDs() {
			var options = this.options;
			var scalesOptions = options.scales || {};
			var scaleOptions = options.scale;

			helpers.each(scalesOptions.xAxes, function(xAxisOptions, index) {
				xAxisOptions.id = xAxisOptions.id || ('x-axis-' + index);
			});

			helpers.each(scalesOptions.yAxes, function(yAxisOptions, index) {
				yAxisOptions.id = yAxisOptions.id || ('y-axis-' + index);
			});

			if (scaleOptions) {
				scaleOptions.id = scaleOptions.id || 'scale';
			}
		},

		/**
		 * Builds a map of scale ID to scale object for future lookup.
		 */
		buildScales: function buildScales() {
			var me = this;
			var options = me.options;
			var scales = me.scales = {};
			var items = [];

			if (options.scales) {
				items = items.concat(
					(options.scales.xAxes || []).map(function(xAxisOptions) {
						return { options: xAxisOptions, dtype: 'category' }; }),
					(options.scales.yAxes || []).map(function(yAxisOptions) {
						return { options: yAxisOptions, dtype: 'linear' }; }));
			}

			if (options.scale) {
				items.push({ options: options.scale, dtype: 'radialLinear', isDefault: true });
			}

			helpers.each(items, function(item, index) {
				var scaleOptions = item.options;
				var scaleType = helpers.getValueOrDefault(scaleOptions.type, item.dtype);
				var scaleClass = Chart.scaleService.getScaleConstructor(scaleType);
				if (!scaleClass) {
					return;
				}

				var scale = new scaleClass({
					id: scaleOptions.id,
					options: scaleOptions,
					ctx: me.chart.ctx,
					chart: me
				});

				scales[scale.id] = scale;

				// TODO(SB): I think we should be able to remove this custom case (options.scale)
				// and consider it as a regular scale part of the "scales"" map only! This would
				// make the logic easier and remove some useless? custom code.
				if (item.isDefault) {
					me.scale = scale;
				}
			});

			Chart.scaleService.addScalesToLayout(this);
		},

		updateLayout: function() {
			Chart.layoutService.update(this, this.chart.width, this.chart.height);
		},

		buildOrUpdateControllers: function buildOrUpdateControllers() {
			var me = this;
			var types = [];
			var newControllers = [];

			helpers.each(me.data.datasets, function(dataset, datasetIndex) {
				var meta = me.getDatasetMeta(datasetIndex);
				if (!meta.type) {
					meta.type = dataset.type || me.config.type;
				}

				types.push(meta.type);

				if (meta.controller) {
					meta.controller.updateIndex(datasetIndex);
				} else {
					meta.controller = new Chart.controllers[meta.type](me, datasetIndex);
					newControllers.push(meta.controller);
				}
			}, me);

			if (types.length > 1) {
				for (var i = 1; i < types.length; i++) {
					if (types[i] !== types[i - 1]) {
						me.isCombo = true;
						break;
					}
				}
			}

			return newControllers;
		},

		resetElements: function resetElements() {
			var me = this;
			helpers.each(me.data.datasets, function(dataset, datasetIndex) {
				me.getDatasetMeta(datasetIndex).controller.reset();
			}, me);
		},

		update: function update(animationDuration, lazy) {
			var me = this;
			Chart.plugins.notify('beforeUpdate', [me]);

			// In case the entire data object changed
			me.tooltip._data = me.data;

			// Make sure dataset controllers are updated and new controllers are reset
			var newControllers = me.buildOrUpdateControllers();

			// Make sure all dataset controllers have correct meta data counts
			helpers.each(me.data.datasets, function(dataset, datasetIndex) {
				me.getDatasetMeta(datasetIndex).controller.buildOrUpdateElements();
			}, me);

			Chart.layoutService.update(me, me.chart.width, me.chart.height);

			// Apply changes to the dataets that require the scales to have been calculated i.e BorderColor chages
			Chart.plugins.notify('afterScaleUpdate', [me]);

			// Can only reset the new controllers after the scales have been updated
			helpers.each(newControllers, function(controller) {
				controller.reset();
			});

			me.updateDatasets();

			// Do this before render so that any plugins that need final scale updates can use it
			Chart.plugins.notify('afterUpdate', [me]);

			me.render(animationDuration, lazy);
		},

		/**
		 * @method beforeDatasetsUpdate
		 * @description Called before all datasets are updated. If a plugin returns false,
		 * the datasets update will be cancelled until another chart update is triggered.
		 * @param {Object} instance the chart instance being updated.
		 * @returns {Boolean} false to cancel the datasets update.
		 * @memberof Chart.PluginBase
		 * @since version 2.1.5
		 * @instance
		 */

		/**
		 * @method afterDatasetsUpdate
		 * @description Called after all datasets have been updated. Note that this
		 * extension will not be called if the datasets update has been cancelled.
		 * @param {Object} instance the chart instance being updated.
		 * @memberof Chart.PluginBase
		 * @since version 2.1.5
		 * @instance
		 */

		/**
		 * Updates all datasets unless a plugin returns false to the beforeDatasetsUpdate
		 * extension, in which case no datasets will be updated and the afterDatasetsUpdate
		 * notification will be skipped.
		 * @protected
		 * @instance
		 */
		updateDatasets: function() {
			var me = this;
			var i, ilen;

			if (Chart.plugins.notify('beforeDatasetsUpdate', [ me ])) {
				for (i = 0, ilen = me.data.datasets.length; i < ilen; ++i) {
					me.getDatasetMeta(i).controller.update();
				}

				Chart.plugins.notify('afterDatasetsUpdate', [ me ]);
			}
		},

		render: function render(duration, lazy) {
			var me = this;
			Chart.plugins.notify('beforeRender', [me]);

			var animationOptions = me.options.animation;
			if (animationOptions && ((typeof duration !== 'undefined' && duration !== 0) || (typeof duration === 'undefined' && animationOptions.duration !== 0))) {
				var animation = new Chart.Animation();
				animation.numSteps = (duration || animationOptions.duration) / 16.66; //60 fps
				animation.easing = animationOptions.easing;

				// render function
				animation.render = function(chartInstance, animationObject) {
					var easingFunction = helpers.easingEffects[animationObject.easing];
					var stepDecimal = animationObject.currentStep / animationObject.numSteps;
					var easeDecimal = easingFunction(stepDecimal);

					chartInstance.draw(easeDecimal, stepDecimal, animationObject.currentStep);
				};

				// user events
				animation.onAnimationProgress = animationOptions.onProgress;
				animation.onAnimationComplete = animationOptions.onComplete;

				Chart.animationService.addAnimation(me, animation, duration, lazy);
			} else {
				me.draw();
				if (animationOptions && animationOptions.onComplete && animationOptions.onComplete.call) {
					animationOptions.onComplete.call(me);
				}
			}
			return me;
		},

		draw: function(ease) {
			var me = this;
			var easingDecimal = ease || 1;
			me.clear();

			Chart.plugins.notify('beforeDraw', [me, easingDecimal]);

			// Draw all the scales
			helpers.each(me.boxes, function(box) {
				box.draw(me.chartArea);
			}, me);
			if (me.scale) {
				me.scale.draw();
			}

			Chart.plugins.notify('beforeDatasetsDraw', [me, easingDecimal]);

			// Draw each dataset via its respective controller (reversed to support proper line stacking)
			helpers.each(me.data.datasets, function(dataset, datasetIndex) {
				if (me.isDatasetVisible(datasetIndex)) {
					me.getDatasetMeta(datasetIndex).controller.draw(ease);
				}
			}, me, true);

			Chart.plugins.notify('afterDatasetsDraw', [me, easingDecimal]);

			// Finally draw the tooltip
			me.tooltip.transition(easingDecimal).draw();

			Chart.plugins.notify('afterDraw', [me, easingDecimal]);
		},

		// Get the single element that was clicked on
		// @return : An object containing the dataset index and element index of the matching element. Also contains the rectangle that was draw
		getElementAtEvent: function(e) {
			var me = this;
			var eventPosition = helpers.getRelativePosition(e, me.chart);
			var elementsArray = [];

			helpers.each(me.data.datasets, function(dataset, datasetIndex) {
				if (me.isDatasetVisible(datasetIndex)) {
					var meta = me.getDatasetMeta(datasetIndex);
					helpers.each(meta.data, function(element, index) {
						if (element.inRange(eventPosition.x, eventPosition.y)) {
							elementsArray.push(element);
							return elementsArray;
						}
					});
				}
			});

			return elementsArray;
		},

		getElementsAtEvent: function(e) {
			var me = this;
			var eventPosition = helpers.getRelativePosition(e, me.chart);
			var elementsArray = [];

			var found = (function() {
				if (me.data.datasets) {
					for (var i = 0; i < me.data.datasets.length; i++) {
						var meta = me.getDatasetMeta(i);
						if (me.isDatasetVisible(i)) {
							for (var j = 0; j < meta.data.length; j++) {
								if (meta.data[j].inRange(eventPosition.x, eventPosition.y)) {
									return meta.data[j];
								}
							}
						}
					}
				}
			}).call(me);

			if (!found) {
				return elementsArray;
			}

			helpers.each(me.data.datasets, function(dataset, datasetIndex) {
				if (me.isDatasetVisible(datasetIndex)) {
					var meta = me.getDatasetMeta(datasetIndex);
					elementsArray.push(meta.data[found._index]);
				}
			}, me);

			return elementsArray;
		},

		getElementsAtEventForMode: function(e, mode) {
			var me = this;
			switch (mode) {
			case 'single':
				return me.getElementAtEvent(e);
			case 'label':
				return me.getElementsAtEvent(e);
			case 'dataset':
				return me.getDatasetAtEvent(e);
			default:
				return e;
			}
		},

		getDatasetAtEvent: function(e) {
			var elementsArray = this.getElementAtEvent(e);

			if (elementsArray.length > 0) {
				elementsArray = this.getDatasetMeta(elementsArray[0]._datasetIndex).data;
			}

			return elementsArray;
		},

		getDatasetMeta: function(datasetIndex) {
			var me = this;
			var dataset = me.data.datasets[datasetIndex];
			if (!dataset._meta) {
				dataset._meta = {};
			}

			var meta = dataset._meta[me.id];
			if (!meta) {
				meta = dataset._meta[me.id] = {
				type: null,
				data: [],
				dataset: null,
				controller: null,
				hidden: null,			// See isDatasetVisible() comment
				xAxisID: null,
				yAxisID: null
			};
			}

			return meta;
		},

		getVisibleDatasetCount: function() {
			var count = 0;
			for (var i = 0, ilen = this.data.datasets.length; i<ilen; ++i) {
				 if (this.isDatasetVisible(i)) {
					count++;
				}
			}
			return count;
		},

		isDatasetVisible: function(datasetIndex) {
			var meta = this.getDatasetMeta(datasetIndex);

			// meta.hidden is a per chart dataset hidden flag override with 3 states: if true or false,
			// the dataset.hidden value is ignored, else if null, the dataset hidden state is returned.
			return typeof meta.hidden === 'boolean'? !meta.hidden : !this.data.datasets[datasetIndex].hidden;
		},

		generateLegend: function generateLegend() {
			return this.options.legendCallback(this);
		},

		destroy: function destroy() {
			var me = this;
			me.stop();
			me.clear();
			helpers.unbindEvents(me, me.events);
			helpers.removeResizeListener(me.chart.canvas.parentNode);

			// Reset canvas height/width attributes
			var canvas = me.chart.canvas;
			canvas.width = me.chart.width;
			canvas.height = me.chart.height;

			// if we scaled the canvas in response to a devicePixelRatio !== 1, we need to undo that transform here
			if (me.chart.originalDevicePixelRatio !== undefined) {
				me.chart.ctx.scale(1 / me.chart.originalDevicePixelRatio, 1 / me.chart.originalDevicePixelRatio);
			}

			// Reset to the old style since it may have been changed by the device pixel ratio changes
			canvas.style.width = me.chart.originalCanvasStyleWidth;
			canvas.style.height = me.chart.originalCanvasStyleHeight;

			Chart.plugins.notify('destroy', [me]);

			delete Chart.instances[me.id];
		},

		toBase64Image: function toBase64Image() {
			return this.chart.canvas.toDataURL.apply(this.chart.canvas, arguments);
		},

		initToolTip: function initToolTip() {
			var me = this;
			me.tooltip = new Chart.Tooltip({
				_chart: me.chart,
				_chartInstance: me,
				_data: me.data,
				_options: me.options.tooltips
			}, me);
		},

		bindEvents: function bindEvents() {
			var me = this;
			helpers.bindEvents(me, me.options.events, function(evt) {
				me.eventHandler(evt);
			});
		},

		updateHoverStyle: function(elements, mode, enabled) {
			var method = enabled? 'setHoverStyle' : 'removeHoverStyle';
			var element, i, ilen;

			switch (mode) {
			case 'single':
				elements = [ elements[0] ];
				break;
			case 'label':
			case 'dataset':
				// elements = elements;
				break;
			default:
				// unsupported mode
				return;
			}

			for (i=0, ilen=elements.length; i<ilen; ++i) {
				element = elements[i];
				if (element) {
					this.getDatasetMeta(element._datasetIndex).controller[method](element);
				}
			}
		},

		eventHandler: function eventHandler(e) {
			var me = this;
			var tooltip = me.tooltip;
			var options = me.options || {};
			var hoverOptions = options.hover;
			var tooltipsOptions = options.tooltips;

			me.lastActive = me.lastActive || [];
			me.lastTooltipActive = me.lastTooltipActive || [];

			// Find Active Elements for hover and tooltips
			if (e.type === 'mouseout') {
				me.active = [];
				me.tooltipActive = [];
			} else {
				me.active = me.getElementsAtEventForMode(e, hoverOptions.mode);
				me.tooltipActive =  me.getElementsAtEventForMode(e, tooltipsOptions.mode);
			}

			// On Hover hook
			if (hoverOptions.onHover) {
				hoverOptions.onHover.call(me, me.active);
			}

			if (e.type === 'mouseup' || e.type === 'click') {
				if (options.onClick) {
					options.onClick.call(me, e, me.active);
				}
				if (me.legend && me.legend.handleEvent) {
					me.legend.handleEvent(e);
				}
			}

			// Remove styling for last active (even if it may still be active)
			if (me.lastActive.length) {
				me.updateHoverStyle(me.lastActive, hoverOptions.mode, false);
			}

			// Built in hover styling
			if (me.active.length && hoverOptions.mode) {
				me.updateHoverStyle(me.active, hoverOptions.mode, true);
			}

			// Built in Tooltips
			if (tooltipsOptions.enabled || tooltipsOptions.custom) {
				tooltip.initialize();
				tooltip._active = me.tooltipActive;
				tooltip.update(true);
			}

			// Hover animations
			tooltip.pivot();

			if (!me.animating) {
				// If entering, leaving, or changing elements, animate the change via pivot
				if (!helpers.arrayEquals(me.active, me.lastActive) ||
					!helpers.arrayEquals(me.tooltipActive, me.lastTooltipActive)) {

					me.stop();

					if (tooltipsOptions.enabled || tooltipsOptions.custom) {
						tooltip.update(true);
					}

					// We only need to render at this point. Updating will cause scales to be
					// recomputed generating flicker & using more memory than necessary.
					me.render(hoverOptions.animationDuration, true);
				}
			}

			// Remember Last Actives
			me.lastActive = me.active;
			me.lastTooltipActive = me.tooltipActive;
			return me;
		}
	});
};

},{}],19:[function(require,module,exports){
"use strict";

module.exports = function(Chart) {

	var helpers = Chart.helpers;
	var noop = helpers.noop;

	// Base class for all dataset controllers (line, bar, etc)
	Chart.DatasetController = function(chart, datasetIndex) {
		this.initialize.call(this, chart, datasetIndex);
	};

	helpers.extend(Chart.DatasetController.prototype, {

		/**
		 * Element type used to generate a meta dataset (e.g. Chart.element.Line).
		 * @type {Chart.core.element}
		 */
		datasetElementType: null,

		/**
		 * Element type used to generate a meta data (e.g. Chart.element.Point).
		 * @type {Chart.core.element}
		 */
		dataElementType: null,

		initialize: function(chart, datasetIndex) {
			var me = this;
			me.chart = chart;
			me.index = datasetIndex;
			me.linkScales();
			me.addElements();
		},

		updateIndex: function(datasetIndex) {
			this.index = datasetIndex;
		},

		linkScales: function() {
			var me = this;
			var meta = me.getMeta();
			var dataset = me.getDataset();

			if (meta.xAxisID === null) {
				meta.xAxisID = dataset.xAxisID || me.chart.options.scales.xAxes[0].id;
			}
			if (meta.yAxisID === null) {
				meta.yAxisID = dataset.yAxisID || me.chart.options.scales.yAxes[0].id;
			}
		},

		getDataset: function() {
			return this.chart.data.datasets[this.index];
		},

		getMeta: function() {
			return this.chart.getDatasetMeta(this.index);
		},

		getScaleForId: function(scaleID) {
			return this.chart.scales[scaleID];
		},

		reset: function() {
			this.update(true);
		},

		createMetaDataset: function() {
			var me = this;
			var type = me.datasetElementType;
			return type && new type({
				_chart: me.chart.chart,
				_datasetIndex: me.index
			});
		},

		createMetaData: function(index) {
			var me = this;
			var type = me.dataElementType;
			return type && new type({
				_chart: me.chart.chart,
				_datasetIndex: me.index,
				_index: index
			});
		},

		addElements: function() {
			var me = this;
			var meta = me.getMeta();
			var data = me.getDataset().data || [];
			var metaData = meta.data;
			var i, ilen;

			for (i=0, ilen=data.length; i<ilen; ++i) {
				metaData[i] = metaData[i] || me.createMetaData(meta, i);
			}

			meta.dataset = meta.dataset || me.createMetaDataset();
		},

		addElementAndReset: function(index) {
			var me = this;
			var element = me.createMetaData(index);
			me.getMeta().data.splice(index, 0, element);
			me.updateElement(element, index, true);
		},

		buildOrUpdateElements: function buildOrUpdateElements() {
			// Handle the number of data points changing
			var meta = this.getMeta(),
				md = meta.data,
				numData = this.getDataset().data.length,
				numMetaData = md.length;

			// Make sure that we handle number of datapoints changing
			if (numData < numMetaData) {
				// Remove excess bars for data points that have been removed
				md.splice(numData, numMetaData - numData);
			} else if (numData > numMetaData) {
				// Add new elements
				for (var index = numMetaData; index < numData; ++index) {
					this.addElementAndReset(index);
				}
			}
		},

		update: noop,

		draw: function(ease) {
			var easingDecimal = ease || 1;
			helpers.each(this.getMeta().data, function(element, index) {
				element.transition(easingDecimal).draw();
			});
		},

		removeHoverStyle: function(element, elementOpts) {
			var dataset = this.chart.data.datasets[element._datasetIndex],
				index = element._index,
				custom = element.custom || {},
				valueOrDefault = helpers.getValueAtIndexOrDefault,
				color = helpers.color,
				model = element._model;

			model.backgroundColor = custom.backgroundColor ? custom.backgroundColor : valueOrDefault(dataset.backgroundColor, index, elementOpts.backgroundColor);
			model.borderColor = custom.borderColor ? custom.borderColor : valueOrDefault(dataset.borderColor, index, elementOpts.borderColor);
			model.borderWidth = custom.borderWidth ? custom.borderWidth : valueOrDefault(dataset.borderWidth, index, elementOpts.borderWidth);
		},

		setHoverStyle: function(element) {
			var dataset = this.chart.data.datasets[element._datasetIndex],
				index = element._index,
				custom = element.custom || {},
				valueOrDefault = helpers.getValueAtIndexOrDefault,
				color = helpers.color,
				getHoverColor = helpers.getHoverColor,
				model = element._model;

			model.backgroundColor = custom.hoverBackgroundColor ? custom.hoverBackgroundColor : valueOrDefault(dataset.hoverBackgroundColor, index, getHoverColor(model.backgroundColor));
			model.borderColor = custom.hoverBorderColor ? custom.hoverBorderColor : valueOrDefault(dataset.hoverBorderColor, index, getHoverColor(model.borderColor));
			model.borderWidth = custom.hoverBorderWidth ? custom.hoverBorderWidth : valueOrDefault(dataset.hoverBorderWidth, index, model.borderWidth);
		}
	});

	Chart.DatasetController.extend = helpers.inherits;
};
},{}],20:[function(require,module,exports){
"use strict";

module.exports = function(Chart) {

  var helpers = Chart.helpers;

  Chart.elements = {};

  Chart.Element = function(configuration) {
    helpers.extend(this, configuration);
    this.initialize.apply(this, arguments);
  };

  helpers.extend(Chart.Element.prototype, {

    initialize: function() {
      this.hidden = false;
    },

    pivot: function() {
      var me = this;
      if (!me._view) {
        me._view = helpers.clone(me._model);
      }
      me._start = helpers.clone(me._view);
      return me;
    },

    transition: function(ease) {
      var me = this;
      
      if (!me._view) {
        me._view = helpers.clone(me._model);
      }

      // No animation -> No Transition
      if (ease === 1) {
        me._view = me._model;
        me._start = null;
        return me;
      }

      if (!me._start) {
        me.pivot();
      }

      helpers.each(me._model, function(value, key) {

        if (key[0] === '_') {
          // Only non-underscored properties
        }

        // Init if doesn't exist
        else if (!me._view.hasOwnProperty(key)) {
          if (typeof value === 'number' && !isNaN(me._view[key])) {
            me._view[key] = value * ease;
          } else {
            me._view[key] = value;
          }
        }

        // No unnecessary computations
        else if (value === me._view[key]) {
          // It's the same! Woohoo!
        }

        // Color transitions if possible
        else if (typeof value === 'string') {
          try {
            var color = helpers.color(me._model[key]).mix(helpers.color(me._start[key]), ease);
            me._view[key] = color.rgbString();
          } catch (err) {
            me._view[key] = value;
          }
        }
        // Number transitions
        else if (typeof value === 'number') {
          var startVal = me._start[key] !== undefined && isNaN(me._start[key]) === false ? me._start[key] : 0;
          me._view[key] = ((me._model[key] - startVal) * ease) + startVal;
        }
        // Everything else
        else {
          me._view[key] = value;
        }
      }, me);

      return me;
    },

    tooltipPosition: function() {
      return {
        x: this._model.x,
        y: this._model.y
      };
    },

    hasValue: function() {
      return helpers.isNumber(this._model.x) && helpers.isNumber(this._model.y);
    }
  });

  Chart.Element.extend = helpers.inherits;

};

},{}],21:[function(require,module,exports){
/*global window: false */
/*global document: false */
"use strict";

var color = require('chartjs-color');

module.exports = function(Chart) {
	//Global Chart helpers object for utility methods and classes
	var helpers = Chart.helpers = {};

	//-- Basic js utility methods
	helpers.each = function(loopable, callback, self, reverse) {
		// Check to see if null or undefined firstly.
		var i, len;
		if (helpers.isArray(loopable)) {
			len = loopable.length;
			if (reverse) {
				for (i = len - 1; i >= 0; i--) {
					callback.call(self, loopable[i], i);
				}
			} else {
				for (i = 0; i < len; i++) {
					callback.call(self, loopable[i], i);
				}
			}
		} else if (typeof loopable === 'object') {
			var keys = Object.keys(loopable);
			len = keys.length;
			for (i = 0; i < len; i++) {
				callback.call(self, loopable[keys[i]], keys[i]);
			}
		}
	};
	helpers.clone = function(obj) {
		var objClone = {};
		helpers.each(obj, function(value, key) {
			if (helpers.isArray(value)) {
				objClone[key] = value.slice(0);
			} else if (typeof value === 'object' && value !== null) {
				objClone[key] = helpers.clone(value);
			} else {
				objClone[key] = value;
			}
		});
		return objClone;
	};
	helpers.extend = function(base) {
		var setFn = function(value, key) { base[key] = value; };
		for (var i = 1, ilen = arguments.length; i < ilen; i++) {
			helpers.each(arguments[i], setFn);
		}
		return base;
	};
	// Need a special merge function to chart configs since they are now grouped
	helpers.configMerge = function(_base) {
		var base = helpers.clone(_base);
		helpers.each(Array.prototype.slice.call(arguments, 1), function(extension) {
			helpers.each(extension, function(value, key) {
				if (key === 'scales') {
					// Scale config merging is complex. Add out own function here for that
					base[key] = helpers.scaleMerge(base.hasOwnProperty(key) ? base[key] : {}, value);

				} else if (key === 'scale') {
					// Used in polar area & radar charts since there is only one scale
					base[key] = helpers.configMerge(base.hasOwnProperty(key) ? base[key] : {}, Chart.scaleService.getScaleDefaults(value.type), value);
				} else if (base.hasOwnProperty(key) && helpers.isArray(base[key]) && helpers.isArray(value)) {
					// In this case we have an array of objects replacing another array. Rather than doing a strict replace,
					// merge. This allows easy scale option merging
					var baseArray = base[key];

					helpers.each(value, function(valueObj, index) {

						if (index < baseArray.length) {
							if (typeof baseArray[index] === 'object' && baseArray[index] !== null && typeof valueObj === 'object' && valueObj !== null) {
								// Two objects are coming together. Do a merge of them.
								baseArray[index] = helpers.configMerge(baseArray[index], valueObj);
							} else {
								// Just overwrite in this case since there is nothing to merge
								baseArray[index] = valueObj;
							}
						} else {
							baseArray.push(valueObj); // nothing to merge
						}
					});

				} else if (base.hasOwnProperty(key) && typeof base[key] === "object" && base[key] !== null && typeof value === "object") {
					// If we are overwriting an object with an object, do a merge of the properties.
					base[key] = helpers.configMerge(base[key], value);

				} else {
					// can just overwrite the value in this case
					base[key] = value;
				}
			});
		});

		return base;
	};
	helpers.scaleMerge = function(_base, extension) {
		var base = helpers.clone(_base);

		helpers.each(extension, function(value, key) {
			if (key === 'xAxes' || key === 'yAxes') {
				// These properties are arrays of items
				if (base.hasOwnProperty(key)) {
					helpers.each(value, function(valueObj, index) {
						var axisType = helpers.getValueOrDefault(valueObj.type, key === 'xAxes' ? 'category' : 'linear');
						var axisDefaults = Chart.scaleService.getScaleDefaults(axisType);
						if (index >= base[key].length || !base[key][index].type) {
							base[key].push(helpers.configMerge(axisDefaults, valueObj));
						} else if (valueObj.type && valueObj.type !== base[key][index].type) {
							// Type changed. Bring in the new defaults before we bring in valueObj so that valueObj can override the correct scale defaults
							base[key][index] = helpers.configMerge(base[key][index], axisDefaults, valueObj);
						} else {
							// Type is the same
							base[key][index] = helpers.configMerge(base[key][index], valueObj);
						}
					});
				} else {
					base[key] = [];
					helpers.each(value, function(valueObj) {
						var axisType = helpers.getValueOrDefault(valueObj.type, key === 'xAxes' ? 'category' : 'linear');
						base[key].push(helpers.configMerge(Chart.scaleService.getScaleDefaults(axisType), valueObj));
					});
				}
			} else if (base.hasOwnProperty(key) && typeof base[key] === "object" && base[key] !== null && typeof value === "object") {
				// If we are overwriting an object with an object, do a merge of the properties.
				base[key] = helpers.configMerge(base[key], value);

			} else {
				// can just overwrite the value in this case
				base[key] = value;
			}
		});

		return base;
	};
	helpers.getValueAtIndexOrDefault = function(value, index, defaultValue) {
		if (value === undefined || value === null) {
			return defaultValue;
		}

		if (helpers.isArray(value)) {
			return index < value.length ? value[index] : defaultValue;
		}

		return value;
	};
	helpers.getValueOrDefault = function(value, defaultValue) {
		return value === undefined ? defaultValue : value;
	};
	helpers.indexOf = Array.prototype.indexOf?
		function(array, item) { return array.indexOf(item); } :
		function(array, item) {
			for (var i = 0, ilen = array.length; i < ilen; ++i) {
				if (array[i] === item) {
					return i;
				}
			}
			return -1;
		};
	helpers.where = function(collection, filterCallback) {
		if (helpers.isArray(collection) && Array.prototype.filter) {
			return collection.filter(filterCallback);
		} else {
			var filtered = [];

			helpers.each(collection, function(item) {
				if (filterCallback(item)) {
					filtered.push(item);
				}
			});

			return filtered;
		}
	};
	helpers.findIndex = Array.prototype.findIndex?
		function(array, callback, scope) { return array.findIndex(callback, scope); } :
		function(array, callback, scope) {
			scope = scope === undefined? array : scope;
			for (var i = 0, ilen = array.length; i < ilen; ++i) {
				if (callback.call(scope, array[i], i, array)) {
					return i;
				}
			}
			return -1;
		};
	helpers.findNextWhere = function(arrayToSearch, filterCallback, startIndex) {
		// Default to start of the array
		if (startIndex === undefined || startIndex === null) {
			startIndex = -1;
		}
		for (var i = startIndex + 1; i < arrayToSearch.length; i++) {
			var currentItem = arrayToSearch[i];
			if (filterCallback(currentItem)) {
				return currentItem;
			}
		}
	};
	helpers.findPreviousWhere = function(arrayToSearch, filterCallback, startIndex) {
		// Default to end of the array
		if (startIndex === undefined || startIndex === null) {
			startIndex = arrayToSearch.length;
		}
		for (var i = startIndex - 1; i >= 0; i--) {
			var currentItem = arrayToSearch[i];
			if (filterCallback(currentItem)) {
				return currentItem;
			}
		}
	};
	helpers.inherits = function(extensions) {
		//Basic javascript inheritance based on the model created in Backbone.js
		var parent = this;
		var ChartElement = (extensions && extensions.hasOwnProperty("constructor")) ? extensions.constructor : function() {
			return parent.apply(this, arguments);
		};

		var Surrogate = function() {
			this.constructor = ChartElement;
		};
		Surrogate.prototype = parent.prototype;
		ChartElement.prototype = new Surrogate();

		ChartElement.extend = helpers.inherits;

		if (extensions) {
			helpers.extend(ChartElement.prototype, extensions);
		}

		ChartElement.__super__ = parent.prototype;

		return ChartElement;
	};
	helpers.noop = function() {};
	helpers.uid = (function() {
		var id = 0;
		return function() {
			return id++;
		};
	})();
	//-- Math methods
	helpers.isNumber = function(n) {
		return !isNaN(parseFloat(n)) && isFinite(n);
	};
	helpers.almostEquals = function(x, y, epsilon) {
		return Math.abs(x - y) < epsilon;
	};
	helpers.max = function(array) {
		return array.reduce(function(max, value) {
			if (!isNaN(value)) {
				return Math.max(max, value);
			} else {
				return max;
			}
		}, Number.NEGATIVE_INFINITY);
	};
	helpers.min = function(array) {
		return array.reduce(function(min, value) {
			if (!isNaN(value)) {
				return Math.min(min, value);
			} else {
				return min;
			}
		}, Number.POSITIVE_INFINITY);
	};
	helpers.sign = Math.sign?
		function(x) { return Math.sign(x); } :
		function(x) {
			x = +x; // convert to a number
			if (x === 0 || isNaN(x)) {
				return x;
			}
			return x > 0 ? 1 : -1;
		};
	helpers.log10 = Math.log10?
		function(x) { return Math.log10(x); } :
		function(x) {
			return Math.log(x) / Math.LN10;
		};
	helpers.toRadians = function(degrees) {
		return degrees * (Math.PI / 180);
	};
	helpers.toDegrees = function(radians) {
		return radians * (180 / Math.PI);
	};
	// Gets the angle from vertical upright to the point about a centre.
	helpers.getAngleFromPoint = function(centrePoint, anglePoint) {
		var distanceFromXCenter = anglePoint.x - centrePoint.x,
			distanceFromYCenter = anglePoint.y - centrePoint.y,
			radialDistanceFromCenter = Math.sqrt(distanceFromXCenter * distanceFromXCenter + distanceFromYCenter * distanceFromYCenter);

		var angle = Math.atan2(distanceFromYCenter, distanceFromXCenter);

		if (angle < (-0.5 * Math.PI)) {
			angle += 2.0 * Math.PI; // make sure the returned angle is in the range of (-PI/2, 3PI/2]
		}

		return {
			angle: angle,
			distance: radialDistanceFromCenter
		};
	};
	helpers.aliasPixel = function(pixelWidth) {
		return (pixelWidth % 2 === 0) ? 0 : 0.5;
	};
	helpers.splineCurve = function(firstPoint, middlePoint, afterPoint, t) {
		//Props to Rob Spencer at scaled innovation for his post on splining between points
		//http://scaledinnovation.com/analytics/splines/aboutSplines.html

		// This function must also respect "skipped" points

		var previous = firstPoint.skip ? middlePoint : firstPoint,
			current = middlePoint,
			next = afterPoint.skip ? middlePoint : afterPoint;

		var d01 = Math.sqrt(Math.pow(current.x - previous.x, 2) + Math.pow(current.y - previous.y, 2));
		var d12 = Math.sqrt(Math.pow(next.x - current.x, 2) + Math.pow(next.y - current.y, 2));

		var s01 = d01 / (d01 + d12);
		var s12 = d12 / (d01 + d12);

		// If all points are the same, s01 & s02 will be inf
		s01 = isNaN(s01) ? 0 : s01;
		s12 = isNaN(s12) ? 0 : s12;

		var fa = t * s01; // scaling factor for triangle Ta
		var fb = t * s12;

		return {
			previous: {
				x: current.x - fa * (next.x - previous.x),
				y: current.y - fa * (next.y - previous.y)
			},
			next: {
				x: current.x + fb * (next.x - previous.x),
				y: current.y + fb * (next.y - previous.y)
			}
		};
	};
	helpers.nextItem = function(collection, index, loop) {
		if (loop) {
			return index >= collection.length - 1 ? collection[0] : collection[index + 1];
		}

		return index >= collection.length - 1 ? collection[collection.length - 1] : collection[index + 1];
	};
	helpers.previousItem = function(collection, index, loop) {
		if (loop) {
			return index <= 0 ? collection[collection.length - 1] : collection[index - 1];
		}
		return index <= 0 ? collection[0] : collection[index - 1];
	};
	// Implementation of the nice number algorithm used in determining where axis labels will go
	helpers.niceNum = function(range, round) {
		var exponent = Math.floor(helpers.log10(range));
		var fraction = range / Math.pow(10, exponent);
		var niceFraction;

		if (round) {
			if (fraction < 1.5) {
				niceFraction = 1;
			} else if (fraction < 3) {
				niceFraction = 2;
			} else if (fraction < 7) {
				niceFraction = 5;
			} else {
				niceFraction = 10;
			}
		} else {
			if (fraction <= 1.0) {
				niceFraction = 1;
			} else if (fraction <= 2) {
				niceFraction = 2;
			} else if (fraction <= 5) {
				niceFraction = 5;
			} else {
				niceFraction = 10;
			}
		}

		return niceFraction * Math.pow(10, exponent);
	};
	//Easing functions adapted from Robert Penner's easing equations
	//http://www.robertpenner.com/easing/
	var easingEffects = helpers.easingEffects = {
		linear: function(t) {
			return t;
		},
		easeInQuad: function(t) {
			return t * t;
		},
		easeOutQuad: function(t) {
			return -1 * t * (t - 2);
		},
		easeInOutQuad: function(t) {
			if ((t /= 1 / 2) < 1) {
				return 1 / 2 * t * t;
			}
			return -1 / 2 * ((--t) * (t - 2) - 1);
		},
		easeInCubic: function(t) {
			return t * t * t;
		},
		easeOutCubic: function(t) {
			return 1 * ((t = t / 1 - 1) * t * t + 1);
		},
		easeInOutCubic: function(t) {
			if ((t /= 1 / 2) < 1) {
				return 1 / 2 * t * t * t;
			}
			return 1 / 2 * ((t -= 2) * t * t + 2);
		},
		easeInQuart: function(t) {
			return t * t * t * t;
		},
		easeOutQuart: function(t) {
			return -1 * ((t = t / 1 - 1) * t * t * t - 1);
		},
		easeInOutQuart: function(t) {
			if ((t /= 1 / 2) < 1) {
				return 1 / 2 * t * t * t * t;
			}
			return -1 / 2 * ((t -= 2) * t * t * t - 2);
		},
		easeInQuint: function(t) {
			return 1 * (t /= 1) * t * t * t * t;
		},
		easeOutQuint: function(t) {
			return 1 * ((t = t / 1 - 1) * t * t * t * t + 1);
		},
		easeInOutQuint: function(t) {
			if ((t /= 1 / 2) < 1) {
				return 1 / 2 * t * t * t * t * t;
			}
			return 1 / 2 * ((t -= 2) * t * t * t * t + 2);
		},
		easeInSine: function(t) {
			return -1 * Math.cos(t / 1 * (Math.PI / 2)) + 1;
		},
		easeOutSine: function(t) {
			return 1 * Math.sin(t / 1 * (Math.PI / 2));
		},
		easeInOutSine: function(t) {
			return -1 / 2 * (Math.cos(Math.PI * t / 1) - 1);
		},
		easeInExpo: function(t) {
			return (t === 0) ? 1 : 1 * Math.pow(2, 10 * (t / 1 - 1));
		},
		easeOutExpo: function(t) {
			return (t === 1) ? 1 : 1 * (-Math.pow(2, -10 * t / 1) + 1);
		},
		easeInOutExpo: function(t) {
			if (t === 0) {
				return 0;
			}
			if (t === 1) {
				return 1;
			}
			if ((t /= 1 / 2) < 1) {
				return 1 / 2 * Math.pow(2, 10 * (t - 1));
			}
			return 1 / 2 * (-Math.pow(2, -10 * --t) + 2);
		},
		easeInCirc: function(t) {
			if (t >= 1) {
				return t;
			}
			return -1 * (Math.sqrt(1 - (t /= 1) * t) - 1);
		},
		easeOutCirc: function(t) {
			return 1 * Math.sqrt(1 - (t = t / 1 - 1) * t);
		},
		easeInOutCirc: function(t) {
			if ((t /= 1 / 2) < 1) {
				return -1 / 2 * (Math.sqrt(1 - t * t) - 1);
			}
			return 1 / 2 * (Math.sqrt(1 - (t -= 2) * t) + 1);
		},
		easeInElastic: function(t) {
			var s = 1.70158;
			var p = 0;
			var a = 1;
			if (t === 0) {
				return 0;
			}
			if ((t /= 1) === 1) {
				return 1;
			}
			if (!p) {
				p = 1 * 0.3;
			}
			if (a < Math.abs(1)) {
				a = 1;
				s = p / 4;
			} else {
				s = p / (2 * Math.PI) * Math.asin(1 / a);
			}
			return -(a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * 1 - s) * (2 * Math.PI) / p));
		},
		easeOutElastic: function(t) {
			var s = 1.70158;
			var p = 0;
			var a = 1;
			if (t === 0) {
				return 0;
			}
			if ((t /= 1) === 1) {
				return 1;
			}
			if (!p) {
				p = 1 * 0.3;
			}
			if (a < Math.abs(1)) {
				a = 1;
				s = p / 4;
			} else {
				s = p / (2 * Math.PI) * Math.asin(1 / a);
			}
			return a * Math.pow(2, -10 * t) * Math.sin((t * 1 - s) * (2 * Math.PI) / p) + 1;
		},
		easeInOutElastic: function(t) {
			var s = 1.70158;
			var p = 0;
			var a = 1;
			if (t === 0) {
				return 0;
			}
			if ((t /= 1 / 2) === 2) {
				return 1;
			}
			if (!p) {
				p = 1 * (0.3 * 1.5);
			}
			if (a < Math.abs(1)) {
				a = 1;
				s = p / 4;
			} else {
				s = p / (2 * Math.PI) * Math.asin(1 / a);
			}
			if (t < 1) {
				return -0.5 * (a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * 1 - s) * (2 * Math.PI) / p));
			}
			return a * Math.pow(2, -10 * (t -= 1)) * Math.sin((t * 1 - s) * (2 * Math.PI) / p) * 0.5 + 1;
		},
		easeInBack: function(t) {
			var s = 1.70158;
			return 1 * (t /= 1) * t * ((s + 1) * t - s);
		},
		easeOutBack: function(t) {
			var s = 1.70158;
			return 1 * ((t = t / 1 - 1) * t * ((s + 1) * t + s) + 1);
		},
		easeInOutBack: function(t) {
			var s = 1.70158;
			if ((t /= 1 / 2) < 1) {
				return 1 / 2 * (t * t * (((s *= (1.525)) + 1) * t - s));
			}
			return 1 / 2 * ((t -= 2) * t * (((s *= (1.525)) + 1) * t + s) + 2);
		},
		easeInBounce: function(t) {
			return 1 - easingEffects.easeOutBounce(1 - t);
		},
		easeOutBounce: function(t) {
			if ((t /= 1) < (1 / 2.75)) {
				return 1 * (7.5625 * t * t);
			} else if (t < (2 / 2.75)) {
				return 1 * (7.5625 * (t -= (1.5 / 2.75)) * t + 0.75);
			} else if (t < (2.5 / 2.75)) {
				return 1 * (7.5625 * (t -= (2.25 / 2.75)) * t + 0.9375);
			} else {
				return 1 * (7.5625 * (t -= (2.625 / 2.75)) * t + 0.984375);
			}
		},
		easeInOutBounce: function(t) {
			if (t < 1 / 2) {
				return easingEffects.easeInBounce(t * 2) * 0.5;
			}
			return easingEffects.easeOutBounce(t * 2 - 1) * 0.5 + 1 * 0.5;
		}
	};
	//Request animation polyfill - http://www.paulirish.com/2011/requestanimationframe-for-smart-animating/
	helpers.requestAnimFrame = (function() {
		return window.requestAnimationFrame ||
			window.webkitRequestAnimationFrame ||
			window.mozRequestAnimationFrame ||
			window.oRequestAnimationFrame ||
			window.msRequestAnimationFrame ||
			function(callback) {
				return window.setTimeout(callback, 1000 / 60);
			};
	})();
	helpers.cancelAnimFrame = (function() {
		return window.cancelAnimationFrame ||
			window.webkitCancelAnimationFrame ||
			window.mozCancelAnimationFrame ||
			window.oCancelAnimationFrame ||
			window.msCancelAnimationFrame ||
			function(callback) {
				return window.clearTimeout(callback, 1000 / 60);
			};
	})();
	//-- DOM methods
	helpers.getRelativePosition = function(evt, chart) {
		var mouseX, mouseY;
		var e = evt.originalEvent || evt,
			canvas = evt.currentTarget || evt.srcElement,
			boundingRect = canvas.getBoundingClientRect();

		var touches = e.touches;
		if (touches && touches.length > 0) {
			mouseX = touches[0].clientX;
			mouseY = touches[0].clientY;

		} else {
			mouseX = e.clientX;
			mouseY = e.clientY;
		}

		// Scale mouse coordinates into canvas coordinates
		// by following the pattern laid out by 'jerryj' in the comments of
		// http://www.html5canvastutorials.com/advanced/html5-canvas-mouse-coordinates/
		var paddingLeft = parseFloat(helpers.getStyle(canvas, 'padding-left'));
		var paddingTop = parseFloat(helpers.getStyle(canvas, 'padding-top'));
		var paddingRight = parseFloat(helpers.getStyle(canvas, 'padding-right'));
		var paddingBottom = parseFloat(helpers.getStyle(canvas, 'padding-bottom'));
		var width = boundingRect.right - boundingRect.left - paddingLeft - paddingRight;
		var height = boundingRect.bottom - boundingRect.top - paddingTop - paddingBottom;

		// We divide by the current device pixel ratio, because the canvas is scaled up by that amount in each direction. However
		// the backend model is in unscaled coordinates. Since we are going to deal with our model coordinates, we go back here
		mouseX = Math.round((mouseX - boundingRect.left - paddingLeft) / (width) * canvas.width / chart.currentDevicePixelRatio);
		mouseY = Math.round((mouseY - boundingRect.top - paddingTop) / (height) * canvas.height / chart.currentDevicePixelRatio);

		return {
			x: mouseX,
			y: mouseY
		};

	};
	helpers.addEvent = function(node, eventType, method) {
		if (node.addEventListener) {
			node.addEventListener(eventType, method);
		} else if (node.attachEvent) {
			node.attachEvent("on" + eventType, method);
		} else {
			node["on" + eventType] = method;
		}
	};
	helpers.removeEvent = function(node, eventType, handler) {
		if (node.removeEventListener) {
			node.removeEventListener(eventType, handler, false);
		} else if (node.detachEvent) {
			node.detachEvent("on" + eventType, handler);
		} else {
			node["on" + eventType] = helpers.noop;
		}
	};
	helpers.bindEvents = function(chartInstance, arrayOfEvents, handler) {
		// Create the events object if it's not already present
		var events = chartInstance.events = chartInstance.events || {};

		helpers.each(arrayOfEvents, function(eventName) {
			events[eventName] = function() {
				handler.apply(chartInstance, arguments);
			};
			helpers.addEvent(chartInstance.chart.canvas, eventName, events[eventName]);
		});
	};
	helpers.unbindEvents = function(chartInstance, arrayOfEvents) {
		var canvas = chartInstance.chart.canvas;
		helpers.each(arrayOfEvents, function(handler, eventName) {
			helpers.removeEvent(canvas, eventName, handler);
		});
	};

	// Private helper function to convert max-width/max-height values that may be percentages into a number
	function parseMaxStyle(styleValue, node, parentProperty) {
		var valueInPixels;
		if (typeof(styleValue) === 'string') {
			valueInPixels = parseInt(styleValue, 10);

			if (styleValue.indexOf('%') != -1) {
				// percentage * size in dimension
				valueInPixels = valueInPixels / 100 * node.parentNode[parentProperty];
			}
		} else {
			valueInPixels = styleValue;
		}

		return valueInPixels;
	}

	/**
	 * Returns if the given value contains an effective constraint.
	 * @private
	 */
	function isConstrainedValue(value) {
		return value !== undefined &&  value !== null && value !== 'none';
	}

	// Private helper to get a constraint dimension
	// @param domNode : the node to check the constraint on
	// @param maxStyle : the style that defines the maximum for the direction we are using (maxWidth / maxHeight)
	// @param percentageProperty : property of parent to use when calculating width as a percentage
	// @see http://www.nathanaeljones.com/blog/2013/reading-max-width-cross-browser
	function getConstraintDimension(domNode, maxStyle, percentageProperty) {
		var view = document.defaultView;
		var parentNode = domNode.parentNode;
		var constrainedNode = view.getComputedStyle(domNode)[maxStyle];
		var constrainedContainer = view.getComputedStyle(parentNode)[maxStyle];
		var hasCNode = isConstrainedValue(constrainedNode);
		var hasCContainer = isConstrainedValue(constrainedContainer);
		var infinity = Number.POSITIVE_INFINITY;

		if (hasCNode || hasCContainer) {
			return Math.min(
				hasCNode? parseMaxStyle(constrainedNode, domNode, percentageProperty) : infinity,
				hasCContainer? parseMaxStyle(constrainedContainer, parentNode, percentageProperty) : infinity);
		}

		return 'none';
	}
	// returns Number or undefined if no constraint
	helpers.getConstraintWidth = function(domNode) {
		return getConstraintDimension(domNode, 'max-width', 'clientWidth');
	};
	// returns Number or undefined if no constraint
	helpers.getConstraintHeight = function(domNode) {
		return getConstraintDimension(domNode, 'max-height', 'clientHeight');
	};
	helpers.getMaximumWidth = function(domNode) {
		var container = domNode.parentNode;
		var padding = parseInt(helpers.getStyle(container, 'padding-left')) + parseInt(helpers.getStyle(container, 'padding-right'));
		var w = container.clientWidth - padding;
		var cw = helpers.getConstraintWidth(domNode);
		return isNaN(cw)? w : Math.min(w, cw);
	};
	helpers.getMaximumHeight = function(domNode) {
		var container = domNode.parentNode;
		var padding = parseInt(helpers.getStyle(container, 'padding-top')) + parseInt(helpers.getStyle(container, 'padding-bottom'));
		var h = container.clientHeight - padding;
		var ch = helpers.getConstraintHeight(domNode);
		return isNaN(ch)? h : Math.min(h, ch);
	};
	helpers.getStyle = function(el, property) {
		return el.currentStyle ?
			el.currentStyle[property] :
			document.defaultView.getComputedStyle(el, null).getPropertyValue(property);
	};
	helpers.retinaScale = function(chart) {
		var ctx = chart.ctx;
		var canvas = chart.canvas;
		var width = canvas.width;
		var height = canvas.height;
		var pixelRatio = chart.currentDevicePixelRatio = window.devicePixelRatio || 1;

		if (pixelRatio !== 1) {
			canvas.height = height * pixelRatio;
			canvas.width = width * pixelRatio;
			ctx.scale(pixelRatio, pixelRatio);

			// Store the device pixel ratio so that we can go backwards in `destroy`.
			// The devicePixelRatio changes with zoom, so there are no guarantees that it is the same
			// when destroy is called
			chart.originalDevicePixelRatio = chart.originalDevicePixelRatio || pixelRatio;
		}

		canvas.style.width = width + 'px';
		canvas.style.height = height + 'px';
	};
	//-- Canvas methods
	helpers.clear = function(chart) {
		chart.ctx.clearRect(0, 0, chart.width, chart.height);
	};
	helpers.fontString = function(pixelSize, fontStyle, fontFamily) {
		return fontStyle + " " + pixelSize + "px " + fontFamily;
	};
	helpers.longestText = function(ctx, font, arrayOfThings, cache) {
		cache = cache || {};
		var data = cache.data = cache.data || {};
		var gc = cache.garbageCollect = cache.garbageCollect || [];

		if (cache.font !== font) {
			data = cache.data = {};
			gc = cache.garbageCollect = [];
			cache.font = font;
		}

		ctx.font = font;
		var longest = 0;
		helpers.each(arrayOfThings, function(thing) {
			// Undefined strings and arrays should not be measured
			if (thing !== undefined && thing !== null && helpers.isArray(thing) !== true) {
				longest = helpers.measureText(ctx, data, gc, longest, thing);
			} else if (helpers.isArray(thing)) {
				// if it is an array lets measure each element
				// to do maybe simplify this function a bit so we can do this more recursively?
				helpers.each(thing, function(nestedThing) {
					// Undefined strings and arrays should not be measured
					if (nestedThing !== undefined && nestedThing !== null && !helpers.isArray(nestedThing)) {
						longest = helpers.measureText(ctx, data, gc, longest, nestedThing);
					}
				});
			}
		});

		var gcLen = gc.length / 2;
		if (gcLen > arrayOfThings.length) {
			for (var i = 0; i < gcLen; i++) {
				delete data[gc[i]];
			}
			gc.splice(0, gcLen);
		}
		return longest;
	};
	helpers.measureText = function (ctx, data, gc, longest, string) {
		var textWidth = data[string];
		if (!textWidth) {
			textWidth = data[string] = ctx.measureText(string).width;
			gc.push(string);
		}
		if (textWidth > longest) {
			longest = textWidth;
		}
		return longest;
	};
	helpers.numberOfLabelLines = function(arrayOfThings) {
		var numberOfLines = 1;
		helpers.each(arrayOfThings, function(thing) {
			if (helpers.isArray(thing)) {
				if (thing.length > numberOfLines) {
					numberOfLines = thing.length;
				}
			}
		});
		return numberOfLines;
	};
	helpers.drawRoundedRectangle = function(ctx, x, y, width, height, radius) {
		ctx.beginPath();
		ctx.moveTo(x + radius, y);
		ctx.lineTo(x + width - radius, y);
		ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
		ctx.lineTo(x + width, y + height - radius);
		ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
		ctx.lineTo(x + radius, y + height);
		ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
		ctx.lineTo(x, y + radius);
		ctx.quadraticCurveTo(x, y, x + radius, y);
		ctx.closePath();
	};
	helpers.color = function(c) {
		if (!color) {
			console.log('Color.js not found!');
			return c;
		}

		/* global CanvasGradient */
		if (c instanceof CanvasGradient) {
			return color(Chart.defaults.global.defaultColor);
		}

		return color(c);
	};
	helpers.addResizeListener = function(node, callback) {
		// Hide an iframe before the node
		var hiddenIframe = document.createElement('iframe');
		var hiddenIframeClass = 'chartjs-hidden-iframe';

		if (hiddenIframe.classlist) {
			// can use classlist
			hiddenIframe.classlist.add(hiddenIframeClass);
		} else {
			hiddenIframe.setAttribute('class', hiddenIframeClass);
		}

		// Set the style
		var style = hiddenIframe.style;
		style.width = '100%';
		style.display = 'block';
		style.border = 0;
		style.height = 0;
		style.margin = 0;
		style.position = 'absolute';
		style.left = 0;
		style.right = 0;
		style.top = 0;
		style.bottom = 0;

		// Insert the iframe so that contentWindow is available
		node.insertBefore(hiddenIframe, node.firstChild);

		(hiddenIframe.contentWindow || hiddenIframe).onresize = function() {
			if (callback) {
				callback();
			}
		};
	};
	helpers.removeResizeListener = function(node) {
		var hiddenIframe = node.querySelector('.chartjs-hidden-iframe');

		// Remove the resize detect iframe
		if (hiddenIframe) {
			hiddenIframe.parentNode.removeChild(hiddenIframe);
		}
	};
	helpers.isArray = Array.isArray?
		function(obj) { return Array.isArray(obj); } :
		function(obj) {
			return Object.prototype.toString.call(obj) === '[object Array]';
		};
	//! @see http://stackoverflow.com/a/14853974
	helpers.arrayEquals = function(a0, a1) {
		var i, ilen, v0, v1;

		if (!a0 || !a1 || a0.length != a1.length) {
			return false;
		}

		for (i = 0, ilen=a0.length; i < ilen; ++i) {
			v0 = a0[i];
			v1 = a1[i];

			if (v0 instanceof Array && v1 instanceof Array) {
				if (!helpers.arrayEquals(v0, v1)) {
					return false;
				}
			} else if (v0 != v1) {
				// NOTE: two different object instances will never be equal: {x:20} != {x:20}
				return false;
			}
		}

		return true;
	};
	helpers.callCallback = function(fn, args, _tArg) {
		if (fn && typeof fn.call === 'function') {
			fn.apply(_tArg, args);
		}
	};
	helpers.getHoverColor = function(color) {
		/* global CanvasPattern */
		return (color instanceof CanvasPattern) ?
			color :
			helpers.color(color).saturate(0.5).darken(0.1).rgbString();
	};
};

},{"chartjs-color":41}],22:[function(require,module,exports){
"use strict";

module.exports = function() {

	//Occupy the global variable of Chart, and create a simple base class
	var Chart = function(context, config) {
		var me = this;
		var helpers = Chart.helpers;
		me.config = config;

		// Support a jQuery'd canvas element
		if (context.length && context[0].getContext) {
			context = context[0];
		}

		// Support a canvas domnode
		if (context.getContext) {
			context = context.getContext("2d");
		}

		me.ctx = context;
		me.canvas = context.canvas;

		context.canvas.style.display = context.canvas.style.display || 'block';

		// Figure out what the size of the chart will be.
		// If the canvas has a specified width and height, we use those else
		// we look to see if the canvas node has a CSS width and height.
		// If there is still no height, fill the parent container
		me.width = context.canvas.width || parseInt(helpers.getStyle(context.canvas, 'width'), 10) || helpers.getMaximumWidth(context.canvas);
		me.height = context.canvas.height || parseInt(helpers.getStyle(context.canvas, 'height'), 10) || helpers.getMaximumHeight(context.canvas);

		me.aspectRatio = me.width / me.height;

		if (isNaN(me.aspectRatio) || isFinite(me.aspectRatio) === false) {
			// If the canvas has no size, try and figure out what the aspect ratio will be.
			// Some charts prefer square canvases (pie, radar, etc). If that is specified, use that
			// else use the canvas default ratio of 2
			me.aspectRatio = config.aspectRatio !== undefined ? config.aspectRatio : 2;
		}

		// Store the original style of the element so we can set it back
		me.originalCanvasStyleWidth = context.canvas.style.width;
		me.originalCanvasStyleHeight = context.canvas.style.height;

		// High pixel density displays - multiply the size of the canvas height/width by the device pixel ratio, then scale.
		helpers.retinaScale(me);

		if (config) {
			me.controller = new Chart.Controller(me);
		}

		// Always bind this so that if the responsive state changes we still work
		helpers.addResizeListener(context.canvas.parentNode, function() {
			if (me.controller && me.controller.config.options.responsive) {
				me.controller.resize();
			}
		});

		return me.controller ? me.controller : me;

	};

	//Globally expose the defaults to allow for user updating/changing
	Chart.defaults = {
		global: {
			responsive: true,
			responsiveAnimationDuration: 0,
			maintainAspectRatio: true,
			events: ["mousemove", "mouseout", "click", "touchstart", "touchmove"],
			hover: {
				onHover: null,
				mode: 'single',
				animationDuration: 400
			},
			onClick: null,
			defaultColor: 'rgba(0,0,0,0.1)',
			defaultFontColor: '#666',
			defaultFontFamily: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
			defaultFontSize: 12,
			defaultFontStyle: 'normal',
			showLines: true,

			// Element defaults defined in element extensions
			elements: {},

			// Legend callback string
			legendCallback: function(chart) {
				var text = [];
				text.push('<ul class="' + chart.id + '-legend">');
				for (var i = 0; i < chart.data.datasets.length; i++) {
					text.push('<li><span style="background-color:' + chart.data.datasets[i].backgroundColor + '"></span>');
					if (chart.data.datasets[i].label) {
						text.push(chart.data.datasets[i].label);
					}
					text.push('</li>');
				}
				text.push('</ul>');

				return text.join("");
			}
		}
	};

	Chart.Chart = Chart;

	return Chart;

};

},{}],23:[function(require,module,exports){
"use strict";

module.exports = function(Chart) {

	var helpers = Chart.helpers;

	// The layout service is very self explanatory.  It's responsible for the layout within a chart.
	// Scales, Legends and Plugins all rely on the layout service and can easily register to be placed anywhere they need
	// It is this service's responsibility of carrying out that layout.
	Chart.layoutService = {
		defaults: {},

		// Register a box to a chartInstance. A box is simply a reference to an object that requires layout. eg. Scales, Legend, Plugins.
		addBox: function(chartInstance, box) {
			if (!chartInstance.boxes) {
				chartInstance.boxes = [];
			}
			chartInstance.boxes.push(box);
		},

		removeBox: function(chartInstance, box) {
			if (!chartInstance.boxes) {
				return;
			}
			chartInstance.boxes.splice(chartInstance.boxes.indexOf(box), 1);
		},

		// The most important function
		update: function(chartInstance, width, height) {

			if (!chartInstance) {
				return;
			}

			var xPadding = 0;
			var yPadding = 0;

			var leftBoxes = helpers.where(chartInstance.boxes, function(box) {
				return box.options.position === "left";
			});
			var rightBoxes = helpers.where(chartInstance.boxes, function(box) {
				return box.options.position === "right";
			});
			var topBoxes = helpers.where(chartInstance.boxes, function(box) {
				return box.options.position === "top";
			});
			var bottomBoxes = helpers.where(chartInstance.boxes, function(box) {
				return box.options.position === "bottom";
			});

			// Boxes that overlay the chartarea such as the radialLinear scale
			var chartAreaBoxes = helpers.where(chartInstance.boxes, function(box) {
				return box.options.position === "chartArea";
			});

			// Ensure that full width boxes are at the very top / bottom
			topBoxes.sort(function(a, b) {
				return (b.options.fullWidth ? 1 : 0) - (a.options.fullWidth ? 1 : 0);
			});
			bottomBoxes.sort(function(a, b) {
				return (a.options.fullWidth ? 1 : 0) - (b.options.fullWidth ? 1 : 0);
			});

			// Essentially we now have any number of boxes on each of the 4 sides.
			// Our canvas looks like the following.
			// The areas L1 and L2 are the left axes. R1 is the right axis, T1 is the top axis and
			// B1 is the bottom axis
			// There are also 4 quadrant-like locations (left to right instead of clockwise) reserved for chart overlays
			// These locations are single-box locations only, when trying to register a chartArea location that is already taken,
			// an error will be thrown.
			//
			// |----------------------------------------------------|
			// |                  T1 (Full Width)                   |
			// |----------------------------------------------------|
			// |    |    |                 T2                  |    |
			// |    |----|-------------------------------------|----|
			// |    |    | C1 |                           | C2 |    |
			// |    |    |----|                           |----|    |
			// |    |    |                                     |    |
			// | L1 | L2 |           ChartArea (C0)            | R1 |
			// |    |    |                                     |    |
			// |    |    |----|                           |----|    |
			// |    |    | C3 |                           | C4 |    |
			// |    |----|-------------------------------------|----|
			// |    |    |                 B1                  |    |
			// |----------------------------------------------------|
			// |                  B2 (Full Width)                   |
			// |----------------------------------------------------|
			//
			// What we do to find the best sizing, we do the following
			// 1. Determine the minimum size of the chart area.
			// 2. Split the remaining width equally between each vertical axis
			// 3. Split the remaining height equally between each horizontal axis
			// 4. Give each layout the maximum size it can be. The layout will return it's minimum size
			// 5. Adjust the sizes of each axis based on it's minimum reported size.
			// 6. Refit each axis
			// 7. Position each axis in the final location
			// 8. Tell the chart the final location of the chart area
			// 9. Tell any axes that overlay the chart area the positions of the chart area

			// Step 1
			var chartWidth = width - (2 * xPadding);
			var chartHeight = height - (2 * yPadding);
			var chartAreaWidth = chartWidth / 2; // min 50%
			var chartAreaHeight = chartHeight / 2; // min 50%

			// Step 2
			var verticalBoxWidth = (width - chartAreaWidth) / (leftBoxes.length + rightBoxes.length);

			// Step 3
			var horizontalBoxHeight = (height - chartAreaHeight) / (topBoxes.length + bottomBoxes.length);

			// Step 4
			var maxChartAreaWidth = chartWidth;
			var maxChartAreaHeight = chartHeight;
			var minBoxSizes = [];

			helpers.each(leftBoxes.concat(rightBoxes, topBoxes, bottomBoxes), getMinimumBoxSize);

			function getMinimumBoxSize(box) {
				var minSize;
				var isHorizontal = box.isHorizontal();

				if (isHorizontal) {
					minSize = box.update(box.options.fullWidth ? chartWidth : maxChartAreaWidth, horizontalBoxHeight);
					maxChartAreaHeight -= minSize.height;
				} else {
					minSize = box.update(verticalBoxWidth, chartAreaHeight);
					maxChartAreaWidth -= minSize.width;
				}

				minBoxSizes.push({
					horizontal: isHorizontal,
					minSize: minSize,
					box: box
				});
			}

			// At this point, maxChartAreaHeight and maxChartAreaWidth are the size the chart area could
			// be if the axes are drawn at their minimum sizes.

			// Steps 5 & 6
			var totalLeftBoxesWidth = xPadding;
			var totalRightBoxesWidth = xPadding;
			var totalTopBoxesHeight = yPadding;
			var totalBottomBoxesHeight = yPadding;

			// Update, and calculate the left and right margins for the horizontal boxes
			helpers.each(leftBoxes.concat(rightBoxes), fitBox);

			helpers.each(leftBoxes, function(box) {
				totalLeftBoxesWidth += box.width;
			});

			helpers.each(rightBoxes, function(box) {
				totalRightBoxesWidth += box.width;
			});

			// Set the Left and Right margins for the horizontal boxes
			helpers.each(topBoxes.concat(bottomBoxes), fitBox);

			// Function to fit a box
			function fitBox(box) {
				var minBoxSize = helpers.findNextWhere(minBoxSizes, function(minBoxSize) {
					return minBoxSize.box === box;
				});

				if (minBoxSize) {
					if (box.isHorizontal()) {
						var scaleMargin = {
							left: totalLeftBoxesWidth,
							right: totalRightBoxesWidth,
							top: 0,
							bottom: 0
						};

						// Don't use min size here because of label rotation. When the labels are rotated, their rotation highly depends
						// on the margin. Sometimes they need to increase in size slightly
						box.update(box.options.fullWidth ? chartWidth : maxChartAreaWidth, chartHeight / 2, scaleMargin);
					} else {
						box.update(minBoxSize.minSize.width, maxChartAreaHeight);
					}
				}
			}

			// Figure out how much margin is on the top and bottom of the vertical boxes
			helpers.each(topBoxes, function(box) {
				totalTopBoxesHeight += box.height;
			});

			helpers.each(bottomBoxes, function(box) {
				totalBottomBoxesHeight += box.height;
			});

			// Let the left layout know the final margin
			helpers.each(leftBoxes.concat(rightBoxes), finalFitVerticalBox);

			function finalFitVerticalBox(box) {
				var minBoxSize = helpers.findNextWhere(minBoxSizes, function(minBoxSize) {
					return minBoxSize.box === box;
				});

				var scaleMargin = {
					left: 0,
					right: 0,
					top: totalTopBoxesHeight,
					bottom: totalBottomBoxesHeight
				};

				if (minBoxSize) {
					box.update(minBoxSize.minSize.width, maxChartAreaHeight, scaleMargin);
				}
			}

			// Recalculate because the size of each layout might have changed slightly due to the margins (label rotation for instance)
			totalLeftBoxesWidth = xPadding;
			totalRightBoxesWidth = xPadding;
			totalTopBoxesHeight = yPadding;
			totalBottomBoxesHeight = yPadding;

			helpers.each(leftBoxes, function(box) {
				totalLeftBoxesWidth += box.width;
			});

			helpers.each(rightBoxes, function(box) {
				totalRightBoxesWidth += box.width;
			});

			helpers.each(topBoxes, function(box) {
				totalTopBoxesHeight += box.height;
			});
			helpers.each(bottomBoxes, function(box) {
				totalBottomBoxesHeight += box.height;
			});

			// Figure out if our chart area changed. This would occur if the dataset layout label rotation
			// changed due to the application of the margins in step 6. Since we can only get bigger, this is safe to do
			// without calling `fit` again
			var newMaxChartAreaHeight = height - totalTopBoxesHeight - totalBottomBoxesHeight;
			var newMaxChartAreaWidth = width - totalLeftBoxesWidth - totalRightBoxesWidth;

			if (newMaxChartAreaWidth !== maxChartAreaWidth || newMaxChartAreaHeight !== maxChartAreaHeight) {
				helpers.each(leftBoxes, function(box) {
					box.height = newMaxChartAreaHeight;
				});

				helpers.each(rightBoxes, function(box) {
					box.height = newMaxChartAreaHeight;
				});

				helpers.each(topBoxes, function(box) {
					if (!box.options.fullWidth) {
						box.width = newMaxChartAreaWidth;
					}
				});

				helpers.each(bottomBoxes, function(box) {
					if (!box.options.fullWidth) {
						box.width = newMaxChartAreaWidth;
					}
				});

				maxChartAreaHeight = newMaxChartAreaHeight;
				maxChartAreaWidth = newMaxChartAreaWidth;
			}

			// Step 7 - Position the boxes
			var left = xPadding;
			var top = yPadding;
			var right = 0;
			var bottom = 0;

			helpers.each(leftBoxes.concat(topBoxes), placeBox);

			// Account for chart width and height
			left += maxChartAreaWidth;
			top += maxChartAreaHeight;

			helpers.each(rightBoxes, placeBox);
			helpers.each(bottomBoxes, placeBox);

			function placeBox(box) {
				if (box.isHorizontal()) {
					box.left = box.options.fullWidth ? xPadding : totalLeftBoxesWidth;
					box.right = box.options.fullWidth ? width - xPadding : totalLeftBoxesWidth + maxChartAreaWidth;
					box.top = top;
					box.bottom = top + box.height;

					// Move to next point
					top = box.bottom;

				} else {

					box.left = left;
					box.right = left + box.width;
					box.top = totalTopBoxesHeight;
					box.bottom = totalTopBoxesHeight + maxChartAreaHeight;

					// Move to next point
					left = box.right;
				}
			}

			// Step 8
			chartInstance.chartArea = {
				left: totalLeftBoxesWidth,
				top: totalTopBoxesHeight,
				right: totalLeftBoxesWidth + maxChartAreaWidth,
				bottom: totalTopBoxesHeight + maxChartAreaHeight
			};

			// Step 9
			helpers.each(chartAreaBoxes, function(box) {
				box.left = chartInstance.chartArea.left;
				box.top = chartInstance.chartArea.top;
				box.right = chartInstance.chartArea.right;
				box.bottom = chartInstance.chartArea.bottom;

				box.update(maxChartAreaWidth, maxChartAreaHeight);
			});
		}
	};
};

},{}],24:[function(require,module,exports){
"use strict";

module.exports = function(Chart) {

	var helpers = Chart.helpers;
	var noop = helpers.noop;

	Chart.defaults.global.legend = {

		display: true,
		position: 'top',
		fullWidth: true, // marks that this box should take the full width of the canvas (pushing down other boxes)
		reverse: false,

		// a callback that will handle
		onClick: function(e, legendItem) {
			var index = legendItem.datasetIndex;
			var ci = this.chart;
			var meta = ci.getDatasetMeta(index);

			// See controller.isDatasetVisible comment
			meta.hidden = meta.hidden === null? !ci.data.datasets[index].hidden : null;

			// We hid a dataset ... rerender the chart
			ci.update();
		},

		labels: {
			boxWidth: 40,
			padding: 10,
			// Generates labels shown in the legend
			// Valid properties to return:
			// text : text to display
			// fillStyle : fill of coloured box
			// strokeStyle: stroke of coloured box
			// hidden : if this legend item refers to a hidden item
			// lineCap : cap style for line
			// lineDash
			// lineDashOffset :
			// lineJoin :
			// lineWidth :
			generateLabels: function(chart) {
				var data = chart.data;
				return helpers.isArray(data.datasets) ? data.datasets.map(function(dataset, i) {
					return {
						text: dataset.label,
						fillStyle: (!helpers.isArray(dataset.backgroundColor) ? dataset.backgroundColor : dataset.backgroundColor[0]),
						hidden: !chart.isDatasetVisible(i),
						lineCap: dataset.borderCapStyle,
						lineDash: dataset.borderDash,
						lineDashOffset: dataset.borderDashOffset,
						lineJoin: dataset.borderJoinStyle,
						lineWidth: dataset.borderWidth,
						strokeStyle: dataset.borderColor,

						// Below is extra data used for toggling the datasets
						datasetIndex: i
					};
				}, this) : [];
			}
		}
	};

	Chart.Legend = Chart.Element.extend({

		initialize: function(config) {
			helpers.extend(this, config);

			// Contains hit boxes for each dataset (in dataset order)
			this.legendHitBoxes = [];

			// Are we in doughnut mode which has a different data type
			this.doughnutMode = false;
		},

		// These methods are ordered by lifecyle. Utilities then follow.
		// Any function defined here is inherited by all legend types.
		// Any function can be extended by the legend type

		beforeUpdate: noop,
		update: function(maxWidth, maxHeight, margins) {
			var me = this;

			// Update Lifecycle - Probably don't want to ever extend or overwrite this function ;)
			me.beforeUpdate();

			// Absorb the master measurements
			me.maxWidth = maxWidth;
			me.maxHeight = maxHeight;
			me.margins = margins;

			// Dimensions
			me.beforeSetDimensions();
			me.setDimensions();
			me.afterSetDimensions();
			// Labels
			me.beforeBuildLabels();
			me.buildLabels();
			me.afterBuildLabels();

			// Fit
			me.beforeFit();
			me.fit();
			me.afterFit();
			//
			me.afterUpdate();

			return me.minSize;
		},
		afterUpdate: noop,

		//

		beforeSetDimensions: noop,
		setDimensions: function() {
			var me = this;
			// Set the unconstrained dimension before label rotation
			if (me.isHorizontal()) {
				// Reset position before calculating rotation
				me.width = me.maxWidth;
				me.left = 0;
				me.right = me.width;
			} else {
				me.height = me.maxHeight;

				// Reset position before calculating rotation
				me.top = 0;
				me.bottom = me.height;
			}

			// Reset padding
			me.paddingLeft = 0;
			me.paddingTop = 0;
			me.paddingRight = 0;
			me.paddingBottom = 0;

			// Reset minSize
			me.minSize = {
				width: 0,
				height: 0
			};
		},
		afterSetDimensions: noop,

		//

		beforeBuildLabels: noop,
		buildLabels: function() {
			var me = this;
			me.legendItems = me.options.labels.generateLabels.call(me, me.chart);
			if(me.options.reverse){
				me.legendItems.reverse();
			}
		},
		afterBuildLabels: noop,

		//

		beforeFit: noop,
		fit: function() {
			var me = this;
			var opts = me.options;
			var labelOpts = opts.labels;
			var display = opts.display;

			var ctx = me.ctx;

			var globalDefault = Chart.defaults.global,
				itemOrDefault = helpers.getValueOrDefault,
				fontSize = itemOrDefault(labelOpts.fontSize, globalDefault.defaultFontSize),
				fontStyle = itemOrDefault(labelOpts.fontStyle, globalDefault.defaultFontStyle),
				fontFamily = itemOrDefault(labelOpts.fontFamily, globalDefault.defaultFontFamily),
				labelFont = helpers.fontString(fontSize, fontStyle, fontFamily);

			// Reset hit boxes
			var hitboxes = me.legendHitBoxes = [];

			var minSize = me.minSize;
			var isHorizontal = me.isHorizontal();

			if (isHorizontal) {
				minSize.width = me.maxWidth; // fill all the width
				minSize.height = display ? 10 : 0;
			} else {
				minSize.width = display ? 10 : 0;
				minSize.height = me.maxHeight; // fill all the height
			}

			// Increase sizes here
			if (display) {
				ctx.font = labelFont;

				if (isHorizontal) {
					// Labels

					// Width of each line of legend boxes. Labels wrap onto multiple lines when there are too many to fit on one
					var lineWidths = me.lineWidths = [0];
					var totalHeight = me.legendItems.length ? fontSize + (labelOpts.padding) : 0;

					ctx.textAlign = "left";
					ctx.textBaseline = 'top';

					helpers.each(me.legendItems, function(legendItem, i) {
						var width = labelOpts.boxWidth + (fontSize / 2) + ctx.measureText(legendItem.text).width;
						if (lineWidths[lineWidths.length - 1] + width + labelOpts.padding >= me.width) {
							totalHeight += fontSize + (labelOpts.padding);
							lineWidths[lineWidths.length] = me.left;
						}

						// Store the hitbox width and height here. Final position will be updated in `draw`
						hitboxes[i] = {
							left: 0,
							top: 0,
							width: width,
							height: fontSize
						};

						lineWidths[lineWidths.length - 1] += width + labelOpts.padding;
					});

					minSize.height += totalHeight;

				} else {
					var vPadding = labelOpts.padding;
					var columnWidths = me.columnWidths = [];
					var totalWidth = labelOpts.padding;
					var currentColWidth = 0;
					var currentColHeight = 0;
					var itemHeight = fontSize + vPadding;

					helpers.each(me.legendItems, function(legendItem, i) {
						var itemWidth = labelOpts.boxWidth + (fontSize / 2) + ctx.measureText(legendItem.text).width;

						// If too tall, go to new column
						if (currentColHeight + itemHeight > minSize.height) {
							totalWidth += currentColWidth + labelOpts.padding;
							columnWidths.push(currentColWidth); // previous column width

							currentColWidth = 0;
							currentColHeight = 0;
						}

						// Get max width
						currentColWidth = Math.max(currentColWidth, itemWidth);
						currentColHeight += itemHeight;

						// Store the hitbox width and height here. Final position will be updated in `draw`
						hitboxes[i] = {
							left: 0,
							top: 0,
							width: itemWidth,
							height: fontSize
						};
					});

					totalWidth += currentColWidth;
					columnWidths.push(currentColWidth);
					minSize.width += totalWidth;
				}
			}

			me.width = minSize.width;
			me.height = minSize.height;
		},
		afterFit: noop,

		// Shared Methods
		isHorizontal: function() {
			return this.options.position === "top" || this.options.position === "bottom";
		},

		// Actualy draw the legend on the canvas
		draw: function() {
			var me = this;
			var opts = me.options;
			var labelOpts = opts.labels;
			var globalDefault = Chart.defaults.global,
				lineDefault = globalDefault.elements.line,
				legendWidth = me.width,
				legendHeight = me.height,
				lineWidths = me.lineWidths;

			if (opts.display) {
				var ctx = me.ctx,
					cursor,
					itemOrDefault = helpers.getValueOrDefault,
					fontColor = itemOrDefault(labelOpts.fontColor, globalDefault.defaultFontColor),
					fontSize = itemOrDefault(labelOpts.fontSize, globalDefault.defaultFontSize),
					fontStyle = itemOrDefault(labelOpts.fontStyle, globalDefault.defaultFontStyle),
					fontFamily = itemOrDefault(labelOpts.fontFamily, globalDefault.defaultFontFamily),
					labelFont = helpers.fontString(fontSize, fontStyle, fontFamily);

				// Canvas setup
				ctx.textAlign = "left";
				ctx.textBaseline = 'top';
				ctx.lineWidth = 0.5;
				ctx.strokeStyle = fontColor; // for strikethrough effect
				ctx.fillStyle = fontColor; // render in correct colour
				ctx.font = labelFont;

				var boxWidth = labelOpts.boxWidth,
					hitboxes = me.legendHitBoxes;

				// current position
				var drawLegendBox = function(x, y, legendItem) {
					// Set the ctx for the box
					ctx.save();

					ctx.fillStyle = itemOrDefault(legendItem.fillStyle, globalDefault.defaultColor);
					ctx.lineCap = itemOrDefault(legendItem.lineCap, lineDefault.borderCapStyle);
					ctx.lineDashOffset = itemOrDefault(legendItem.lineDashOffset, lineDefault.borderDashOffset);
					ctx.lineJoin = itemOrDefault(legendItem.lineJoin, lineDefault.borderJoinStyle);
					ctx.lineWidth = itemOrDefault(legendItem.lineWidth, lineDefault.borderWidth);
					ctx.strokeStyle = itemOrDefault(legendItem.strokeStyle, globalDefault.defaultColor);

					if (ctx.setLineDash) {
						// IE 9 and 10 do not support line dash
						ctx.setLineDash(itemOrDefault(legendItem.lineDash, lineDefault.borderDash));
					}

					// Draw the box
					ctx.strokeRect(x, y, boxWidth, fontSize);
					ctx.fillRect(x, y, boxWidth, fontSize);

					ctx.restore();
				};
				var fillText = function(x, y, legendItem, textWidth) {
					ctx.fillText(legendItem.text, boxWidth + (fontSize / 2) + x, y);

					if (legendItem.hidden) {
						// Strikethrough the text if hidden
						ctx.beginPath();
						ctx.lineWidth = 2;
						ctx.moveTo(boxWidth + (fontSize / 2) + x, y + (fontSize / 2));
						ctx.lineTo(boxWidth + (fontSize / 2) + x + textWidth, y + (fontSize / 2));
						ctx.stroke();
					}
				};

				// Horizontal
				var isHorizontal = me.isHorizontal();
				if (isHorizontal) {
					cursor = {
						x: me.left + ((legendWidth - lineWidths[0]) / 2),
						y: me.top + labelOpts.padding,
						line: 0
					};
				} else {
					cursor = {
						x: me.left + labelOpts.padding,
						y: me.top,
						line: 0
					};
				}

				var itemHeight = fontSize + labelOpts.padding;
				helpers.each(me.legendItems, function(legendItem, i) {
					var textWidth = ctx.measureText(legendItem.text).width,
						width = boxWidth + (fontSize / 2) + textWidth,
						x = cursor.x,
						y = cursor.y;

					if (isHorizontal) {
						if (x + width >= legendWidth) {
							y = cursor.y += fontSize + (labelOpts.padding);
							cursor.line++;
							x = cursor.x = me.left + ((legendWidth - lineWidths[cursor.line]) / 2);
						}
					} else {
						if (y + itemHeight > me.bottom) {
							x = cursor.x = x + me.columnWidths[cursor.line] + labelOpts.padding;
							y = cursor.y = me.top;
							cursor.line++;
						}
					}
					

					drawLegendBox(x, y, legendItem);

					hitboxes[i].left = x;
					hitboxes[i].top = y;

					// Fill the actual label
					fillText(x, y, legendItem, textWidth);

					if (isHorizontal) {
						cursor.x += width + (labelOpts.padding);
					} else {
						cursor.y += itemHeight;
					}
					
				});
			}
		},

		// Handle an event
		handleEvent: function(e) {
			var me = this;
			var position = helpers.getRelativePosition(e, me.chart.chart),
				x = position.x,
				y = position.y,
				opts = me.options;

			if (x >= me.left && x <= me.right && y >= me.top && y <= me.bottom) {
				// See if we are touching one of the dataset boxes
				var lh = me.legendHitBoxes;
				for (var i = 0; i < lh.length; ++i) {
					var hitBox = lh[i];

					if (x >= hitBox.left && x <= hitBox.left + hitBox.width && y >= hitBox.top && y <= hitBox.top + hitBox.height) {
						// Touching an element
						if (opts.onClick) {
							opts.onClick.call(me, e, me.legendItems[i]);
						}
						break;
					}
				}
			}
		}
	});

	// Register the legend plugin
	Chart.plugins.register({
		beforeInit: function(chartInstance) {
			var opts = chartInstance.options;
			var legendOpts = opts.legend;

			if (legendOpts) {
				chartInstance.legend = new Chart.Legend({
					ctx: chartInstance.chart.ctx,
					options: legendOpts,
					chart: chartInstance
				});

				Chart.layoutService.addBox(chartInstance, chartInstance.legend);
			}
		}
	});
};

},{}],25:[function(require,module,exports){
"use strict";

module.exports = function(Chart) {

	var noop = Chart.helpers.noop;

	/**
	 * The plugin service singleton
	 * @namespace Chart.plugins
	 * @since 2.1.0
	 */
	Chart.plugins = {
		_plugins: [],

		/**
		 * Registers the given plugin(s) if not already registered.
		 * @param {Array|Object} plugins plugin instance(s).
		 */
		register: function(plugins) {
			var p = this._plugins;
			([]).concat(plugins).forEach(function(plugin) {
				if (p.indexOf(plugin) === -1) {
					p.push(plugin);
				}
			});
		},

		/**
		 * Unregisters the given plugin(s) only if registered.
		 * @param {Array|Object} plugins plugin instance(s).
		 */
		unregister: function(plugins) {
			var p = this._plugins;
			([]).concat(plugins).forEach(function(plugin) {
				var idx = p.indexOf(plugin);
				if (idx !== -1) {
					p.splice(idx, 1);
				}
			});
		},

		/**
		 * Remove all registered p^lugins.
		 * @since 2.1.5
		 */
		clear: function() {
			this._plugins = [];
		},

		/**
		 * Returns the number of registered plugins?
		 * @returns {Number}
		 * @since 2.1.5
		 */
		count: function() {
			return this._plugins.length;
		},

		/**
		 * Returns all registered plugin intances.
		 * @returns {Array} array of plugin objects.
		 * @since 2.1.5
		 */
		getAll: function() {
			return this._plugins;
		},

		/**
		 * Calls registered plugins on the specified extension, with the given args. This
		 * method immediately returns as soon as a plugin explicitly returns false. The
		 * returned value can be used, for instance, to interrupt the current action.
		 * @param {String} extension the name of the plugin method to call (e.g. 'beforeUpdate').
		 * @param {Array} [args] extra arguments to apply to the extension call.
		 * @returns {Boolean} false if any of the plugins return false, else returns true.
		 */
		notify: function(extension, args) {
			var plugins = this._plugins;
			var ilen = plugins.length;
			var i, plugin;

			for (i=0; i<ilen; ++i) {
				plugin = plugins[i];
				if (typeof plugin[extension] === 'function') {
					if (plugin[extension].apply(plugin, args || []) === false) {
						return false;
					}
				}
			}

			return true;
		}
	};

	/**
	 * Plugin extension methods.
	 * @interface Chart.PluginBase
	 * @since 2.1.0
	 */
	Chart.PluginBase = Chart.Element.extend({
		// Called at start of chart init
		beforeInit: noop,

		// Called at end of chart init
		afterInit: noop,

		// Called at start of update
		beforeUpdate: noop,

		// Called at end of update
		afterUpdate: noop,

		// Called at start of draw
		beforeDraw: noop,

		// Called at end of draw
		afterDraw: noop,

		// Called during destroy
		destroy: noop
	});

	/**
	 * Provided for backward compatibility, use Chart.plugins instead
	 * @namespace Chart.pluginService
	 * @deprecated since version 2.1.5
	 * @todo remove me at version 3
	 */
	Chart.pluginService = Chart.plugins;
};

},{}],26:[function(require,module,exports){
"use strict";

module.exports = function(Chart) {

	var helpers = Chart.helpers;

	Chart.defaults.scale = {
		display: true,
		position: "left",

		// grid line settings
		gridLines: {
			display: true,
			color: "rgba(0, 0, 0, 0.1)",
			lineWidth: 1,
			drawBorder: true,
			drawOnChartArea: true,
			drawTicks: true,
			tickMarkLength: 10,
			zeroLineWidth: 1,
			zeroLineColor: "rgba(0,0,0,0.25)",
			offsetGridLines: false
		},

		// scale label
		scaleLabel: {
			// actual label
			labelString: '',

			// display property
			display: false
		},

		// label settings
		ticks: {
			beginAtZero: false,
			minRotation: 0,
			maxRotation: 50,
			mirror: false,
			padding: 10,
			reverse: false,
			display: true,
			autoSkip: true,
			autoSkipPadding: 0,
			labelOffset: 0,
			// We pass through arrays to be rendered as multiline labels, we convert Others to strings here.
			callback: function(value) {
				return helpers.isArray(value) ? value : '' + value;
			}
		}
	};

	Chart.Scale = Chart.Element.extend({

		// These methods are ordered by lifecyle. Utilities then follow.
		// Any function defined here is inherited by all scale types.
		// Any function can be extended by the scale type

		beforeUpdate: function() {
			helpers.callCallback(this.options.beforeUpdate, [this]);
		},
		update: function(maxWidth, maxHeight, margins) {
			var me = this;

			// Update Lifecycle - Probably don't want to ever extend or overwrite this function ;)
			me.beforeUpdate();

			// Absorb the master measurements
			me.maxWidth = maxWidth;
			me.maxHeight = maxHeight;
			me.margins = helpers.extend({
				left: 0,
				right: 0,
				top: 0,
				bottom: 0
			}, margins);

			// Dimensions
			me.beforeSetDimensions();
			me.setDimensions();
			me.afterSetDimensions();

			// Data min/max
			me.beforeDataLimits();
			me.determineDataLimits();
			me.afterDataLimits();

			// Ticks
			me.beforeBuildTicks();
			me.buildTicks();
			me.afterBuildTicks();

			me.beforeTickToLabelConversion();
			me.convertTicksToLabels();
			me.afterTickToLabelConversion();

			// Tick Rotation
			me.beforeCalculateTickRotation();
			me.calculateTickRotation();
			me.afterCalculateTickRotation();
			// Fit
			me.beforeFit();
			me.fit();
			me.afterFit();
			//
			me.afterUpdate();

			return me.minSize;

		},
		afterUpdate: function() {
			helpers.callCallback(this.options.afterUpdate, [this]);
		},

		//

		beforeSetDimensions: function() {
			helpers.callCallback(this.options.beforeSetDimensions, [this]);
		},
		setDimensions: function() {
			var me = this;
			// Set the unconstrained dimension before label rotation
			if (me.isHorizontal()) {
				// Reset position before calculating rotation
				me.width = me.maxWidth;
				me.left = 0;
				me.right = me.width;
			} else {
				me.height = me.maxHeight;

				// Reset position before calculating rotation
				me.top = 0;
				me.bottom = me.height;
			}

			// Reset padding
			me.paddingLeft = 0;
			me.paddingTop = 0;
			me.paddingRight = 0;
			me.paddingBottom = 0;
		},
		afterSetDimensions: function() {
			helpers.callCallback(this.options.afterSetDimensions, [this]);
		},

		// Data limits
		beforeDataLimits: function() {
			helpers.callCallback(this.options.beforeDataLimits, [this]);
		},
		determineDataLimits: helpers.noop,
		afterDataLimits: function() {
			helpers.callCallback(this.options.afterDataLimits, [this]);
		},

		//
		beforeBuildTicks: function() {
			helpers.callCallback(this.options.beforeBuildTicks, [this]);
		},
		buildTicks: helpers.noop,
		afterBuildTicks: function() {
			helpers.callCallback(this.options.afterBuildTicks, [this]);
		},

		beforeTickToLabelConversion: function() {
			helpers.callCallback(this.options.beforeTickToLabelConversion, [this]);
		},
		convertTicksToLabels: function() {
			var me = this;
			// Convert ticks to strings
			me.ticks = me.ticks.map(function(numericalTick, index, ticks) {
					if (me.options.ticks.userCallback) {
						return me.options.ticks.userCallback(numericalTick, index, ticks);
					}
					return me.options.ticks.callback(numericalTick, index, ticks);
				},
				me);
		},
		afterTickToLabelConversion: function() {
			helpers.callCallback(this.options.afterTickToLabelConversion, [this]);
		},

		//

		beforeCalculateTickRotation: function() {
			helpers.callCallback(this.options.beforeCalculateTickRotation, [this]);
		},
		calculateTickRotation: function() {
			var me = this;
			var context = me.ctx;
			var globalDefaults = Chart.defaults.global;
			var optionTicks = me.options.ticks;

			//Get the width of each grid by calculating the difference
			//between x offsets between 0 and 1.
			var tickFontSize = helpers.getValueOrDefault(optionTicks.fontSize, globalDefaults.defaultFontSize);
			var tickFontStyle = helpers.getValueOrDefault(optionTicks.fontStyle, globalDefaults.defaultFontStyle);
			var tickFontFamily = helpers.getValueOrDefault(optionTicks.fontFamily, globalDefaults.defaultFontFamily);
			var tickLabelFont = helpers.fontString(tickFontSize, tickFontStyle, tickFontFamily);
			context.font = tickLabelFont;

			var firstWidth = context.measureText(me.ticks[0]).width;
			var lastWidth = context.measureText(me.ticks[me.ticks.length - 1]).width;
			var firstRotated;

			me.labelRotation = optionTicks.minRotation || 0;
			me.paddingRight = 0;
			me.paddingLeft = 0;

			if (me.options.display) {
				if (me.isHorizontal()) {
					me.paddingRight = lastWidth / 2 + 3;
					me.paddingLeft = firstWidth / 2 + 3;

					if (!me.longestTextCache) {
						me.longestTextCache = {};
					}
					var originalLabelWidth = helpers.longestText(context, tickLabelFont, me.ticks, me.longestTextCache);
					var labelWidth = originalLabelWidth;
					var cosRotation;
					var sinRotation;

					// Allow 3 pixels x2 padding either side for label readability
					// only the index matters for a dataset scale, but we want a consistent interface between scales
					var tickWidth = me.getPixelForTick(1) - me.getPixelForTick(0) - 6;

					//Max label rotation can be set or default to 90 - also act as a loop counter
					while (labelWidth > tickWidth && me.labelRotation < optionTicks.maxRotation) {
						cosRotation = Math.cos(helpers.toRadians(me.labelRotation));
						sinRotation = Math.sin(helpers.toRadians(me.labelRotation));

						firstRotated = cosRotation * firstWidth;

						// We're right aligning the text now.
						if (firstRotated + tickFontSize / 2 > me.yLabelWidth) {
							me.paddingLeft = firstRotated + tickFontSize / 2;
						}

						me.paddingRight = tickFontSize / 2;

						if (sinRotation * originalLabelWidth > me.maxHeight) {
							// go back one step
							me.labelRotation--;
							break;
						}

						me.labelRotation++;
						labelWidth = cosRotation * originalLabelWidth;
					}
				}
			}

			if (me.margins) {
				me.paddingLeft = Math.max(me.paddingLeft - me.margins.left, 0);
				me.paddingRight = Math.max(me.paddingRight - me.margins.right, 0);
			}
		},
		afterCalculateTickRotation: function() {
			helpers.callCallback(this.options.afterCalculateTickRotation, [this]);
		},

		//

		beforeFit: function() {
			helpers.callCallback(this.options.beforeFit, [this]);
		},
		fit: function() {
			var me = this;
			// Reset
			var minSize = me.minSize = {
				width: 0,
				height: 0
			};

			var opts = me.options;
			var globalDefaults = Chart.defaults.global;
			var tickOpts = opts.ticks;
			var scaleLabelOpts = opts.scaleLabel;
			var display = opts.display;
			var isHorizontal = me.isHorizontal();

			var tickFontSize = helpers.getValueOrDefault(tickOpts.fontSize, globalDefaults.defaultFontSize);
			var tickFontStyle = helpers.getValueOrDefault(tickOpts.fontStyle, globalDefaults.defaultFontStyle);
			var tickFontFamily = helpers.getValueOrDefault(tickOpts.fontFamily, globalDefaults.defaultFontFamily);
			var tickLabelFont = helpers.fontString(tickFontSize, tickFontStyle, tickFontFamily);

			var scaleLabelFontSize = helpers.getValueOrDefault(scaleLabelOpts.fontSize, globalDefaults.defaultFontSize);
			var scaleLabelFontStyle = helpers.getValueOrDefault(scaleLabelOpts.fontStyle, globalDefaults.defaultFontStyle);
			var scaleLabelFontFamily = helpers.getValueOrDefault(scaleLabelOpts.fontFamily, globalDefaults.defaultFontFamily);
			var scaleLabelFont = helpers.fontString(scaleLabelFontSize, scaleLabelFontStyle, scaleLabelFontFamily);

			var tickMarkLength = opts.gridLines.tickMarkLength;

			// Width
			if (isHorizontal) {
				// subtract the margins to line up with the chartArea if we are a full width scale
				minSize.width = me.isFullWidth() ? me.maxWidth - me.margins.left - me.margins.right : me.maxWidth;
			} else {
				minSize.width = display ? tickMarkLength : 0;
			}

			// height
			if (isHorizontal) {
				minSize.height = display ? tickMarkLength : 0;
			} else {
				minSize.height = me.maxHeight; // fill all the height
			}

			// Are we showing a title for the scale?
			if (scaleLabelOpts.display && display) {
				if (isHorizontal) {
					minSize.height += (scaleLabelFontSize * 1.5);
				} else {
					minSize.width += (scaleLabelFontSize * 1.5);
				}
			}

			if (tickOpts.display && display) {
				// Don't bother fitting the ticks if we are not showing them
				if (!me.longestTextCache) {
					me.longestTextCache = {};
				}

				var largestTextWidth = helpers.longestText(me.ctx, tickLabelFont, me.ticks, me.longestTextCache);
				var tallestLabelHeightInLines = helpers.numberOfLabelLines(me.ticks);
				var lineSpace = tickFontSize * 0.5;

				if (isHorizontal) {
					// A horizontal axis is more constrained by the height.
					me.longestLabelWidth = largestTextWidth;

					// TODO - improve this calculation
					var labelHeight = (Math.sin(helpers.toRadians(me.labelRotation)) * me.longestLabelWidth) + (tickFontSize * tallestLabelHeightInLines) + (lineSpace * tallestLabelHeightInLines);

					minSize.height = Math.min(me.maxHeight, minSize.height + labelHeight);
					me.ctx.font = tickLabelFont;

					var firstLabelWidth = me.ctx.measureText(me.ticks[0]).width;
					var lastLabelWidth = me.ctx.measureText(me.ticks[me.ticks.length - 1]).width;

					// Ensure that our ticks are always inside the canvas. When rotated, ticks are right aligned which means that the right padding is dominated
					// by the font height
					var cosRotation = Math.cos(helpers.toRadians(me.labelRotation));
					var sinRotation = Math.sin(helpers.toRadians(me.labelRotation));
					me.paddingLeft = me.labelRotation !== 0 ? (cosRotation * firstLabelWidth) + 3 : firstLabelWidth / 2 + 3; // add 3 px to move away from canvas edges
					me.paddingRight = me.labelRotation !== 0 ? (sinRotation * (tickFontSize / 2)) + 3 : lastLabelWidth / 2 + 3; // when rotated
				} else {
					// A vertical axis is more constrained by the width. Labels are the dominant factor here, so get that length first
					var maxLabelWidth = me.maxWidth - minSize.width;

					// Account for padding
					var mirror = tickOpts.mirror;
					if (!mirror) {
						largestTextWidth += me.options.ticks.padding;
					} else {
						// If mirrored text is on the inside so don't expand
						largestTextWidth = 0;
					}

					if (largestTextWidth < maxLabelWidth) {
						// We don't need all the room
						minSize.width += largestTextWidth;
					} else {
						// Expand to max size
						minSize.width = me.maxWidth;
					}

					me.paddingTop = tickFontSize / 2;
					me.paddingBottom = tickFontSize / 2;
				}
			}

			if (me.margins) {
				me.paddingLeft = Math.max(me.paddingLeft - me.margins.left, 0);
				me.paddingTop = Math.max(me.paddingTop - me.margins.top, 0);
				me.paddingRight = Math.max(me.paddingRight - me.margins.right, 0);
				me.paddingBottom = Math.max(me.paddingBottom - me.margins.bottom, 0);
			}

			me.width = minSize.width;
			me.height = minSize.height;

		},
		afterFit: function() {
			helpers.callCallback(this.options.afterFit, [this]);
		},

		// Shared Methods
		isHorizontal: function() {
			return this.options.position === "top" || this.options.position === "bottom";
		},
		isFullWidth: function() {
			return (this.options.fullWidth);
		},

		// Get the correct value. NaN bad inputs, If the value type is object get the x or y based on whether we are horizontal or not
		getRightValue: function getRightValue(rawValue) {
			// Null and undefined values first
			if (rawValue === null || typeof(rawValue) === 'undefined') {
				return NaN;
			}
			// isNaN(object) returns true, so make sure NaN is checking for a number
			if (typeof(rawValue) === 'number' && isNaN(rawValue)) {
				return NaN;
			}
			// If it is in fact an object, dive in one more level
			if (typeof(rawValue) === "object") {
				if ((rawValue instanceof Date) || (rawValue.isValid)) {
					return rawValue;
				} else {
					return getRightValue(this.isHorizontal() ? rawValue.x : rawValue.y);
				}
			}

			// Value is good, return it
			return rawValue;
		},

		// Used to get the value to display in the tooltip for the data at the given index
		// function getLabelForIndex(index, datasetIndex)
		getLabelForIndex: helpers.noop,

		// Used to get data value locations.  Value can either be an index or a numerical value
		getPixelForValue: helpers.noop,

		// Used to get the data value from a given pixel. This is the inverse of getPixelForValue
		getValueForPixel: helpers.noop,

		// Used for tick location, should
		getPixelForTick: function(index, includeOffset) {
			var me = this;
			if (me.isHorizontal()) {
				var innerWidth = me.width - (me.paddingLeft + me.paddingRight);
				var tickWidth = innerWidth / Math.max((me.ticks.length - ((me.options.gridLines.offsetGridLines) ? 0 : 1)), 1);
				var pixel = (tickWidth * index) + me.paddingLeft;

				if (includeOffset) {
					pixel += tickWidth / 2;
				}

				var finalVal = me.left + Math.round(pixel);
				finalVal += me.isFullWidth() ? me.margins.left : 0;
				return finalVal;
			} else {
				var innerHeight = me.height - (me.paddingTop + me.paddingBottom);
				return me.top + (index * (innerHeight / (me.ticks.length - 1)));
			}
		},

		// Utility for getting the pixel location of a percentage of scale
		getPixelForDecimal: function(decimal /*, includeOffset*/ ) {
			var me = this;
			if (me.isHorizontal()) {
				var innerWidth = me.width - (me.paddingLeft + me.paddingRight);
				var valueOffset = (innerWidth * decimal) + me.paddingLeft;

				var finalVal = me.left + Math.round(valueOffset);
				finalVal += me.isFullWidth() ? me.margins.left : 0;
				return finalVal;
			} else {
				return me.top + (decimal * me.height);
			}
		},

		getBasePixel: function() {
			var me = this;
			var min = me.min;
			var max = me.max;

			return me.getPixelForValue(
				me.beginAtZero? 0:
				min < 0 && max < 0? max :
				min > 0 && max > 0? min :
				0);
		},

		// Actualy draw the scale on the canvas
		// @param {rectangle} chartArea : the area of the chart to draw full grid lines on
		draw: function(chartArea) {
			var me = this;
			var options = me.options;
			if (!options.display) {
				return;
			}

			var context = me.ctx;
			var globalDefaults = Chart.defaults.global;
			var optionTicks = options.ticks;
			var gridLines = options.gridLines;
			var scaleLabel = options.scaleLabel;

			var isRotated = me.labelRotation !== 0;
			var skipRatio;
			var useAutoskipper = optionTicks.autoSkip;
			var isHorizontal = me.isHorizontal();

			// figure out the maximum number of gridlines to show
			var maxTicks;
			if (optionTicks.maxTicksLimit) {
				maxTicks = optionTicks.maxTicksLimit;
			}

			var tickFontColor = helpers.getValueOrDefault(optionTicks.fontColor, globalDefaults.defaultFontColor);
			var tickFontSize = helpers.getValueOrDefault(optionTicks.fontSize, globalDefaults.defaultFontSize);
			var tickFontStyle = helpers.getValueOrDefault(optionTicks.fontStyle, globalDefaults.defaultFontStyle);
			var tickFontFamily = helpers.getValueOrDefault(optionTicks.fontFamily, globalDefaults.defaultFontFamily);
			var tickLabelFont = helpers.fontString(tickFontSize, tickFontStyle, tickFontFamily);
			var tl = gridLines.tickMarkLength;

			var scaleLabelFontColor = helpers.getValueOrDefault(scaleLabel.fontColor, globalDefaults.defaultFontColor);
			var scaleLabelFontSize = helpers.getValueOrDefault(scaleLabel.fontSize, globalDefaults.defaultFontSize);
			var scaleLabelFontStyle = helpers.getValueOrDefault(scaleLabel.fontStyle, globalDefaults.defaultFontStyle);
			var scaleLabelFontFamily = helpers.getValueOrDefault(scaleLabel.fontFamily, globalDefaults.defaultFontFamily);
			var scaleLabelFont = helpers.fontString(scaleLabelFontSize, scaleLabelFontStyle, scaleLabelFontFamily);

			var labelRotationRadians = helpers.toRadians(me.labelRotation);
			var cosRotation = Math.cos(labelRotationRadians);
			var sinRotation = Math.sin(labelRotationRadians);
			var longestRotatedLabel = me.longestLabelWidth * cosRotation;
			var rotatedLabelHeight = tickFontSize * sinRotation;

			// Make sure we draw text in the correct color and font
			context.fillStyle = tickFontColor;

			var itemsToDraw = [];

			if (isHorizontal) {
				skipRatio = false;

                // Only calculate the skip ratio with the half width of longestRotateLabel if we got an actual rotation
                // See #2584
                if (isRotated) {
                    longestRotatedLabel /= 2;
                }

				if ((longestRotatedLabel + optionTicks.autoSkipPadding) * me.ticks.length > (me.width - (me.paddingLeft + me.paddingRight))) {
					skipRatio = 1 + Math.floor(((longestRotatedLabel + optionTicks.autoSkipPadding) * me.ticks.length) / (me.width - (me.paddingLeft + me.paddingRight)));
				}

				// if they defined a max number of optionTicks,
				// increase skipRatio until that number is met
				if (maxTicks && me.ticks.length > maxTicks) {
					while (!skipRatio || me.ticks.length / (skipRatio || 1) > maxTicks) {
						if (!skipRatio) {
							skipRatio = 1;
						}
						skipRatio += 1;
					}
				}

				if (!useAutoskipper) {
					skipRatio = false;
				}
			}


			var xTickStart = options.position === "right" ? me.left : me.right - tl;
			var xTickEnd = options.position === "right" ? me.left + tl : me.right;
			var yTickStart = options.position === "bottom" ? me.top : me.bottom - tl;
			var yTickEnd = options.position === "bottom" ? me.top + tl : me.bottom;

			helpers.each(me.ticks, function(label, index) {
				// If the callback returned a null or undefined value, do not draw this line
				if (label === undefined || label === null) {
					return;
				}

				var isLastTick = me.ticks.length === index + 1;

				// Since we always show the last tick,we need may need to hide the last shown one before
				var shouldSkip = (skipRatio > 1 && index % skipRatio > 0) || (index % skipRatio === 0 && index + skipRatio >= me.ticks.length);
				if (shouldSkip && !isLastTick || (label === undefined || label === null)) {
					return;
				}

				var lineWidth, lineColor;
				if (index === (typeof me.zeroLineIndex !== 'undefined' ? me.zeroLineIndex : 0)) {
					// Draw the first index specially
					lineWidth = gridLines.zeroLineWidth;
					lineColor = gridLines.zeroLineColor;
				} else  {
					lineWidth = helpers.getValueAtIndexOrDefault(gridLines.lineWidth, index);
					lineColor = helpers.getValueAtIndexOrDefault(gridLines.color, index);
				}

				// Common properties
				var tx1, ty1, tx2, ty2, x1, y1, x2, y2, labelX, labelY;
				var textAlign, textBaseline = 'middle';

				if (isHorizontal) {
					if (!isRotated) {
						textBaseline = options.position === 'top' ? 'bottom' : 'top';
					}

					textAlign = isRotated ? 'right' : 'center';

					var xLineValue = me.getPixelForTick(index) + helpers.aliasPixel(lineWidth); // xvalues for grid lines
					labelX = me.getPixelForTick(index, gridLines.offsetGridLines) + optionTicks.labelOffset; // x values for optionTicks (need to consider offsetLabel option)
					labelY = (isRotated) ? me.top + 12 : options.position === 'top' ? me.bottom - tl : me.top + tl;

					tx1 = tx2 = x1 = x2 = xLineValue;
					ty1 = yTickStart;
					ty2 = yTickEnd;
					y1 = chartArea.top;
					y2 = chartArea.bottom;
				} else {
					if (options.position === 'left') {
						if (optionTicks.mirror) {
							labelX = me.right + optionTicks.padding;
							textAlign = 'left';
						} else {
							labelX = me.right - optionTicks.padding;
							textAlign = 'right';
						}
					} else {
						// right side
						if (optionTicks.mirror) {
							labelX = me.left - optionTicks.padding;
							textAlign = 'right';
						} else {
							labelX = me.left + optionTicks.padding;
							textAlign = 'left';
						}
					}

					var yLineValue = me.getPixelForTick(index); // xvalues for grid lines
					yLineValue += helpers.aliasPixel(lineWidth);
					labelY = me.getPixelForTick(index, gridLines.offsetGridLines);

					tx1 = xTickStart;
					tx2 = xTickEnd;
					x1 = chartArea.left;
					x2 = chartArea.right;
					ty1 = ty2 = y1 = y2 = yLineValue;
				}

				itemsToDraw.push({
					tx1: tx1,
					ty1: ty1,
					tx2: tx2,
					ty2: ty2,
					x1: x1,
					y1: y1,
					x2: x2,
					y2: y2,
					labelX: labelX,
					labelY: labelY,
					glWidth: lineWidth,
					glColor: lineColor,
					rotation: -1 * labelRotationRadians,
					label: label,
					textBaseline: textBaseline,
					textAlign: textAlign
				});
			});

			// Draw all of the tick labels, tick marks, and grid lines at the correct places
			helpers.each(itemsToDraw, function(itemToDraw) {
				if (gridLines.display) {
					context.lineWidth = itemToDraw.glWidth;
					context.strokeStyle = itemToDraw.glColor;

					context.beginPath();

					if (gridLines.drawTicks) {
						context.moveTo(itemToDraw.tx1, itemToDraw.ty1);
						context.lineTo(itemToDraw.tx2, itemToDraw.ty2);
					}

					if (gridLines.drawOnChartArea) {
						context.moveTo(itemToDraw.x1, itemToDraw.y1);
						context.lineTo(itemToDraw.x2, itemToDraw.y2);
					}

					context.stroke();
				}

				if (optionTicks.display) {
					context.save();
					context.translate(itemToDraw.labelX, itemToDraw.labelY);
					context.rotate(itemToDraw.rotation);
					context.font = tickLabelFont;
					context.textBaseline = itemToDraw.textBaseline;
					context.textAlign = itemToDraw.textAlign;

					var label = itemToDraw.label;
					if (helpers.isArray(label)) {
						for (var i = 0, y = 0; i < label.length; ++i) {
							// We just make sure the multiline element is a string here..
							context.fillText('' + label[i], 0, y);
							// apply same lineSpacing as calculated @ L#320
							y += (tickFontSize * 1.5);
						}
					} else {
						context.fillText(label, 0, 0);
					}
					context.restore();
				}
			});

			if (scaleLabel.display) {
				// Draw the scale label
				var scaleLabelX;
				var scaleLabelY;
				var rotation = 0;

				if (isHorizontal) {
					scaleLabelX = me.left + ((me.right - me.left) / 2); // midpoint of the width
					scaleLabelY = options.position === 'bottom' ? me.bottom - (scaleLabelFontSize / 2) : me.top + (scaleLabelFontSize / 2);
				} else {
					var isLeft = options.position === 'left';
					scaleLabelX = isLeft ? me.left + (scaleLabelFontSize / 2) : me.right - (scaleLabelFontSize / 2);
					scaleLabelY = me.top + ((me.bottom - me.top) / 2);
					rotation = isLeft ? -0.5 * Math.PI : 0.5 * Math.PI;
				}
				
				context.save();
				context.translate(scaleLabelX, scaleLabelY);
				context.rotate(rotation);
				context.textAlign = 'center';
				context.textBaseline = 'middle';
				context.fillStyle = scaleLabelFontColor; // render in correct colour
				context.font = scaleLabelFont;
				context.fillText(scaleLabel.labelString, 0, 0);
				context.restore();
			}

			if (gridLines.drawBorder) {
				// Draw the line at the edge of the axis
				context.lineWidth = helpers.getValueAtIndexOrDefault(gridLines.lineWidth, 0);
				context.strokeStyle = helpers.getValueAtIndexOrDefault(gridLines.color, 0);
				var x1 = me.left,
					x2 = me.right,
					y1 = me.top,
					y2 = me.bottom;

				var aliasPixel = helpers.aliasPixel(context.lineWidth);
				if (isHorizontal) {
					y1 = y2 = options.position === 'top' ? me.bottom : me.top;
					y1 += aliasPixel;
					y2 += aliasPixel;
				} else {
					x1 = x2 = options.position === 'left' ? me.right : me.left;
					x1 += aliasPixel;
					x2 += aliasPixel;
				}

				context.beginPath();
				context.moveTo(x1, y1);
				context.lineTo(x2, y2);
				context.stroke();
			}
		}
	});
};

},{}],27:[function(require,module,exports){
"use strict";

module.exports = function(Chart) {

	var helpers = Chart.helpers;

	Chart.scaleService = {
		// Scale registration object. Extensions can register new scale types (such as log or DB scales) and then
		// use the new chart options to grab the correct scale
		constructors: {},
		// Use a registration function so that we can move to an ES6 map when we no longer need to support
		// old browsers

		// Scale config defaults
		defaults: {},
		registerScaleType: function(type, scaleConstructor, defaults) {
			this.constructors[type] = scaleConstructor;
			this.defaults[type] = helpers.clone(defaults);
		},
		getScaleConstructor: function(type) {
			return this.constructors.hasOwnProperty(type) ? this.constructors[type] : undefined;
		},
		getScaleDefaults: function(type) {
			// Return the scale defaults merged with the global settings so that we always use the latest ones
			return this.defaults.hasOwnProperty(type) ? helpers.scaleMerge(Chart.defaults.scale, this.defaults[type]) : {};
		},
		updateScaleDefaults: function(type, additions) {
			var defaults = this.defaults;
			if (defaults.hasOwnProperty(type)) {
				defaults[type] = helpers.extend(defaults[type], additions);
			}
		},
		addScalesToLayout: function(chartInstance) {
			// Adds each scale to the chart.boxes array to be sized accordingly
			helpers.each(chartInstance.scales, function(scale) {
				Chart.layoutService.addBox(chartInstance, scale);
			});
		}
	};
};
},{}],28:[function(require,module,exports){
"use strict";

module.exports = function(Chart) {

	var helpers = Chart.helpers;

	Chart.defaults.global.title = {
		display: false,
		position: 'top',
		fullWidth: true, // marks that this box should take the full width of the canvas (pushing down other boxes)

		fontStyle: 'bold',
		padding: 10,

		// actual title
		text: ''
	};

	var noop = helpers.noop;
	Chart.Title = Chart.Element.extend({

		initialize: function(config) {
			var me = this;
			helpers.extend(me, config);
			me.options = helpers.configMerge(Chart.defaults.global.title, config.options);

			// Contains hit boxes for each dataset (in dataset order)
			me.legendHitBoxes = [];
		},

		// These methods are ordered by lifecyle. Utilities then follow.

		beforeUpdate: function () {
			var chartOpts = this.chart.options;
			if (chartOpts && chartOpts.title) {
				this.options = helpers.configMerge(Chart.defaults.global.title, chartOpts.title);
			}
		},
		update: function(maxWidth, maxHeight, margins) {
			var me = this;

			// Update Lifecycle - Probably don't want to ever extend or overwrite this function ;)
			me.beforeUpdate();

			// Absorb the master measurements
			me.maxWidth = maxWidth;
			me.maxHeight = maxHeight;
			me.margins = margins;

			// Dimensions
			me.beforeSetDimensions();
			me.setDimensions();
			me.afterSetDimensions();
			// Labels
			me.beforeBuildLabels();
			me.buildLabels();
			me.afterBuildLabels();

			// Fit
			me.beforeFit();
			me.fit();
			me.afterFit();
			//
			me.afterUpdate();

			return me.minSize;

		},
		afterUpdate: noop,

		//

		beforeSetDimensions: noop,
		setDimensions: function() {
			var me = this;
			// Set the unconstrained dimension before label rotation
			if (me.isHorizontal()) {
				// Reset position before calculating rotation
				me.width = me.maxWidth;
				me.left = 0;
				me.right = me.width;
			} else {
				me.height = me.maxHeight;

				// Reset position before calculating rotation
				me.top = 0;
				me.bottom = me.height;
			}

			// Reset padding
			me.paddingLeft = 0;
			me.paddingTop = 0;
			me.paddingRight = 0;
			me.paddingBottom = 0;

			// Reset minSize
			me.minSize = {
				width: 0,
				height: 0
			};
		},
		afterSetDimensions: noop,

		//

		beforeBuildLabels: noop,
		buildLabels: noop,
		afterBuildLabels: noop,

		//

		beforeFit: noop,
		fit: function() {

			var me = this,
				ctx = me.ctx,
				valueOrDefault = helpers.getValueOrDefault,
				opts = me.options,
				globalDefaults = Chart.defaults.global,
				display = opts.display,
				fontSize = valueOrDefault(opts.fontSize, globalDefaults.defaultFontSize),
				minSize = me.minSize;

			if (me.isHorizontal()) {
				minSize.width = me.maxWidth; // fill all the width
				minSize.height = display ? fontSize + (opts.padding * 2) : 0;
			} else {
				minSize.width = display ? fontSize + (opts.padding * 2) : 0;
				minSize.height = me.maxHeight; // fill all the height
			}

			me.width = minSize.width;
			me.height = minSize.height;

		},
		afterFit: noop,

		// Shared Methods
		isHorizontal: function() {
			var pos = this.options.position;
			return pos === "top" || pos === "bottom";
		},

		// Actualy draw the title block on the canvas
		draw: function() {
			var me = this,
				ctx = me.ctx,
				valueOrDefault = helpers.getValueOrDefault,
				opts = me.options,
				globalDefaults = Chart.defaults.global;

			if (opts.display) {
				var fontSize = valueOrDefault(opts.fontSize, globalDefaults.defaultFontSize),
					fontStyle = valueOrDefault(opts.fontStyle, globalDefaults.defaultFontStyle),
					fontFamily = valueOrDefault(opts.fontFamily, globalDefaults.defaultFontFamily),
					titleFont = helpers.fontString(fontSize, fontStyle, fontFamily),
					rotation = 0,
					titleX,
					titleY,
					top = me.top,
					left = me.left,
					bottom = me.bottom,
					right = me.right;

				ctx.fillStyle = valueOrDefault(opts.fontColor, globalDefaults.defaultFontColor); // render in correct colour
				ctx.font = titleFont;

				// Horizontal
				if (me.isHorizontal()) {
					titleX = left + ((right - left) / 2); // midpoint of the width
					titleY = top + ((bottom - top) / 2); // midpoint of the height
				} else {
					titleX = opts.position === 'left' ? left + (fontSize / 2) : right - (fontSize / 2);
					titleY = top + ((bottom - top) / 2);
					rotation = Math.PI * (opts.position === 'left' ? -0.5 : 0.5);
				}

				ctx.save();
				ctx.translate(titleX, titleY);
				ctx.rotate(rotation);
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				ctx.fillText(opts.text, 0, 0);
				ctx.restore();
			}
		}
	});

	// Register the title plugin
	Chart.plugins.register({
		beforeInit: function(chartInstance) {
			var opts = chartInstance.options;
			var titleOpts = opts.title;

			if (titleOpts) {
				chartInstance.titleBlock = new Chart.Title({
					ctx: chartInstance.chart.ctx,
					options: titleOpts,
					chart: chartInstance
				});

				Chart.layoutService.addBox(chartInstance, chartInstance.titleBlock);
			}
		}
	});
};

},{}],29:[function(require,module,exports){
"use strict";

module.exports = function(Chart) {

	var helpers = Chart.helpers;

	Chart.defaults.global.tooltips = {
		enabled: true,
		custom: null,
		mode: 'single',
		backgroundColor: "rgba(0,0,0,0.8)",
		titleFontStyle: "bold",
		titleSpacing: 2,
		titleMarginBottom: 6,
		titleFontColor: "#fff",
		titleAlign: "left",
		bodySpacing: 2,
		bodyFontColor: "#fff",
		bodyAlign: "left",
		footerFontStyle: "bold",
		footerSpacing: 2,
		footerMarginTop: 6,
		footerFontColor: "#fff",
		footerAlign: "left",
		yPadding: 6,
		xPadding: 6,
		yAlign : 'center',
		xAlign : 'center',
		caretSize: 5,
		cornerRadius: 6,
		multiKeyBackground: '#fff',
		callbacks: {
			// Args are: (tooltipItems, data)
			beforeTitle: helpers.noop,
			title: function(tooltipItems, data) {
				// Pick first xLabel for now
				var title = '';
				var labels = data.labels;
				var labelCount = labels ? labels.length : 0;

				if (tooltipItems.length > 0) {
					var item = tooltipItems[0];

					if (item.xLabel) {
						title = item.xLabel;
					} else if (labelCount > 0 && item.index < labelCount) {
						title = labels[item.index];
					}
				}

				return title;
			},
			afterTitle: helpers.noop,

			// Args are: (tooltipItems, data)
			beforeBody: helpers.noop,

			// Args are: (tooltipItem, data)
			beforeLabel: helpers.noop,
			label: function(tooltipItem, data) {
				var datasetLabel = data.datasets[tooltipItem.datasetIndex].label || '';
				return datasetLabel + ': ' + tooltipItem.yLabel;
			},
			labelColor: function(tooltipItem, chartInstance) {
				var meta = chartInstance.getDatasetMeta(tooltipItem.datasetIndex);
				var activeElement = meta.data[tooltipItem.index];
				var view = activeElement._view;
				return {
					borderColor: view.borderColor,
					backgroundColor: view.backgroundColor
				};
			},
			afterLabel: helpers.noop,

			// Args are: (tooltipItems, data)
			afterBody: helpers.noop,

			// Args are: (tooltipItems, data)
			beforeFooter: helpers.noop,
			footer: helpers.noop,
			afterFooter: helpers.noop
		}
	};

	// Helper to push or concat based on if the 2nd parameter is an array or not
	function pushOrConcat(base, toPush) {
		if (toPush) {
			if (helpers.isArray(toPush)) {
				//base = base.concat(toPush);
				Array.prototype.push.apply(base, toPush);
			} else {
				base.push(toPush);
			}
		}

		return base;
	}

	function getAveragePosition(elements) {
		if (!elements.length) {
			return false;
		}

		var i, len;
		var xPositions = [];
		var yPositions = [];

		for (i = 0, len = elements.length; i < len; ++i) {
			var el = elements[i];
			if (el && el.hasValue()){
				var pos = el.tooltipPosition();
				xPositions.push(pos.x);
				yPositions.push(pos.y);
			}
		}

		var x = 0,
			y = 0;
		for (i = 0, len - xPositions.length; i < len; ++i) {
			x += xPositions[i];
			y += yPositions[i];
		}

		return {
			x: Math.round(x / xPositions.length),
			y: Math.round(y / xPositions.length)
		};
	}

	// Private helper to create a tooltip iteam model
	// @param element : the chart element (point, arc, bar) to create the tooltip item for
	// @return : new tooltip item
	function createTooltipItem(element) {
		var xScale = element._xScale;
		var yScale = element._yScale || element._scale; // handle radar || polarArea charts
		var index = element._index,
			datasetIndex = element._datasetIndex;

		return {
			xLabel: xScale ? xScale.getLabelForIndex(index, datasetIndex) : '',
			yLabel: yScale ? yScale.getLabelForIndex(index, datasetIndex) : '',
			index: index,
			datasetIndex: datasetIndex
		};
	}

	Chart.Tooltip = Chart.Element.extend({
		initialize: function() {
			var me = this;
			var globalDefaults = Chart.defaults.global;
			var tooltipOpts = me._options;
			var getValueOrDefault = helpers.getValueOrDefault;

			helpers.extend(me, {
				_model: {
					// Positioning
					xPadding: tooltipOpts.xPadding,
					yPadding: tooltipOpts.yPadding,
					xAlign : tooltipOpts.yAlign,
					yAlign : tooltipOpts.xAlign,

					// Body
					bodyFontColor: tooltipOpts.bodyFontColor,
					_bodyFontFamily: getValueOrDefault(tooltipOpts.bodyFontFamily, globalDefaults.defaultFontFamily),
					_bodyFontStyle: getValueOrDefault(tooltipOpts.bodyFontStyle, globalDefaults.defaultFontStyle),
					_bodyAlign: tooltipOpts.bodyAlign,
					bodyFontSize: getValueOrDefault(tooltipOpts.bodyFontSize, globalDefaults.defaultFontSize),
					bodySpacing: tooltipOpts.bodySpacing,

					// Title
					titleFontColor: tooltipOpts.titleFontColor,
					_titleFontFamily: getValueOrDefault(tooltipOpts.titleFontFamily, globalDefaults.defaultFontFamily),
					_titleFontStyle: getValueOrDefault(tooltipOpts.titleFontStyle, globalDefaults.defaultFontStyle),
					titleFontSize: getValueOrDefault(tooltipOpts.titleFontSize, globalDefaults.defaultFontSize),
					_titleAlign: tooltipOpts.titleAlign,
					titleSpacing: tooltipOpts.titleSpacing,
					titleMarginBottom: tooltipOpts.titleMarginBottom,

					// Footer
					footerFontColor: tooltipOpts.footerFontColor,
					_footerFontFamily: getValueOrDefault(tooltipOpts.footerFontFamily, globalDefaults.defaultFontFamily),
					_footerFontStyle: getValueOrDefault(tooltipOpts.footerFontStyle, globalDefaults.defaultFontStyle),
					footerFontSize: getValueOrDefault(tooltipOpts.footerFontSize, globalDefaults.defaultFontSize),
					_footerAlign: tooltipOpts.footerAlign,
					footerSpacing: tooltipOpts.footerSpacing,
					footerMarginTop: tooltipOpts.footerMarginTop,

					// Appearance
					caretSize: tooltipOpts.caretSize,
					cornerRadius: tooltipOpts.cornerRadius,
					backgroundColor: tooltipOpts.backgroundColor,
					opacity: 0,
					legendColorBackground: tooltipOpts.multiKeyBackground
				}
			});
		},

		// Get the title
		// Args are: (tooltipItem, data)
		getTitle: function() {
			var me = this;
			var opts = me._options;
			var callbacks = opts.callbacks;

			var beforeTitle = callbacks.beforeTitle.apply(me, arguments),
				title = callbacks.title.apply(me, arguments),
				afterTitle = callbacks.afterTitle.apply(me, arguments);

			var lines = [];
			lines = pushOrConcat(lines, beforeTitle);
			lines = pushOrConcat(lines, title);
			lines = pushOrConcat(lines, afterTitle);

			return lines;
		},

		// Args are: (tooltipItem, data)
		getBeforeBody: function() {
			var lines = this._options.callbacks.beforeBody.apply(this, arguments);
			return helpers.isArray(lines) ? lines : lines !== undefined ? [lines] : [];
		},

		// Args are: (tooltipItem, data)
		getBody: function(tooltipItems, data) {
			var me = this;
			var callbacks = me._options.callbacks;
			var bodyItems = [];

			helpers.each(tooltipItems, function(tooltipItem) {
				var bodyItem = {
					before: [],
					lines: [],
					after: []
				};
				pushOrConcat(bodyItem.before, callbacks.beforeLabel.call(me, tooltipItem, data));
				pushOrConcat(bodyItem.lines, callbacks.label.call(me, tooltipItem, data));
				pushOrConcat(bodyItem.after, callbacks.afterLabel.call(me, tooltipItem, data));

				bodyItems.push(bodyItem);
			});

			return bodyItems;
		},

		// Args are: (tooltipItem, data)
		getAfterBody: function() {
			var lines = this._options.callbacks.afterBody.apply(this, arguments);
			return helpers.isArray(lines) ? lines : lines !== undefined ? [lines] : [];
		},

		// Get the footer and beforeFooter and afterFooter lines
		// Args are: (tooltipItem, data)
		getFooter: function() {
			var me = this;
			var callbacks = me._options.callbacks;

			var beforeFooter = callbacks.beforeFooter.apply(me, arguments);
			var footer = callbacks.footer.apply(me, arguments);
			var afterFooter = callbacks.afterFooter.apply(me, arguments);

			var lines = [];
			lines = pushOrConcat(lines, beforeFooter);
			lines = pushOrConcat(lines, footer);
			lines = pushOrConcat(lines, afterFooter);

			return lines;
		},

		update: function(changed) {
			var me = this;
			var opts = me._options;
			var model = me._model;
			var active = me._active;

			var data = me._data;
			var chartInstance = me._chartInstance;

			var i, len;

			if (active.length) {
				model.opacity = 1;

				var labelColors = [],
					tooltipPosition = getAveragePosition(active);

				var tooltipItems = [];
				for (i = 0, len = active.length; i < len; ++i) {
					tooltipItems.push(createTooltipItem(active[i]));
				}

				// If the user provided a sorting function, use it to modify the tooltip items
				if (opts.itemSort) {
					tooltipItems = tooltipItems.sort(opts.itemSort);
				}

				// If there is more than one item, show color items
				if (active.length > 1) {
					helpers.each(tooltipItems, function(tooltipItem) {
						labelColors.push(opts.callbacks.labelColor.call(me, tooltipItem, chartInstance));
					});
				}

				// Build the Text Lines
				helpers.extend(model, {
					title: me.getTitle(tooltipItems, data),
					beforeBody: me.getBeforeBody(tooltipItems, data),
					body: me.getBody(tooltipItems, data),
					afterBody: me.getAfterBody(tooltipItems, data),
					footer: me.getFooter(tooltipItems, data),
					x: Math.round(tooltipPosition.x),
					y: Math.round(tooltipPosition.y),
					caretPadding: helpers.getValueOrDefault(tooltipPosition.padding, 2),
					labelColors: labelColors
				});

				// We need to determine alignment of
				var tooltipSize = me.getTooltipSize(model);
				me.determineAlignment(tooltipSize); // Smart Tooltip placement to stay on the canvas

				helpers.extend(model, me.getBackgroundPoint(model, tooltipSize));
			} else {
				me._model.opacity = 0;
			}

			if (changed && opts.custom) {
				opts.custom.call(me, model);
			}

			return me;
		},
		getTooltipSize: function getTooltipSize(vm) {
			var ctx = this._chart.ctx;

			var size = {
				height: vm.yPadding * 2, // Tooltip Padding
				width: 0
			};

			// Count of all lines in the body
			var body = vm.body;
			var combinedBodyLength = body.reduce(function(count, bodyItem) {
				return count + bodyItem.before.length + bodyItem.lines.length + bodyItem.after.length;
			}, 0);
			combinedBodyLength += vm.beforeBody.length + vm.afterBody.length;

			var titleLineCount = vm.title.length;
			var footerLineCount = vm.footer.length;
			var titleFontSize = vm.titleFontSize,
				bodyFontSize = vm.bodyFontSize,
				footerFontSize = vm.footerFontSize;

			size.height += titleLineCount * titleFontSize; // Title Lines
			size.height += (titleLineCount - 1) * vm.titleSpacing; // Title Line Spacing
			size.height += titleLineCount ? vm.titleMarginBottom : 0; // Title's bottom Margin
			size.height += combinedBodyLength * bodyFontSize; // Body Lines
			size.height += combinedBodyLength ? (combinedBodyLength - 1) * vm.bodySpacing : 0; // Body Line Spacing
			size.height += footerLineCount ? vm.footerMarginTop : 0; // Footer Margin
			size.height += footerLineCount * (footerFontSize); // Footer Lines
			size.height += footerLineCount ? (footerLineCount - 1) * vm.footerSpacing : 0; // Footer Line Spacing

			// Title width
			var widthPadding = 0;
			var maxLineWidth = function(line) {
				size.width = Math.max(size.width, ctx.measureText(line).width + widthPadding);
			};

			ctx.font = helpers.fontString(titleFontSize, vm._titleFontStyle, vm._titleFontFamily);
			helpers.each(vm.title, maxLineWidth);

			// Body width
			ctx.font = helpers.fontString(bodyFontSize, vm._bodyFontStyle, vm._bodyFontFamily);
			helpers.each(vm.beforeBody.concat(vm.afterBody), maxLineWidth);

			// Body lines may include some extra width due to the color box
			widthPadding = body.length > 1 ? (bodyFontSize + 2) : 0;
			helpers.each(body, function(bodyItem) {
				helpers.each(bodyItem.before, maxLineWidth);
				helpers.each(bodyItem.lines, maxLineWidth);
				helpers.each(bodyItem.after, maxLineWidth);
			});

			// Reset back to 0
			widthPadding = 0;

			// Footer width
			ctx.font = helpers.fontString(footerFontSize, vm._footerFontStyle, vm._footerFontFamily);
			helpers.each(vm.footer, maxLineWidth);

			// Add padding
			size.width += 2 * vm.xPadding;

			return size;
		},
		determineAlignment: function determineAlignment(size) {
			var me = this;
			var model = me._model;
			var chart = me._chart;
			var chartArea = me._chartInstance.chartArea;

			if (model.y < size.height) {
				model.yAlign = 'top';
			} else if (model.y > (chart.height - size.height)) {
				model.yAlign = 'bottom';
			}

			var lf, rf; // functions to determine left, right alignment
			var olf, orf; // functions to determine if left/right alignment causes tooltip to go outside chart
			var yf; // function to get the y alignment if the tooltip goes outside of the left or right edges
			var midX = (chartArea.left + chartArea.right) / 2;
			var midY = (chartArea.top + chartArea.bottom) / 2;

			if (model.yAlign === 'center') {
				lf = function(x) {
					return x <= midX;
				};
				rf = function(x) {
					return x > midX;
				};
			} else {
				lf = function(x) {
					return x <= (size.width / 2);
				};
				rf = function(x) {
					return x >= (chart.width - (size.width / 2));
				};
			}

			olf = function(x) {
				return x + size.width > chart.width;
			};
			orf = function(x) {
				return x - size.width < 0;
			};
			yf = function(y) {
				return y <= midY ? 'top' : 'bottom';
			};

			if (lf(model.x)) {
				model.xAlign = 'left';

				// Is tooltip too wide and goes over the right side of the chart.?
				if (olf(model.x)) {
					model.xAlign = 'center';
					model.yAlign = yf(model.y);
				}
			} else if (rf(model.x)) {
				model.xAlign = 'right';

				// Is tooltip too wide and goes outside left edge of canvas?
				if (orf(model.x)) {
					model.xAlign = 'center';
					model.yAlign = yf(model.y);
				}
			}
		},
		getBackgroundPoint: function getBackgroundPoint(vm, size) {
			// Background Position
			var pt = {
				x: vm.x,
				y: vm.y
			};

			var caretSize = vm.caretSize,
				caretPadding = vm.caretPadding,
				cornerRadius = vm.cornerRadius,
				xAlign = vm.xAlign,
				yAlign = vm.yAlign,
				paddingAndSize = caretSize + caretPadding,
				radiusAndPadding = cornerRadius + caretPadding;

			if (xAlign === 'right') {
				pt.x -= size.width;
			} else if (xAlign === 'center') {
				pt.x -= (size.width / 2);
			}

			if (yAlign === 'top') {
				pt.y += paddingAndSize;
			} else if (yAlign === 'bottom') {
				pt.y -= size.height + paddingAndSize;
			} else {
				pt.y -= (size.height / 2);
			}

			if (yAlign === 'center') {
				if (xAlign === 'left') {
					pt.x += paddingAndSize;
				} else if (xAlign === 'right') {
					pt.x -= paddingAndSize;
				}
			} else {
				if (xAlign === 'left') {
					pt.x -= radiusAndPadding;
				} else if (xAlign === 'right') {
					pt.x += radiusAndPadding;
				}
			}

			return pt;
		},
		drawCaret: function drawCaret(tooltipPoint, size, opacity, caretPadding) {
			var vm = this._view;
			var ctx = this._chart.ctx;
			var x1, x2, x3;
			var y1, y2, y3;
			var caretSize = vm.caretSize;
			var cornerRadius = vm.cornerRadius;
			var xAlign = vm.xAlign,
				yAlign = vm.yAlign;
			var ptX = tooltipPoint.x,
				ptY = tooltipPoint.y;
			var width = size.width,
				height = size.height;

			if (yAlign === 'center') {
				// Left or right side
				if (xAlign === 'left') {
					x1 = ptX;
					x2 = x1 - caretSize;
					x3 = x1;
				} else {
					x1 = ptX + width;
					x2 = x1 + caretSize;
					x3 = x1;
				}

				y2 = ptY + (height / 2);
				y1 = y2 - caretSize;
				y3 = y2 + caretSize;
			} else {
				if (xAlign === 'left') {
					x1 = ptX + cornerRadius;
					x2 = x1 + caretSize;
					x3 = x2 + caretSize;
				} else if (xAlign === 'right') {
					x1 = ptX + width - cornerRadius;
					x2 = x1 - caretSize;
					x3 = x2 - caretSize;
				} else {
					x2 = ptX + (width / 2);
					x1 = x2 - caretSize;
					x3 = x2 + caretSize;
				}

				if (yAlign === 'top') {
					y1 = ptY;
					y2 = y1 - caretSize;
					y3 = y1;
				} else {
					y1 = ptY + height;
					y2 = y1 + caretSize;
					y3 = y1;
				}
			}

			var bgColor = helpers.color(vm.backgroundColor);
			ctx.fillStyle = bgColor.alpha(opacity * bgColor.alpha()).rgbString();
			ctx.beginPath();
			ctx.moveTo(x1, y1);
			ctx.lineTo(x2, y2);
			ctx.lineTo(x3, y3);
			ctx.closePath();
			ctx.fill();
		},
		drawTitle: function drawTitle(pt, vm, ctx, opacity) {
			var title = vm.title;

			if (title.length) {
				ctx.textAlign = vm._titleAlign;
				ctx.textBaseline = "top";

				var titleFontSize = vm.titleFontSize,
					titleSpacing = vm.titleSpacing;

				var titleFontColor = helpers.color(vm.titleFontColor);
				ctx.fillStyle = titleFontColor.alpha(opacity * titleFontColor.alpha()).rgbString();
				ctx.font = helpers.fontString(titleFontSize, vm._titleFontStyle, vm._titleFontFamily);

				var i, len;
				for (i = 0, len = title.length; i < len; ++i) {
					ctx.fillText(title[i], pt.x, pt.y);
					pt.y += titleFontSize + titleSpacing; // Line Height and spacing

					if (i + 1 === title.length) {
						pt.y += vm.titleMarginBottom - titleSpacing; // If Last, add margin, remove spacing
					}
				}
			}
		},
		drawBody: function drawBody(pt, vm, ctx, opacity) {
			var bodyFontSize = vm.bodyFontSize;
			var bodySpacing = vm.bodySpacing;
			var body = vm.body;

			ctx.textAlign = vm._bodyAlign;
			ctx.textBaseline = "top";

			var bodyFontColor = helpers.color(vm.bodyFontColor);
			var textColor = bodyFontColor.alpha(opacity * bodyFontColor.alpha()).rgbString();
			ctx.fillStyle = textColor;
			ctx.font = helpers.fontString(bodyFontSize, vm._bodyFontStyle, vm._bodyFontFamily);

			// Before Body
			var xLinePadding = 0;
			var fillLineOfText = function(line) {
				ctx.fillText(line, pt.x + xLinePadding, pt.y);
				pt.y += bodyFontSize + bodySpacing;
			};

			// Before body lines
			helpers.each(vm.beforeBody, fillLineOfText);

			var drawColorBoxes = body.length > 1;
			xLinePadding = drawColorBoxes ? (bodyFontSize + 2) : 0;

			// Draw body lines now
			helpers.each(body, function(bodyItem, i) {
				helpers.each(bodyItem.before, fillLineOfText);

				helpers.each(bodyItem.lines, function(line) {
					// Draw Legend-like boxes if needed
					if (drawColorBoxes) {
						// Fill a white rect so that colours merge nicely if the opacity is < 1
						ctx.fillStyle = helpers.color(vm.legendColorBackground).alpha(opacity).rgbaString();
						ctx.fillRect(pt.x, pt.y, bodyFontSize, bodyFontSize);

						// Border
						ctx.strokeStyle = helpers.color(vm.labelColors[i].borderColor).alpha(opacity).rgbaString();
						ctx.strokeRect(pt.x, pt.y, bodyFontSize, bodyFontSize);

						// Inner square
						ctx.fillStyle = helpers.color(vm.labelColors[i].backgroundColor).alpha(opacity).rgbaString();
						ctx.fillRect(pt.x + 1, pt.y + 1, bodyFontSize - 2, bodyFontSize - 2);

						ctx.fillStyle = textColor;
					}

					fillLineOfText(line);
				});

				helpers.each(bodyItem.after, fillLineOfText);
			});

			// Reset back to 0 for after body
			xLinePadding = 0;

			// After body lines
			helpers.each(vm.afterBody, fillLineOfText);
			pt.y -= bodySpacing; // Remove last body spacing
		},
		drawFooter: function drawFooter(pt, vm, ctx, opacity) {
			var footer = vm.footer;

			if (footer.length) {
				pt.y += vm.footerMarginTop;

				ctx.textAlign = vm._footerAlign;
				ctx.textBaseline = "top";

				var footerFontColor = helpers.color(vm.footerFontColor);
				ctx.fillStyle = footerFontColor.alpha(opacity * footerFontColor.alpha()).rgbString();
				ctx.font = helpers.fontString(vm.footerFontSize, vm._footerFontStyle, vm._footerFontFamily);

				helpers.each(footer, function(line) {
					ctx.fillText(line, pt.x, pt.y);
					pt.y += vm.footerFontSize + vm.footerSpacing;
				});
			}
		},
		draw: function draw() {
			var ctx = this._chart.ctx;
			var vm = this._view;

			if (vm.opacity === 0) {
				return;
			}

			var tooltipSize = this.getTooltipSize(vm);
			var pt = {
				x: vm.x,
				y: vm.y
			};

			// IE11/Edge does not like very small opacities, so snap to 0
			var opacity = Math.abs(vm.opacity < 1e-3) ? 0 : vm.opacity;

			if (this._options.enabled) {
				// Draw Background
				var bgColor = helpers.color(vm.backgroundColor);
				ctx.fillStyle = bgColor.alpha(opacity * bgColor.alpha()).rgbString();
				helpers.drawRoundedRectangle(ctx, pt.x, pt.y, tooltipSize.width, tooltipSize.height, vm.cornerRadius);
				ctx.fill();

				// Draw Caret
				this.drawCaret(pt, tooltipSize, opacity, vm.caretPadding);

				// Draw Title, Body, and Footer
				pt.x += vm.xPadding;
				pt.y += vm.yPadding;

				// Titles
				this.drawTitle(pt, vm, ctx, opacity);

				// Body
				this.drawBody(pt, vm, ctx, opacity);

				// Footer
				this.drawFooter(pt, vm, ctx, opacity);
			}
		}
	});
};

},{}],30:[function(require,module,exports){
"use strict";

module.exports = function(Chart, moment) {

  var helpers = Chart.helpers,
    globalOpts = Chart.defaults.global;

  globalOpts.elements.arc = {
    backgroundColor: globalOpts.defaultColor,
    borderColor: "#fff",
    borderWidth: 2
  };

  Chart.elements.Arc = Chart.Element.extend({
    inLabelRange: function(mouseX) {
      var vm = this._view;

      if (vm) {
        return (Math.pow(mouseX - vm.x, 2) < Math.pow(vm.radius + vm.hoverRadius, 2));
      } else {
        return false;
      }
    },
    inRange: function(chartX, chartY) {
      var vm = this._view;

      if (vm) {
        var pointRelativePosition = helpers.getAngleFromPoint(vm, {
            x: chartX,
            y: chartY
          }),
          angle = pointRelativePosition.angle,
          distance = pointRelativePosition.distance;

        //Sanitise angle range
        var startAngle = vm.startAngle;
        var endAngle = vm.endAngle;
        while (endAngle < startAngle) {
          endAngle += 2.0 * Math.PI;
        }
        while (angle > endAngle) {
          angle -= 2.0 * Math.PI;
        }
        while (angle < startAngle) {
          angle += 2.0 * Math.PI;
        }

        //Check if within the range of the open/close angle
        var betweenAngles = (angle >= startAngle && angle <= endAngle),
          withinRadius = (distance >= vm.innerRadius && distance <= vm.outerRadius);

        return (betweenAngles && withinRadius);
      } else {
        return false;
      }
    },
    tooltipPosition: function() {
      var vm = this._view;

      var centreAngle = vm.startAngle + ((vm.endAngle - vm.startAngle) / 2),
        rangeFromCentre = (vm.outerRadius - vm.innerRadius) / 2 + vm.innerRadius;
      return {
        x: vm.x + (Math.cos(centreAngle) * rangeFromCentre),
        y: vm.y + (Math.sin(centreAngle) * rangeFromCentre)
      };
    },
    draw: function() {

      var ctx = this._chart.ctx,
        vm = this._view,
        sA = vm.startAngle,
        eA = vm.endAngle;

      ctx.beginPath();

      ctx.arc(vm.x, vm.y, vm.outerRadius, sA, eA);
      ctx.arc(vm.x, vm.y, vm.innerRadius, eA, sA, true);

      ctx.closePath();
      ctx.strokeStyle = vm.borderColor;
      ctx.lineWidth = vm.borderWidth;

      ctx.fillStyle = vm.backgroundColor;

      ctx.fill();
      ctx.lineJoin = 'bevel';

      if (vm.borderWidth) {
        ctx.stroke();
      }
    }
  });
};

},{}],31:[function(require,module,exports){
"use strict";

module.exports = function(Chart) {

	var helpers = Chart.helpers;
	var globalDefaults = Chart.defaults.global;

	Chart.defaults.global.elements.line = {
		tension: 0.4,
		backgroundColor: globalDefaults.defaultColor,
		borderWidth: 3,
		borderColor: globalDefaults.defaultColor,
		borderCapStyle: 'butt',
		borderDash: [],
		borderDashOffset: 0.0,
		borderJoinStyle: 'miter',
		fill: true // do we fill in the area between the line and its base axis
	};

	Chart.elements.Line = Chart.Element.extend({
		lineToNextPoint: function(previousPoint, point, nextPoint, skipHandler, previousSkipHandler) {
			var me = this;
			var ctx = me._chart.ctx;
			var spanGaps = me._view ? me._view.spanGaps : false;

			if (point._view.skip && !spanGaps) {
				skipHandler.call(me, previousPoint, point, nextPoint);
			} else if (previousPoint._view.skip && !spanGaps) {
				previousSkipHandler.call(me, previousPoint, point, nextPoint);
			} else if (point._view.tension === 0) {
				ctx.lineTo(point._view.x, point._view.y);
			} else {
				// Line between points
				ctx.bezierCurveTo(
					previousPoint._view.controlPointNextX,
					previousPoint._view.controlPointNextY,
					point._view.controlPointPreviousX,
					point._view.controlPointPreviousY,
					point._view.x,
					point._view.y
				);
			}
		},

		draw: function() {
			var me = this;

			var vm = me._view;
			var ctx = me._chart.ctx;
			var first = me._children[0];
			var last = me._children[me._children.length - 1];

			function loopBackToStart(drawLineToCenter) {
				if (!first._view.skip && !last._view.skip) {
					// Draw a bezier line from last to first
					ctx.bezierCurveTo(
						last._view.controlPointNextX,
						last._view.controlPointNextY,
						first._view.controlPointPreviousX,
						first._view.controlPointPreviousY,
						first._view.x,
						first._view.y
					);
				} else if (drawLineToCenter) {
					// Go to center
					ctx.lineTo(me._view.scaleZero.x, me._view.scaleZero.y);
				}
			}

			ctx.save();

			// If we had points and want to fill this line, do so.
			if (me._children.length > 0 && vm.fill) {
				// Draw the background first (so the border is always on top)
				ctx.beginPath();

				helpers.each(me._children, function(point, index) {
					var previous = helpers.previousItem(me._children, index);
					var next = helpers.nextItem(me._children, index);

					// First point moves to it's starting position no matter what
					if (index === 0) {
						if (me._loop) {
							ctx.moveTo(vm.scaleZero.x, vm.scaleZero.y);
						} else {
							ctx.moveTo(point._view.x, vm.scaleZero);
						}

						if (point._view.skip) {
							if (!me._loop) {
								ctx.moveTo(next._view.x, me._view.scaleZero);
							}
						} else {
							ctx.lineTo(point._view.x, point._view.y);
						}
					} else {
						me.lineToNextPoint(previous, point, next, function(previousPoint, point, nextPoint) {
							if (me._loop) {
								// Go to center
								ctx.lineTo(me._view.scaleZero.x, me._view.scaleZero.y);
							} else {
								ctx.lineTo(previousPoint._view.x, me._view.scaleZero);
								ctx.moveTo(nextPoint._view.x, me._view.scaleZero);
							}
						}, function(previousPoint, point) {
							// If we skipped the last point, draw a line to ourselves so that the fill is nice
							ctx.lineTo(point._view.x, point._view.y);
						});
					}
				}, me);

				// For radial scales, loop back around to the first point
				if (me._loop) {
					loopBackToStart(true);
				} else {
					//Round off the line by going to the base of the chart, back to the start, then fill.
					ctx.lineTo(me._children[me._children.length - 1]._view.x, vm.scaleZero);
					ctx.lineTo(me._children[0]._view.x, vm.scaleZero);
				}

				ctx.fillStyle = vm.backgroundColor || globalDefaults.defaultColor;
				ctx.closePath();
				ctx.fill();
			}

			var globalOptionLineElements = globalDefaults.elements.line;
			// Now draw the line between all the points with any borders
			ctx.lineCap = vm.borderCapStyle || globalOptionLineElements.borderCapStyle;

			// IE 9 and 10 do not support line dash
			if (ctx.setLineDash) {
				ctx.setLineDash(vm.borderDash || globalOptionLineElements.borderDash);
			}

			ctx.lineDashOffset = vm.borderDashOffset || globalOptionLineElements.borderDashOffset;
			ctx.lineJoin = vm.borderJoinStyle || globalOptionLineElements.borderJoinStyle;
			ctx.lineWidth = vm.borderWidth || globalOptionLineElements.borderWidth;
			ctx.strokeStyle = vm.borderColor || globalDefaults.defaultColor;
			ctx.beginPath();

			helpers.each(me._children, function(point, index) {
				var previous = helpers.previousItem(me._children, index);
				var next = helpers.nextItem(me._children, index);

				if (index === 0) {
					ctx.moveTo(point._view.x, point._view.y);
				} else {
					me.lineToNextPoint(previous, point, next, function(previousPoint, point, nextPoint) {
						ctx.moveTo(nextPoint._view.x, nextPoint._view.y);
					}, function(previousPoint, point) {
						// If we skipped the last point, move up to our point preventing a line from being drawn
						ctx.moveTo(point._view.x, point._view.y);
					});
				}
			}, me);

			if (me._loop && me._children.length > 0) {
				loopBackToStart();
			}

			ctx.stroke();
			ctx.restore();
		}
	});
};
},{}],32:[function(require,module,exports){
"use strict";

module.exports = function(Chart) {

	var helpers = Chart.helpers,
		globalOpts = Chart.defaults.global,
		defaultColor = globalOpts.defaultColor;

	globalOpts.elements.point = {
		radius: 3,
		pointStyle: 'circle',
		backgroundColor: defaultColor,
		borderWidth: 1,
		borderColor: defaultColor,
		// Hover
		hitRadius: 1,
		hoverRadius: 4,
		hoverBorderWidth: 1
	};

	Chart.elements.Point = Chart.Element.extend({
		inRange: function(mouseX, mouseY) {
			var vm = this._view;
			return vm ? ((Math.pow(mouseX - vm.x, 2) + Math.pow(mouseY - vm.y, 2)) < Math.pow(vm.hitRadius + vm.radius, 2)) : false;
		},
		inLabelRange: function(mouseX) {
			var vm = this._view;
			return vm ? (Math.pow(mouseX - vm.x, 2) < Math.pow(vm.radius + vm.hitRadius, 2)) : false;
		},
		tooltipPosition: function() {
			var vm = this._view;
			return {
				x: vm.x,
				y: vm.y,
				padding: vm.radius + vm.borderWidth
			};
		},
		draw: function() {
			var vm = this._view;
			var ctx = this._chart.ctx;
			var pointStyle = vm.pointStyle;
			var radius = vm.radius;
			var x = vm.x;
			var y = vm.y;
			var type, edgeLength, xOffset, yOffset, height, size;

			if (vm.skip) {
				return;
			}

			if (typeof pointStyle === 'object') {
				type = pointStyle.toString();
				if (type === '[object HTMLImageElement]' || type === '[object HTMLCanvasElement]') {
					ctx.drawImage(pointStyle, x - pointStyle.width / 2, y - pointStyle.height / 2);
					return;
				}
			}

			if (isNaN(radius) || radius <= 0) {
				return;
			}

			ctx.strokeStyle = vm.borderColor || defaultColor;
			ctx.lineWidth = helpers.getValueOrDefault(vm.borderWidth, globalOpts.elements.point.borderWidth);
			ctx.fillStyle = vm.backgroundColor || defaultColor;

			switch (pointStyle) {
			// Default includes circle
			default:
				ctx.beginPath();
				ctx.arc(x, y, radius, 0, Math.PI * 2);
				ctx.closePath();
				ctx.fill();
				break;
			case 'triangle':
				ctx.beginPath();
				edgeLength = 3 * radius / Math.sqrt(3);
				height = edgeLength * Math.sqrt(3) / 2;
				ctx.moveTo(x - edgeLength / 2, y + height / 3);
				ctx.lineTo(x + edgeLength / 2, y + height / 3);
				ctx.lineTo(x, y - 2 * height / 3);
				ctx.closePath();
				ctx.fill();
				break;
			case 'rect':
				size = 1 / Math.SQRT2 * radius;
				ctx.fillRect(x - size, y - size, 2 * size,  2 * size);
				ctx.strokeRect(x - size, y - size, 2 * size, 2 * size);
				break;
			case 'rectRot':
				size = 1 / Math.SQRT2 * radius;
				ctx.beginPath();
				ctx.moveTo(x - size, y);
				ctx.lineTo(x, y + size);
				ctx.lineTo(x + size, y);
				ctx.lineTo(x, y - size);
				ctx.closePath();
				ctx.fill();
				break;
			case 'cross':
				ctx.beginPath();
				ctx.moveTo(x, y + radius);
				ctx.lineTo(x, y - radius);
				ctx.moveTo(x - radius, y);
				ctx.lineTo(x + radius, y);
				ctx.closePath();
				break;
			case 'crossRot':
				ctx.beginPath();
				xOffset = Math.cos(Math.PI / 4) * radius;
				yOffset = Math.sin(Math.PI / 4) * radius;
				ctx.moveTo(x - xOffset, y - yOffset);
				ctx.lineTo(x + xOffset, y + yOffset);
				ctx.moveTo(x - xOffset, y + yOffset);
				ctx.lineTo(x + xOffset, y - yOffset);
				ctx.closePath();
				break;
			case 'star':
				ctx.beginPath();
				ctx.moveTo(x, y + radius);
				ctx.lineTo(x, y - radius);
				ctx.moveTo(x - radius, y);
				ctx.lineTo(x + radius, y);
				xOffset = Math.cos(Math.PI / 4) * radius;
				yOffset = Math.sin(Math.PI / 4) * radius;
				ctx.moveTo(x - xOffset, y - yOffset);
				ctx.lineTo(x + xOffset, y + yOffset);
				ctx.moveTo(x - xOffset, y + yOffset);
				ctx.lineTo(x + xOffset, y - yOffset);
				ctx.closePath();
				break;
			case 'line':
				ctx.beginPath();
				ctx.moveTo(x - radius, y);
				ctx.lineTo(x + radius, y);
				ctx.closePath();
				break;
			case 'dash':
				ctx.beginPath();
				ctx.moveTo(x, y);
				ctx.lineTo(x + radius, y);
				ctx.closePath();
				break;
			}

			ctx.stroke();
		}
	});
};

},{}],33:[function(require,module,exports){
"use strict";

module.exports = function(Chart) {

	var helpers = Chart.helpers,
		globalOpts = Chart.defaults.global;

	globalOpts.elements.rectangle = {
		backgroundColor: globalOpts.defaultColor,
		borderWidth: 0,
		borderColor: globalOpts.defaultColor,
		borderSkipped: 'bottom'
	};

	Chart.elements.Rectangle = Chart.Element.extend({
		draw: function() {
			var ctx = this._chart.ctx;
			var vm = this._view;

			var halfWidth = vm.width / 2,
				leftX = vm.x - halfWidth,
				rightX = vm.x + halfWidth,
				top = vm.base - (vm.base - vm.y),
				halfStroke = vm.borderWidth / 2;

			// Canvas doesn't allow us to stroke inside the width so we can
			// adjust the sizes to fit if we're setting a stroke on the line
			if (vm.borderWidth) {
				leftX += halfStroke;
				rightX -= halfStroke;
				top += halfStroke;
			}

			ctx.beginPath();
			ctx.fillStyle = vm.backgroundColor;
			ctx.strokeStyle = vm.borderColor;
			ctx.lineWidth = vm.borderWidth;

			// Corner points, from bottom-left to bottom-right clockwise
			// | 1 2 |
			// | 0 3 |
			var corners = [
				[leftX, vm.base],
				[leftX, top],
				[rightX, top],
				[rightX, vm.base]
			];

			// Find first (starting) corner with fallback to 'bottom' 
			var borders = ['bottom', 'left', 'top', 'right'];
			var startCorner = borders.indexOf(vm.borderSkipped, 0);
			if (startCorner === -1)
				startCorner = 0;

			function cornerAt(index) {
				return corners[(startCorner + index) % 4];
			}

			// Draw rectangle from 'startCorner'
			ctx.moveTo.apply(ctx, cornerAt(0));
			for (var i = 1; i < 4; i++)
				ctx.lineTo.apply(ctx, cornerAt(i));

			ctx.fill();
			if (vm.borderWidth) {
				ctx.stroke();
			}
		},
		height: function() {
			var vm = this._view;
			return vm.base - vm.y;
		},
		inRange: function(mouseX, mouseY) {
			var vm = this._view;
			return vm ? 
					(vm.y < vm.base ? 
						(mouseX >= vm.x - vm.width / 2 && mouseX <= vm.x + vm.width / 2) && (mouseY >= vm.y && mouseY <= vm.base) :
						(mouseX >= vm.x - vm.width / 2 && mouseX <= vm.x + vm.width / 2) && (mouseY >= vm.base && mouseY <= vm.y)) :
					false;
		},
		inLabelRange: function(mouseX) {
			var vm = this._view;
			return vm ? (mouseX >= vm.x - vm.width / 2 && mouseX <= vm.x + vm.width / 2) : false;
		},
		tooltipPosition: function() {
			var vm = this._view;
			return {
				x: vm.x,
				y: vm.y
			};
		}
	});

};
},{}],34:[function(require,module,exports){
"use strict";

module.exports = function(Chart) {

	var helpers = Chart.helpers;
	// Default config for a category scale
	var defaultConfig = {
		position: "bottom"
	};

	var DatasetScale = Chart.Scale.extend({
		// Implement this so that 
		determineDataLimits: function() {
			var me = this;
			me.minIndex = 0;
			me.maxIndex = me.chart.data.labels.length - 1;
			var findIndex;

			if (me.options.ticks.min !== undefined) {
				// user specified min value
				findIndex = helpers.indexOf(me.chart.data.labels, me.options.ticks.min);
				me.minIndex = findIndex !== -1 ? findIndex : me.minIndex;
			}

			if (me.options.ticks.max !== undefined) {
				// user specified max value
				findIndex = helpers.indexOf(me.chart.data.labels, me.options.ticks.max);
				me.maxIndex = findIndex !== -1 ? findIndex : me.maxIndex;
			}

			me.min = me.chart.data.labels[me.minIndex];
			me.max = me.chart.data.labels[me.maxIndex];
		},

		buildTicks: function(index) {
			var me = this;
			// If we are viewing some subset of labels, slice the original array
			me.ticks = (me.minIndex === 0 && me.maxIndex === me.chart.data.labels.length - 1) ? me.chart.data.labels : me.chart.data.labels.slice(me.minIndex, me.maxIndex + 1);
		},

		getLabelForIndex: function(index, datasetIndex) {
			return this.ticks[index];
		},

		// Used to get data value locations.  Value can either be an index or a numerical value
		getPixelForValue: function(value, index, datasetIndex, includeOffset) {
			var me = this;
			// 1 is added because we need the length but we have the indexes
			var offsetAmt = Math.max((me.maxIndex + 1 - me.minIndex - ((me.options.gridLines.offsetGridLines) ? 0 : 1)), 1);

			if (me.isHorizontal()) {
				var innerWidth = me.width - (me.paddingLeft + me.paddingRight);
				var valueWidth = innerWidth / offsetAmt;
				var widthOffset = (valueWidth * (index - me.minIndex)) + me.paddingLeft;

				if (me.options.gridLines.offsetGridLines && includeOffset) {
					widthOffset += (valueWidth / 2);
				}

				return me.left + Math.round(widthOffset);
			} else {
				var innerHeight = me.height - (me.paddingTop + me.paddingBottom);
				var valueHeight = innerHeight / offsetAmt;
				var heightOffset = (valueHeight * (index - me.minIndex)) + me.paddingTop;

				if (me.options.gridLines.offsetGridLines && includeOffset) {
					heightOffset += (valueHeight / 2);
				}

				return me.top + Math.round(heightOffset);
			}
		},
		getPixelForTick: function(index, includeOffset) {
			return this.getPixelForValue(this.ticks[index], index + this.minIndex, null, includeOffset);
		},
		getValueForPixel: function(pixel) {
			var me = this;
			var value;
			var offsetAmt = Math.max((me.ticks.length - ((me.options.gridLines.offsetGridLines) ? 0 : 1)), 1);
			var horz = me.isHorizontal();
			var innerDimension = horz ? me.width - (me.paddingLeft + me.paddingRight) : me.height - (me.paddingTop + me.paddingBottom);
			var valueDimension = innerDimension / offsetAmt;

			if (me.options.gridLines.offsetGridLines) {
				pixel -= (valueDimension / 2);
			}
			pixel -= horz ? me.paddingLeft : me.paddingTop;

			if (pixel <= 0) {
				value = 0;
			} else {
				value = Math.round(pixel / valueDimension);
			}

			return value;
		}
	});

	Chart.scaleService.registerScaleType("category", DatasetScale, defaultConfig);

};
},{}],35:[function(require,module,exports){
"use strict";

module.exports = function(Chart) {

	var helpers = Chart.helpers;

	var defaultConfig = {
		position: "left",
		ticks: {
			callback: function(tickValue, index, ticks) {
				// If we have lots of ticks, don't use the ones
				var delta = ticks.length > 3 ? ticks[2] - ticks[1] : ticks[1] - ticks[0];

				// If we have a number like 2.5 as the delta, figure out how many decimal places we need
				if (Math.abs(delta) > 1) {
					if (tickValue !== Math.floor(tickValue)) {
						// not an integer
						delta = tickValue - Math.floor(tickValue);
					}
				}

				var logDelta = helpers.log10(Math.abs(delta));
				var tickString = '';

				if (tickValue !== 0) {
					var numDecimal = -1 * Math.floor(logDelta);
					numDecimal = Math.max(Math.min(numDecimal, 20), 0); // toFixed has a max of 20 decimal places
					tickString = tickValue.toFixed(numDecimal);
				} else {
					tickString = '0'; // never show decimal places for 0
				}

				return tickString;
			}
		}
	};

	var LinearScale = Chart.LinearScaleBase.extend({
		determineDataLimits: function() {
			var me = this;
			var opts = me.options;
			var tickOpts = opts.ticks;
			var chart = me.chart;
			var data = chart.data;
			var datasets = data.datasets;
			var isHorizontal = me.isHorizontal();

			function IDMatches(meta) {
				return isHorizontal ? meta.xAxisID === me.id : meta.yAxisID === me.id;
			}

			// First Calculate the range
			me.min = null;
			me.max = null;

			if (opts.stacked) {
				var valuesPerType = {};
				var hasPositiveValues = false;
				var hasNegativeValues = false;

				helpers.each(datasets, function(dataset, datasetIndex) {
					var meta = chart.getDatasetMeta(datasetIndex);
					if (valuesPerType[meta.type] === undefined) {
						valuesPerType[meta.type] = {
							positiveValues: [],
							negativeValues: []
						};
					}

					// Store these per type
					var positiveValues = valuesPerType[meta.type].positiveValues;
					var negativeValues = valuesPerType[meta.type].negativeValues;

					if (chart.isDatasetVisible(datasetIndex) && IDMatches(meta)) {
						helpers.each(dataset.data, function(rawValue, index) {
							var value = +me.getRightValue(rawValue);
							if (isNaN(value) || meta.data[index].hidden) {
								return;
							}

							positiveValues[index] = positiveValues[index] || 0;
							negativeValues[index] = negativeValues[index] || 0;

							if (opts.relativePoints) {
								positiveValues[index] = 100;
							} else {
								if (value < 0) {
									hasNegativeValues = true;
									negativeValues[index] += value;
								} else {
									hasPositiveValues = true;
									positiveValues[index] += value;
								}
							}
						});
					}
				});

				helpers.each(valuesPerType, function(valuesForType) {
					var values = valuesForType.positiveValues.concat(valuesForType.negativeValues);
					var minVal = helpers.min(values);
					var maxVal = helpers.max(values);
					me.min = me.min === null ? minVal : Math.min(me.min, minVal);
					me.max = me.max === null ? maxVal : Math.max(me.max, maxVal);
				});

			} else {
				helpers.each(datasets, function(dataset, datasetIndex) {
					var meta = chart.getDatasetMeta(datasetIndex);
					if (chart.isDatasetVisible(datasetIndex) && IDMatches(meta)) {
						helpers.each(dataset.data, function(rawValue, index) {
							var value = +me.getRightValue(rawValue);
							if (isNaN(value) || meta.data[index].hidden) {
								return;
							}

							if (me.min === null) {
								me.min = value;
							} else if (value < me.min) {
								me.min = value;
							}

							if (me.max === null) {
								me.max = value;
							} else if (value > me.max) {
								me.max = value;
							}
						});
					}
				});
			}

			// Common base implementation to handle ticks.min, ticks.max, ticks.beginAtZero
			this.handleTickRangeOptions();
		},
		getTickLimit: function() {
			var maxTicks;
			var me = this;
			var tickOpts = me.options.ticks;

			if (me.isHorizontal()) {
				maxTicks = Math.min(tickOpts.maxTicksLimit ? tickOpts.maxTicksLimit : 11, Math.ceil(me.width / 50));
			} else {
				// The factor of 2 used to scale the font size has been experimentally determined.
				var tickFontSize = helpers.getValueOrDefault(tickOpts.fontSize, Chart.defaults.global.defaultFontSize);
				maxTicks = Math.min(tickOpts.maxTicksLimit ? tickOpts.maxTicksLimit : 11, Math.ceil(me.height / (2 * tickFontSize)));
			}

			return maxTicks;
		},
		// Called after the ticks are built. We need 
		handleDirectionalChanges: function() {
			if (!this.isHorizontal()) {
				// We are in a vertical orientation. The top value is the highest. So reverse the array
				this.ticks.reverse();
			}
		},
		getLabelForIndex: function(index, datasetIndex) {
			return +this.getRightValue(this.chart.data.datasets[datasetIndex].data[index]);
		},
		// Utils
		getPixelForValue: function(value, index, datasetIndex, includeOffset) {
			// This must be called after fit has been run so that
			//      this.left, this.top, this.right, and this.bottom have been defined
			var me = this;
			var paddingLeft = me.paddingLeft;
			var paddingBottom = me.paddingBottom;
			var start = me.start;

			var rightValue = +me.getRightValue(value);
			var pixel;
			var innerDimension;
			var range = me.end - start;

			if (me.isHorizontal()) {
				innerDimension = me.width - (paddingLeft + me.paddingRight);
				pixel = me.left + (innerDimension / range * (rightValue - start));
				return Math.round(pixel + paddingLeft);
			} else {
				innerDimension = me.height - (me.paddingTop + paddingBottom);
				pixel = (me.bottom - paddingBottom) - (innerDimension / range * (rightValue - start));
				return Math.round(pixel);
			}
		},
		getValueForPixel: function(pixel) {
			var me = this;
			var isHorizontal = me.isHorizontal();
			var paddingLeft = me.paddingLeft;
			var paddingBottom = me.paddingBottom;
			var innerDimension = isHorizontal ? me.width - (paddingLeft + me.paddingRight) : me.height - (me.paddingTop + paddingBottom);
			var offset = (isHorizontal ? pixel - me.left - paddingLeft : me.bottom - paddingBottom - pixel) / innerDimension;
			return me.start + ((me.end - me.start) * offset);
		},
		getPixelForTick: function(index, includeOffset) {
			return this.getPixelForValue(this.ticksAsNumbers[index], null, null, includeOffset);
		}
	});
	Chart.scaleService.registerScaleType("linear", LinearScale, defaultConfig);

};
},{}],36:[function(require,module,exports){
"use strict";

module.exports = function(Chart) {

	var helpers = Chart.helpers,
		noop = helpers.noop;

	Chart.LinearScaleBase = Chart.Scale.extend({
		handleTickRangeOptions: function() {
			var me = this;
			var opts = me.options;
			var tickOpts = opts.ticks;

			// If we are forcing it to begin at 0, but 0 will already be rendered on the chart,
			// do nothing since that would make the chart weird. If the user really wants a weird chart
			// axis, they can manually override it
			if (tickOpts.beginAtZero) {
				var minSign = helpers.sign(me.min);
				var maxSign = helpers.sign(me.max);

				if (minSign < 0 && maxSign < 0) {
					// move the top up to 0
					me.max = 0;
				} else if (minSign > 0 && maxSign > 0) {
					// move the botttom down to 0
					me.min = 0;
				}
			}

			if (tickOpts.min !== undefined) {
				me.min = tickOpts.min;
			} else if (tickOpts.suggestedMin !== undefined) {
				me.min = Math.min(me.min, tickOpts.suggestedMin);
			}

			if (tickOpts.max !== undefined) {
				me.max = tickOpts.max;
			} else if (tickOpts.suggestedMax !== undefined) {
				me.max = Math.max(me.max, tickOpts.suggestedMax);
			}

			if (me.min === me.max) {
				me.max++;

				if (!tickOpts.beginAtZero) {
					me.min--;
				}
			}
		},
		getTickLimit: noop,
		handleDirectionalChanges: noop,

		buildTicks: function() {
			var me = this;
			var opts = me.options;
			var tickOpts = opts.ticks;
			var getValueOrDefault = helpers.getValueOrDefault;
			var isHorizontal = me.isHorizontal();

			var ticks = me.ticks = [];

			// Figure out what the max number of ticks we can support it is based on the size of
			// the axis area. For now, we say that the minimum tick spacing in pixels must be 50
			// We also limit the maximum number of ticks to 11 which gives a nice 10 squares on
			// the graph

			var maxTicks = me.getTickLimit();

			// Make sure we always have at least 2 ticks
			maxTicks = Math.max(2, maxTicks);

			// To get a "nice" value for the tick spacing, we will use the appropriately named
			// "nice number" algorithm. See http://stackoverflow.com/questions/8506881/nice-label-algorithm-for-charts-with-minimum-ticks
			// for details.

			var spacing;
			var fixedStepSizeSet = (tickOpts.fixedStepSize && tickOpts.fixedStepSize > 0) || (tickOpts.stepSize && tickOpts.stepSize > 0);
			if (fixedStepSizeSet) {
				spacing = getValueOrDefault(tickOpts.fixedStepSize, tickOpts.stepSize);
			} else {
				var niceRange = helpers.niceNum(me.max - me.min, false);
				spacing = helpers.niceNum(niceRange / (maxTicks - 1), true);
			}
			var niceMin = Math.floor(me.min / spacing) * spacing;
			var niceMax = Math.ceil(me.max / spacing) * spacing;
			var numSpaces = (niceMax - niceMin) / spacing;

			// If very close to our rounded value, use it.
			if (helpers.almostEquals(numSpaces, Math.round(numSpaces), spacing / 1000)) {
				numSpaces = Math.round(numSpaces);
			} else {
				numSpaces = Math.ceil(numSpaces);
			}

			// Put the values into the ticks array
			ticks.push(tickOpts.min !== undefined ? tickOpts.min : niceMin);
			for (var j = 1; j < numSpaces; ++j) {
				ticks.push(niceMin + (j * spacing));
			}
			ticks.push(tickOpts.max !== undefined ? tickOpts.max : niceMax);

			me.handleDirectionalChanges();

			// At this point, we need to update our max and min given the tick values since we have expanded the
			// range of the scale
			me.max = helpers.max(ticks);
			me.min = helpers.min(ticks);

			if (tickOpts.reverse) {
				ticks.reverse();

				me.start = me.max;
				me.end = me.min;
			} else {
				me.start = me.min;
				me.end = me.max;
			}
		},
		convertTicksToLabels: function() {
			var me = this;
			me.ticksAsNumbers = me.ticks.slice();
			me.zeroLineIndex = me.ticks.indexOf(0);

			Chart.Scale.prototype.convertTicksToLabels.call(me);
		},
	});
};
},{}],37:[function(require,module,exports){
"use strict";

module.exports = function(Chart) {

	var helpers = Chart.helpers;

	var defaultConfig = {
		position: "left",

		// label settings
		ticks: {
			callback: function(value, index, arr) {
				var remain = value / (Math.pow(10, Math.floor(helpers.log10(value))));

				if (remain === 1 || remain === 2 || remain === 5 || index === 0 || index === arr.length - 1) {
					return value.toExponential();
				} else {
					return '';
				}
			}
		}
	};

	var LogarithmicScale = Chart.Scale.extend({
		determineDataLimits: function() {
			var me = this;
			var opts = me.options;
			var tickOpts = opts.ticks;
			var chart = me.chart;
			var data = chart.data;
			var datasets = data.datasets;
			var getValueOrDefault = helpers.getValueOrDefault;
			var isHorizontal = me.isHorizontal();
			function IDMatches(meta) {
				return isHorizontal ? meta.xAxisID === me.id : meta.yAxisID === me.id;
			}

			// Calculate Range
			me.min = null;
			me.max = null;

			if (opts.stacked) {
				var valuesPerType = {};

				helpers.each(datasets, function(dataset, datasetIndex) {
					var meta = chart.getDatasetMeta(datasetIndex);
					if (chart.isDatasetVisible(datasetIndex) && IDMatches(meta)) {
						if (valuesPerType[meta.type] === undefined) {
							valuesPerType[meta.type] = [];
						}

						helpers.each(dataset.data, function(rawValue, index) {
							var values = valuesPerType[meta.type];
							var value = +me.getRightValue(rawValue);
							if (isNaN(value) || meta.data[index].hidden) {
								return;
							}

							values[index] = values[index] || 0;

							if (opts.relativePoints) {
								values[index] = 100;
							} else {
								// Don't need to split positive and negative since the log scale can't handle a 0 crossing
								values[index] += value;
							}
						});
					}
				});

				helpers.each(valuesPerType, function(valuesForType) {
					var minVal = helpers.min(valuesForType);
					var maxVal = helpers.max(valuesForType);
					me.min = me.min === null ? minVal : Math.min(me.min, minVal);
					me.max = me.max === null ? maxVal : Math.max(me.max, maxVal);
				});

			} else {
				helpers.each(datasets, function(dataset, datasetIndex) {
					var meta = chart.getDatasetMeta(datasetIndex);
					if (chart.isDatasetVisible(datasetIndex) && IDMatches(meta)) {
						helpers.each(dataset.data, function(rawValue, index) {
							var value = +me.getRightValue(rawValue);
							if (isNaN(value) || meta.data[index].hidden) {
								return;
							}

							if (me.min === null) {
								me.min = value;
							} else if (value < me.min) {
								me.min = value;
							}

							if (me.max === null) {
								me.max = value;
							} else if (value > me.max) {
								me.max = value;
							}
						});
					}
				});
			}

			me.min = getValueOrDefault(tickOpts.min, me.min);
			me.max = getValueOrDefault(tickOpts.max, me.max);

			if (me.min === me.max) {
				if (me.min !== 0 && me.min !== null) {
					me.min = Math.pow(10, Math.floor(helpers.log10(me.min)) - 1);
					me.max = Math.pow(10, Math.floor(helpers.log10(me.max)) + 1);
				} else {
					me.min = 1;
					me.max = 10;
				}
			}
		},
		buildTicks: function() {
			var me = this;
			var opts = me.options;
			var tickOpts = opts.ticks;
			var getValueOrDefault = helpers.getValueOrDefault;

			// Reset the ticks array. Later on, we will draw a grid line at these positions
			// The array simply contains the numerical value of the spots where ticks will be
			var ticks = me.ticks = [];

			// Figure out what the max number of ticks we can support it is based on the size of
			// the axis area. For now, we say that the minimum tick spacing in pixels must be 50
			// We also limit the maximum number of ticks to 11 which gives a nice 10 squares on
			// the graph

			var tickVal = getValueOrDefault(tickOpts.min, Math.pow(10, Math.floor(helpers.log10(me.min))));

			while (tickVal < me.max) {
				ticks.push(tickVal);

				var exp = Math.floor(helpers.log10(tickVal));
				var significand = Math.floor(tickVal / Math.pow(10, exp)) + 1;

				if (significand === 10) {
					significand = 1;
					++exp;
				}

				tickVal = significand * Math.pow(10, exp);
			}

			var lastTick = getValueOrDefault(tickOpts.max, tickVal);
			ticks.push(lastTick);

			if (!me.isHorizontal()) {
				// We are in a vertical orientation. The top value is the highest. So reverse the array
				ticks.reverse();
			}

			// At this point, we need to update our max and min given the tick values since we have expanded the
			// range of the scale
			me.max = helpers.max(ticks);
			me.min = helpers.min(ticks);

			if (tickOpts.reverse) {
				ticks.reverse();

				me.start = me.max;
				me.end = me.min;
			} else {
				me.start = me.min;
				me.end = me.max;
			}
		},
		convertTicksToLabels: function() {
			this.tickValues = this.ticks.slice();

			Chart.Scale.prototype.convertTicksToLabels.call(this);
		},
		// Get the correct tooltip label
		getLabelForIndex: function(index, datasetIndex) {
			return +this.getRightValue(this.chart.data.datasets[datasetIndex].data[index]);
		},
		getPixelForTick: function(index, includeOffset) {
			return this.getPixelForValue(this.tickValues[index], null, null, includeOffset);
		},
		getPixelForValue: function(value, index, datasetIndex, includeOffset) {
			var me = this;
			var innerDimension;
			var pixel;

			var start = me.start;
			var newVal = +me.getRightValue(value);
			var range = helpers.log10(me.end) - helpers.log10(start);
			var paddingTop = me.paddingTop;
			var paddingBottom = me.paddingBottom;
			var paddingLeft = me.paddingLeft;

			if (me.isHorizontal()) {

				if (newVal === 0) {
					pixel = me.left + paddingLeft;
				} else {
					innerDimension = me.width - (paddingLeft + me.paddingRight);
					pixel = me.left + (innerDimension / range * (helpers.log10(newVal) - helpers.log10(start)));
					pixel += paddingLeft;
				}
			} else {
				// Bottom - top since pixels increase downard on a screen
				if (newVal === 0) {
					pixel = me.top + paddingTop;
				} else {
					innerDimension = me.height - (paddingTop + paddingBottom);
					pixel = (me.bottom - paddingBottom) - (innerDimension / range * (helpers.log10(newVal) - helpers.log10(start)));
				}
			}

			return pixel;
		},
		getValueForPixel: function(pixel) {
			var me = this;
			var offset;
			var range = helpers.log10(me.end) - helpers.log10(me.start);
			var value;
			var innerDimension;

			if (me.isHorizontal()) {
				innerDimension = me.width - (me.paddingLeft + me.paddingRight);
				value = me.start * Math.pow(10, (pixel - me.left - me.paddingLeft) * range / innerDimension);
			} else {
				innerDimension = me.height - (me.paddingTop + me.paddingBottom);
				value = Math.pow(10, (me.bottom - me.paddingBottom - pixel) * range / innerDimension) / me.start;
			}

			return value;
		}
	});
	Chart.scaleService.registerScaleType("logarithmic", LogarithmicScale, defaultConfig);

};
},{}],38:[function(require,module,exports){
"use strict";

module.exports = function(Chart) {

	var helpers = Chart.helpers;
	var globalDefaults = Chart.defaults.global;

	var defaultConfig = {
		display: true,

		//Boolean - Whether to animate scaling the chart from the centre
		animate: true,
		lineArc: false,
		position: "chartArea",

		angleLines: {
			display: true,
			color: "rgba(0, 0, 0, 0.1)",
			lineWidth: 1
		},

		// label settings
		ticks: {
			//Boolean - Show a backdrop to the scale label
			showLabelBackdrop: true,

			//String - The colour of the label backdrop
			backdropColor: "rgba(255,255,255,0.75)",

			//Number - The backdrop padding above & below the label in pixels
			backdropPaddingY: 2,

			//Number - The backdrop padding to the side of the label in pixels
			backdropPaddingX: 2
		},

		pointLabels: {
			//Number - Point label font size in pixels
			fontSize: 10,

			//Function - Used to convert point labels
			callback: function(label) {
				return label;
			}
		}
	};

	var LinearRadialScale = Chart.LinearScaleBase.extend({
		getValueCount: function() {
			return this.chart.data.labels.length;
		},
		setDimensions: function() {
			var me = this;
			var opts = me.options;
			var tickOpts = opts.ticks;
			// Set the unconstrained dimension before label rotation
			me.width = me.maxWidth;
			me.height = me.maxHeight;
			me.xCenter = Math.round(me.width / 2);
			me.yCenter = Math.round(me.height / 2);

			var minSize = helpers.min([me.height, me.width]);
			var tickFontSize = helpers.getValueOrDefault(tickOpts.fontSize, globalDefaults.defaultFontSize);
			me.drawingArea = opts.display ? (minSize / 2) - (tickFontSize / 2 + tickOpts.backdropPaddingY) : (minSize / 2);
		},
		determineDataLimits: function() {
			var me = this;
			var chart = me.chart;
			me.min = null;
			me.max = null;


			helpers.each(chart.data.datasets, function(dataset, datasetIndex) {
				if (chart.isDatasetVisible(datasetIndex)) {
					var meta = chart.getDatasetMeta(datasetIndex);

					helpers.each(dataset.data, function(rawValue, index) {
						var value = +me.getRightValue(rawValue);
						if (isNaN(value) || meta.data[index].hidden) {
							return;
						}

						if (me.min === null) {
							me.min = value;
						} else if (value < me.min) {
							me.min = value;
						}

						if (me.max === null) {
							me.max = value;
						} else if (value > me.max) {
							me.max = value;
						}
					});
				}
			});

			// Common base implementation to handle ticks.min, ticks.max, ticks.beginAtZero
			me.handleTickRangeOptions();
		},
		getTickLimit: function() {
			var tickOpts = this.options.ticks;
			var tickFontSize = helpers.getValueOrDefault(tickOpts.fontSize, globalDefaults.defaultFontSize);
			return Math.min(tickOpts.maxTicksLimit ? tickOpts.maxTicksLimit : 11, Math.ceil(this.drawingArea / (1.5 * tickFontSize)));
		},
		convertTicksToLabels: function() {
			var me = this;
			Chart.LinearScaleBase.prototype.convertTicksToLabels.call(me);

			// Point labels
			me.pointLabels = me.chart.data.labels.map(me.options.pointLabels.callback, me);
		},
		getLabelForIndex: function(index, datasetIndex) {
			return +this.getRightValue(this.chart.data.datasets[datasetIndex].data[index]);
		},
		fit: function() {
			/*
			 * Right, this is really confusing and there is a lot of maths going on here
			 * The gist of the problem is here: https://gist.github.com/nnnick/696cc9c55f4b0beb8fe9
			 *
			 * Reaction: https://dl.dropboxusercontent.com/u/34601363/toomuchscience.gif
			 *
			 * Solution:
			 *
			 * We assume the radius of the polygon is half the size of the canvas at first
			 * at each index we check if the text overlaps.
			 *
			 * Where it does, we store that angle and that index.
			 *
			 * After finding the largest index and angle we calculate how much we need to remove
			 * from the shape radius to move the point inwards by that x.
			 *
			 * We average the left and right distances to get the maximum shape radius that can fit in the box
			 * along with labels.
			 *
			 * Once we have that, we can find the centre point for the chart, by taking the x text protrusion
			 * on each side, removing that from the size, halving it and adding the left x protrusion width.
			 *
			 * This will mean we have a shape fitted to the canvas, as large as it can be with the labels
			 * and position it in the most space efficient manner
			 *
			 * https://dl.dropboxusercontent.com/u/34601363/yeahscience.gif
			 */

			var pointLabels = this.options.pointLabels;
			var pointLabelFontSize = helpers.getValueOrDefault(pointLabels.fontSize, globalDefaults.defaultFontSize);
			var pointLabeFontStyle = helpers.getValueOrDefault(pointLabels.fontStyle, globalDefaults.defaultFontStyle);
			var pointLabeFontFamily = helpers.getValueOrDefault(pointLabels.fontFamily, globalDefaults.defaultFontFamily);
			var pointLabeFont = helpers.fontString(pointLabelFontSize, pointLabeFontStyle, pointLabeFontFamily);

			// Get maximum radius of the polygon. Either half the height (minus the text width) or half the width.
			// Use this to calculate the offset + change. - Make sure L/R protrusion is at least 0 to stop issues with centre points
			var largestPossibleRadius = helpers.min([(this.height / 2 - pointLabelFontSize - 5), this.width / 2]),
				pointPosition,
				i,
				textWidth,
				halfTextWidth,
				furthestRight = this.width,
				furthestRightIndex,
				furthestRightAngle,
				furthestLeft = 0,
				furthestLeftIndex,
				furthestLeftAngle,
				xProtrusionLeft,
				xProtrusionRight,
				radiusReductionRight,
				radiusReductionLeft,
				maxWidthRadius;
			this.ctx.font = pointLabeFont;

			for (i = 0; i < this.getValueCount(); i++) {
				// 5px to space the text slightly out - similar to what we do in the draw function.
				pointPosition = this.getPointPosition(i, largestPossibleRadius);
				textWidth = this.ctx.measureText(this.pointLabels[i] ? this.pointLabels[i] : '').width + 5;
				if (i === 0 || i === this.getValueCount() / 2) {
					// If we're at index zero, or exactly the middle, we're at exactly the top/bottom
					// of the radar chart, so text will be aligned centrally, so we'll half it and compare
					// w/left and right text sizes
					halfTextWidth = textWidth / 2;
					if (pointPosition.x + halfTextWidth > furthestRight) {
						furthestRight = pointPosition.x + halfTextWidth;
						furthestRightIndex = i;
					}
					if (pointPosition.x - halfTextWidth < furthestLeft) {
						furthestLeft = pointPosition.x - halfTextWidth;
						furthestLeftIndex = i;
					}
				} else if (i < this.getValueCount() / 2) {
					// Less than half the values means we'll left align the text
					if (pointPosition.x + textWidth > furthestRight) {
						furthestRight = pointPosition.x + textWidth;
						furthestRightIndex = i;
					}
				} else if (i > this.getValueCount() / 2) {
					// More than half the values means we'll right align the text
					if (pointPosition.x - textWidth < furthestLeft) {
						furthestLeft = pointPosition.x - textWidth;
						furthestLeftIndex = i;
					}
				}
			}

			xProtrusionLeft = furthestLeft;
			xProtrusionRight = Math.ceil(furthestRight - this.width);

			furthestRightAngle = this.getIndexAngle(furthestRightIndex);
			furthestLeftAngle = this.getIndexAngle(furthestLeftIndex);

			radiusReductionRight = xProtrusionRight / Math.sin(furthestRightAngle + Math.PI / 2);
			radiusReductionLeft = xProtrusionLeft / Math.sin(furthestLeftAngle + Math.PI / 2);

			// Ensure we actually need to reduce the size of the chart
			radiusReductionRight = (helpers.isNumber(radiusReductionRight)) ? radiusReductionRight : 0;
			radiusReductionLeft = (helpers.isNumber(radiusReductionLeft)) ? radiusReductionLeft : 0;

			this.drawingArea = Math.round(largestPossibleRadius - (radiusReductionLeft + radiusReductionRight) / 2);
			this.setCenterPoint(radiusReductionLeft, radiusReductionRight);
		},
		setCenterPoint: function(leftMovement, rightMovement) {
			var me = this;
			var maxRight = me.width - rightMovement - me.drawingArea,
				maxLeft = leftMovement + me.drawingArea;

			me.xCenter = Math.round(((maxLeft + maxRight) / 2) + me.left);
			// Always vertically in the centre as the text height doesn't change
			me.yCenter = Math.round((me.height / 2) + me.top);
		},

		getIndexAngle: function(index) {
			var angleMultiplier = (Math.PI * 2) / this.getValueCount();
			// Start from the top instead of right, so remove a quarter of the circle

			return index * angleMultiplier - (Math.PI / 2);
		},
		getDistanceFromCenterForValue: function(value) {
			var me = this;

			if (value === null) {
				return 0; // null always in center
			}

			// Take into account half font size + the yPadding of the top value
			var scalingFactor = me.drawingArea / (me.max - me.min);
			if (me.options.reverse) {
				return (me.max - value) * scalingFactor;
			} else {
				return (value - me.min) * scalingFactor;
			}
		},
		getPointPosition: function(index, distanceFromCenter) {
			var me = this;
			var thisAngle = me.getIndexAngle(index);
			return {
				x: Math.round(Math.cos(thisAngle) * distanceFromCenter) + me.xCenter,
				y: Math.round(Math.sin(thisAngle) * distanceFromCenter) + me.yCenter
			};
		},
		getPointPositionForValue: function(index, value) {
			return this.getPointPosition(index, this.getDistanceFromCenterForValue(value));
		},

		getBasePosition: function() {
			var me = this;
			var min = me.min;
			var max = me.max;

			return me.getPointPositionForValue(0,
				me.beginAtZero? 0:
				min < 0 && max < 0? max :
				min > 0 && max > 0? min :
				0);
		},

		draw: function() {
			var me = this;
			var opts = me.options;
			var gridLineOpts = opts.gridLines;
			var tickOpts = opts.ticks;
			var angleLineOpts = opts.angleLines;
			var pointLabelOpts = opts.pointLabels;
			var getValueOrDefault = helpers.getValueOrDefault;

			if (opts.display) {
				var ctx = me.ctx;

				// Tick Font
				var tickFontSize = getValueOrDefault(tickOpts.fontSize, globalDefaults.defaultFontSize);
				var tickFontStyle = getValueOrDefault(tickOpts.fontStyle, globalDefaults.defaultFontStyle);
				var tickFontFamily = getValueOrDefault(tickOpts.fontFamily, globalDefaults.defaultFontFamily);
				var tickLabelFont = helpers.fontString(tickFontSize, tickFontStyle, tickFontFamily);

				helpers.each(me.ticks, function(label, index) {
					// Don't draw a centre value (if it is minimum)
					if (index > 0 || opts.reverse) {
						var yCenterOffset = me.getDistanceFromCenterForValue(me.ticksAsNumbers[index]);
						var yHeight = me.yCenter - yCenterOffset;

						// Draw circular lines around the scale
						if (gridLineOpts.display && index !== 0) {
							ctx.strokeStyle = helpers.getValueAtIndexOrDefault(gridLineOpts.color, index - 1);
							ctx.lineWidth = helpers.getValueAtIndexOrDefault(gridLineOpts.lineWidth, index - 1);

							if (opts.lineArc) {
								// Draw circular arcs between the points
								ctx.beginPath();
								ctx.arc(me.xCenter, me.yCenter, yCenterOffset, 0, Math.PI * 2);
								ctx.closePath();
								ctx.stroke();
							} else {
								// Draw straight lines connecting each index
								ctx.beginPath();
								for (var i = 0; i < me.getValueCount(); i++) {
									var pointPosition = me.getPointPosition(i, yCenterOffset);
									if (i === 0) {
										ctx.moveTo(pointPosition.x, pointPosition.y);
									} else {
										ctx.lineTo(pointPosition.x, pointPosition.y);
									}
								}
								ctx.closePath();
								ctx.stroke();
							}
						}

						if (tickOpts.display) {
							var tickFontColor = getValueOrDefault(tickOpts.fontColor, globalDefaults.defaultFontColor);
							ctx.font = tickLabelFont;

							if (tickOpts.showLabelBackdrop) {
								var labelWidth = ctx.measureText(label).width;
								ctx.fillStyle = tickOpts.backdropColor;
								ctx.fillRect(
									me.xCenter - labelWidth / 2 - tickOpts.backdropPaddingX,
									yHeight - tickFontSize / 2 - tickOpts.backdropPaddingY,
									labelWidth + tickOpts.backdropPaddingX * 2,
									tickFontSize + tickOpts.backdropPaddingY * 2
								);
							}

							ctx.textAlign = 'center';
							ctx.textBaseline = "middle";
							ctx.fillStyle = tickFontColor;
							ctx.fillText(label, me.xCenter, yHeight);
						}
					}
				});

				if (!opts.lineArc) {
					ctx.lineWidth = angleLineOpts.lineWidth;
					ctx.strokeStyle = angleLineOpts.color;

					var outerDistance = me.getDistanceFromCenterForValue(opts.reverse ? me.min : me.max);

					// Point Label Font
					var pointLabelFontSize = getValueOrDefault(pointLabelOpts.fontSize, globalDefaults.defaultFontSize);
					var pointLabeFontStyle = getValueOrDefault(pointLabelOpts.fontStyle, globalDefaults.defaultFontStyle);
					var pointLabeFontFamily = getValueOrDefault(pointLabelOpts.fontFamily, globalDefaults.defaultFontFamily);
					var pointLabeFont = helpers.fontString(pointLabelFontSize, pointLabeFontStyle, pointLabeFontFamily);

					for (var i = me.getValueCount() - 1; i >= 0; i--) {
						if (angleLineOpts.display) {
							var outerPosition = me.getPointPosition(i, outerDistance);
							ctx.beginPath();
							ctx.moveTo(me.xCenter, me.yCenter);
							ctx.lineTo(outerPosition.x, outerPosition.y);
							ctx.stroke();
							ctx.closePath();
						}
						// Extra 3px out for some label spacing
						var pointLabelPosition = me.getPointPosition(i, outerDistance + 5);

						// Keep this in loop since we may support array properties here
						var pointLabelFontColor = getValueOrDefault(pointLabelOpts.fontColor, globalDefaults.defaultFontColor);
						ctx.font = pointLabeFont;
						ctx.fillStyle = pointLabelFontColor;

						var pointLabels = me.pointLabels,
							labelsCount = pointLabels.length,
							halfLabelsCount = pointLabels.length / 2,
							quarterLabelsCount = halfLabelsCount / 2,
							upperHalf = (i < quarterLabelsCount || i > labelsCount - quarterLabelsCount),
							exactQuarter = (i === quarterLabelsCount || i === labelsCount - quarterLabelsCount);
						if (i === 0) {
							ctx.textAlign = 'center';
						} else if (i === halfLabelsCount) {
							ctx.textAlign = 'center';
						} else if (i < halfLabelsCount) {
							ctx.textAlign = 'left';
						} else {
							ctx.textAlign = 'right';
						}

						// Set the correct text baseline based on outer positioning
						if (exactQuarter) {
							ctx.textBaseline = 'middle';
						} else if (upperHalf) {
							ctx.textBaseline = 'bottom';
						} else {
							ctx.textBaseline = 'top';
						}

						ctx.fillText(pointLabels[i] ? pointLabels[i] : '', pointLabelPosition.x, pointLabelPosition.y);
					}
				}
			}
		}
	});
	Chart.scaleService.registerScaleType("radialLinear", LinearRadialScale, defaultConfig);

};

},{}],39:[function(require,module,exports){
/*global window: false */
"use strict";

var moment = require('moment');
moment = typeof(moment) === 'function' ? moment : window.moment;

module.exports = function(Chart) {

	var helpers = Chart.helpers;
	var time = {
		units: [{
			name: 'millisecond',
			steps: [1, 2, 5, 10, 20, 50, 100, 250, 500]
		}, {
			name: 'second',
			steps: [1, 2, 5, 10, 30]
		}, {
			name: 'minute',
			steps: [1, 2, 5, 10, 30]
		}, {
			name: 'hour',
			steps: [1, 2, 3, 6, 12]
		}, {
			name: 'day',
			steps: [1, 2, 5]
		}, {
			name: 'week',
			maxStep: 4
		}, {
			name: 'month',
			maxStep: 3
		}, {
			name: 'quarter',
			maxStep: 4
		}, {
			name: 'year',
			maxStep: false
		}]
	};

	var defaultConfig = {
		position: "bottom",

		time: {
			parser: false, // false == a pattern string from http://momentjs.com/docs/#/parsing/string-format/ or a custom callback that converts its argument to a moment
			format: false, // DEPRECATED false == date objects, moment object, callback or a pattern string from http://momentjs.com/docs/#/parsing/string-format/
			unit: false, // false == automatic or override with week, month, year, etc.
			round: false, // none, or override with week, month, year, etc.
			displayFormat: false, // DEPRECATED
			isoWeekday: false, // override week start day - see http://momentjs.com/docs/#/get-set/iso-weekday/

			// defaults to unit's corresponding unitFormat below or override using pattern string from http://momentjs.com/docs/#/displaying/format/
			displayFormats: {
				'millisecond': 'h:mm:ss.SSS a', // 11:20:01.123 AM,
				'second': 'h:mm:ss a', // 11:20:01 AM
				'minute': 'h:mm:ss a', // 11:20:01 AM
				'hour': 'MMM D, hA', // Sept 4, 5PM
				'day': 'll', // Sep 4 2015
				'week': 'll', // Week 46, or maybe "[W]WW - YYYY" ?
				'month': 'MMM YYYY', // Sept 2015
				'quarter': '[Q]Q - YYYY', // Q3
				'year': 'YYYY' // 2015
			}
		},
		ticks: {
			autoSkip: false
		}
	};

	var TimeScale = Chart.Scale.extend({
		initialize: function() {
			if (!moment) {
				throw new Error('Chart.js - Moment.js could not be found! You must include it before Chart.js to use the time scale. Download at https://momentjs.com');
			}

			Chart.Scale.prototype.initialize.call(this);
		},
		getLabelMoment: function(datasetIndex, index) {
			return this.labelMoments[datasetIndex][index];
		},
		getMomentStartOf: function(tick) {
			var me = this;
			if (me.options.time.unit === 'week' && me.options.time.isoWeekday !== false) {
				return tick.clone().startOf('isoWeek').isoWeekday(me.options.time.isoWeekday);
			} else {
				return tick.clone().startOf(me.tickUnit);
			}
		},
		determineDataLimits: function() {
			var me = this;
			me.labelMoments = [];

			// Only parse these once. If the dataset does not have data as x,y pairs, we will use
			// these
			var scaleLabelMoments = [];
			if (me.chart.data.labels && me.chart.data.labels.length > 0) {
				helpers.each(me.chart.data.labels, function(label, index) {
					var labelMoment = me.parseTime(label);

					if (labelMoment.isValid()) {
						if (me.options.time.round) {
							labelMoment.startOf(me.options.time.round);
						}
						scaleLabelMoments.push(labelMoment);
					}
				}, me);

				me.firstTick = moment.min.call(me, scaleLabelMoments);
				me.lastTick = moment.max.call(me, scaleLabelMoments);
			} else {
				me.firstTick = null;
				me.lastTick = null;
			}

			helpers.each(me.chart.data.datasets, function(dataset, datasetIndex) {
				var momentsForDataset = [];
				var datasetVisible = me.chart.isDatasetVisible(datasetIndex);

				if (typeof dataset.data[0] === 'object' && dataset.data[0] !== null) {
					helpers.each(dataset.data, function(value, index) {
						var labelMoment = me.parseTime(me.getRightValue(value));

						if (labelMoment.isValid()) {
							if (me.options.time.round) {
								labelMoment.startOf(me.options.time.round);
							}
							momentsForDataset.push(labelMoment);

							if (datasetVisible) {
								// May have gone outside the scale ranges, make sure we keep the first and last ticks updated
								me.firstTick = me.firstTick !== null ? moment.min(me.firstTick, labelMoment) : labelMoment;
								me.lastTick = me.lastTick !== null ? moment.max(me.lastTick, labelMoment) : labelMoment;
							}
						}
					}, me);
				} else {
					// We have no labels. Use the ones from the scale
					momentsForDataset = scaleLabelMoments;
				}

				me.labelMoments.push(momentsForDataset);
			}, me);

			// Set these after we've done all the data
			if (me.options.time.min) {
				me.firstTick = me.parseTime(me.options.time.min);
			}

			if (me.options.time.max) {
				me.lastTick = me.parseTime(me.options.time.max);
			}

			// We will modify these, so clone for later
			me.firstTick = (me.firstTick || moment()).clone();
			me.lastTick = (me.lastTick || moment()).clone();
		},
		buildTicks: function(index) {
			var me = this;

			me.ctx.save();
			var tickFontSize = helpers.getValueOrDefault(me.options.ticks.fontSize, Chart.defaults.global.defaultFontSize);
			var tickFontStyle = helpers.getValueOrDefault(me.options.ticks.fontStyle, Chart.defaults.global.defaultFontStyle);
			var tickFontFamily = helpers.getValueOrDefault(me.options.ticks.fontFamily, Chart.defaults.global.defaultFontFamily);
			var tickLabelFont = helpers.fontString(tickFontSize, tickFontStyle, tickFontFamily);
			me.ctx.font = tickLabelFont;

			me.ticks = [];
			me.unitScale = 1; // How much we scale the unit by, ie 2 means 2x unit per step
			me.scaleSizeInUnits = 0; // How large the scale is in the base unit (seconds, minutes, etc)

			// Set unit override if applicable
			if (me.options.time.unit) {
				me.tickUnit = me.options.time.unit || 'day';
				me.displayFormat = me.options.time.displayFormats[me.tickUnit];
				me.scaleSizeInUnits = me.lastTick.diff(me.firstTick, me.tickUnit, true);
				me.unitScale = helpers.getValueOrDefault(me.options.time.unitStepSize, 1);
			} else {
				// Determine the smallest needed unit of the time
				var innerWidth = me.isHorizontal() ? me.width - (me.paddingLeft + me.paddingRight) : me.height - (me.paddingTop + me.paddingBottom);

				// Crude approximation of what the label length might be
				var tempFirstLabel = me.tickFormatFunction(me.firstTick, 0, []);
				var tickLabelWidth = me.ctx.measureText(tempFirstLabel).width;
				var cosRotation = Math.cos(helpers.toRadians(me.options.ticks.maxRotation));
				var sinRotation = Math.sin(helpers.toRadians(me.options.ticks.maxRotation));
				tickLabelWidth = (tickLabelWidth * cosRotation) + (tickFontSize * sinRotation);
				var labelCapacity = innerWidth / (tickLabelWidth);

				// Start as small as possible
				me.tickUnit = 'millisecond';
				me.scaleSizeInUnits = me.lastTick.diff(me.firstTick, me.tickUnit, true);
				me.displayFormat = me.options.time.displayFormats[me.tickUnit];

				var unitDefinitionIndex = 0;
				var unitDefinition = time.units[unitDefinitionIndex];

				// While we aren't ideal and we don't have units left
				while (unitDefinitionIndex < time.units.length) {
					// Can we scale this unit. If `false` we can scale infinitely
					me.unitScale = 1;

					if (helpers.isArray(unitDefinition.steps) && Math.ceil(me.scaleSizeInUnits / labelCapacity) < helpers.max(unitDefinition.steps)) {
						// Use one of the prefedined steps
						for (var idx = 0; idx < unitDefinition.steps.length; ++idx) {
							if (unitDefinition.steps[idx] >= Math.ceil(me.scaleSizeInUnits / labelCapacity)) {
								me.unitScale = helpers.getValueOrDefault(me.options.time.unitStepSize, unitDefinition.steps[idx]);
								break;
							}
						}

						break;
					} else if ((unitDefinition.maxStep === false) || (Math.ceil(me.scaleSizeInUnits / labelCapacity) < unitDefinition.maxStep)) {
						// We have a max step. Scale this unit
						me.unitScale = helpers.getValueOrDefault(me.options.time.unitStepSize, Math.ceil(me.scaleSizeInUnits / labelCapacity));
						break;
					} else {
						// Move to the next unit up
						++unitDefinitionIndex;
						unitDefinition = time.units[unitDefinitionIndex];

						me.tickUnit = unitDefinition.name;
						var leadingUnitBuffer = me.firstTick.diff(me.getMomentStartOf(me.firstTick), me.tickUnit, true);
						var trailingUnitBuffer = me.getMomentStartOf(me.lastTick.clone().add(1, me.tickUnit)).diff(me.lastTick, me.tickUnit, true);
						me.scaleSizeInUnits = me.lastTick.diff(me.firstTick, me.tickUnit, true) + leadingUnitBuffer + trailingUnitBuffer;
						me.displayFormat = me.options.time.displayFormats[unitDefinition.name];
					}
				}
			}

			var roundedStart;

			// Only round the first tick if we have no hard minimum
			if (!me.options.time.min) {
				me.firstTick = me.getMomentStartOf(me.firstTick);
				roundedStart = me.firstTick;
			} else {
				roundedStart = me.getMomentStartOf(me.firstTick);
			}

			// Only round the last tick if we have no hard maximum
			if (!me.options.time.max) {
				var roundedEnd = me.getMomentStartOf(me.lastTick);
				if (roundedEnd.diff(me.lastTick, me.tickUnit, true) !== 0) {
					// Do not use end of because we need me to be in the next time unit
					me.lastTick = me.getMomentStartOf(me.lastTick.add(1, me.tickUnit));
				}
			}

			me.smallestLabelSeparation = me.width;

			helpers.each(me.chart.data.datasets, function(dataset, datasetIndex) {
				for (var i = 1; i < me.labelMoments[datasetIndex].length; i++) {
					me.smallestLabelSeparation = Math.min(me.smallestLabelSeparation, me.labelMoments[datasetIndex][i].diff(me.labelMoments[datasetIndex][i - 1], me.tickUnit, true));
				}
			}, me);

			// Tick displayFormat override
			if (me.options.time.displayFormat) {
				me.displayFormat = me.options.time.displayFormat;
			}

			// first tick. will have been rounded correctly if options.time.min is not specified
			me.ticks.push(me.firstTick.clone());

			// For every unit in between the first and last moment, create a moment and add it to the ticks tick
			for (var i = 1; i <= me.scaleSizeInUnits; ++i) {
				var newTick = roundedStart.clone().add(i, me.tickUnit);

				// Are we greater than the max time
				if (me.options.time.max && newTick.diff(me.lastTick, me.tickUnit, true) >= 0) {
					break;
				}

				if (i % me.unitScale === 0) {
					me.ticks.push(newTick);
				}
			}

			// Always show the right tick
			var diff = me.ticks[me.ticks.length - 1].diff(me.lastTick, me.tickUnit);
			if (diff !== 0 || me.scaleSizeInUnits === 0) {
				// this is a weird case. If the <max> option is the same as the end option, we can't just diff the times because the tick was created from the roundedStart
				// but the last tick was not rounded.
				if (me.options.time.max) {
					me.ticks.push(me.lastTick.clone());
					me.scaleSizeInUnits = me.lastTick.diff(me.ticks[0], me.tickUnit, true);
				} else {
					me.ticks.push(me.lastTick.clone());
					me.scaleSizeInUnits = me.lastTick.diff(me.firstTick, me.tickUnit, true);
				}
			}

			me.ctx.restore();
		},
		// Get tooltip label
		getLabelForIndex: function(index, datasetIndex) {
			var me = this;
			var label = me.chart.data.labels && index < me.chart.data.labels.length ? me.chart.data.labels[index] : '';

			if (typeof me.chart.data.datasets[datasetIndex].data[0] === 'object') {
				label = me.getRightValue(me.chart.data.datasets[datasetIndex].data[index]);
			}

			// Format nicely
			if (me.options.time.tooltipFormat) {
				label = me.parseTime(label).format(me.options.time.tooltipFormat);
			}

			return label;
		},
		// Function to format an individual tick mark
		tickFormatFunction: function tickFormatFunction(tick, index, ticks) {
			var formattedTick = tick.format(this.displayFormat);
			var tickOpts = this.options.ticks;
			var callback = helpers.getValueOrDefault(tickOpts.callback, tickOpts.userCallback);

			if (callback) {
				return callback(formattedTick, index, ticks);
			} else {
				return formattedTick;
			}
		},
		convertTicksToLabels: function() {
			var me = this;
			me.tickMoments = me.ticks;
			me.ticks = me.ticks.map(me.tickFormatFunction, me);
		},
		getPixelForValue: function(value, index, datasetIndex, includeOffset) {
			var me = this;
			var labelMoment = value && value.isValid && value.isValid() ? value : me.getLabelMoment(datasetIndex, index);

			if (labelMoment) {
				var offset = labelMoment.diff(me.firstTick, me.tickUnit, true);

				var decimal = offset / me.scaleSizeInUnits;

				if (me.isHorizontal()) {
					var innerWidth = me.width - (me.paddingLeft + me.paddingRight);
					var valueWidth = innerWidth / Math.max(me.ticks.length - 1, 1);
					var valueOffset = (innerWidth * decimal) + me.paddingLeft;

					return me.left + Math.round(valueOffset);
				} else {
					var innerHeight = me.height - (me.paddingTop + me.paddingBottom);
					var valueHeight = innerHeight / Math.max(me.ticks.length - 1, 1);
					var heightOffset = (innerHeight * decimal) + me.paddingTop;

					return me.top + Math.round(heightOffset);
				}
			}
		},
		getPixelForTick: function(index, includeOffset) {
			return this.getPixelForValue(this.tickMoments[index], null, null, includeOffset);
		},
		getValueForPixel: function(pixel) {
			var me = this;
			var innerDimension = me.isHorizontal() ? me.width - (me.paddingLeft + me.paddingRight) : me.height - (me.paddingTop + me.paddingBottom);
			var offset = (pixel - (me.isHorizontal() ? me.left + me.paddingLeft : me.top + me.paddingTop)) / innerDimension;
			offset *= me.scaleSizeInUnits;
			return me.firstTick.clone().add(moment.duration(offset, me.tickUnit).asSeconds(), 'seconds');
		},
		parseTime: function(label) {
			var me = this;
			if (typeof me.options.time.parser === 'string') {
				return moment(label, me.options.time.parser);
			}
			if (typeof me.options.time.parser === 'function') {
				return me.options.time.parser(label);
			}
			// Date objects
			if (typeof label.getMonth === 'function' || typeof label === 'number') {
				return moment(label);
			}
			// Moment support
			if (label.isValid && label.isValid()) {
				return label;
			}
			// Custom parsing (return an instance of moment)
			if (typeof me.options.time.format !== 'string' && me.options.time.format.call) {
				console.warn("options.time.format is deprecated and replaced by options.time.parser. See http://nnnick.github.io/Chart.js/docs-v2/#scales-time-scale");
				return me.options.time.format(label);
			}
			// Moment format parsing
			return moment(label, me.options.time.format);
		}
	});
	Chart.scaleService.registerScaleType("time", TimeScale, defaultConfig);

};

},{"moment":45}],40:[function(require,module,exports){
/* MIT license */
var colorNames = require('color-name');

module.exports = {
   getRgba: getRgba,
   getHsla: getHsla,
   getRgb: getRgb,
   getHsl: getHsl,
   getHwb: getHwb,
   getAlpha: getAlpha,

   hexString: hexString,
   rgbString: rgbString,
   rgbaString: rgbaString,
   percentString: percentString,
   percentaString: percentaString,
   hslString: hslString,
   hslaString: hslaString,
   hwbString: hwbString,
   keyword: keyword
}

function getRgba(string) {
   if (!string) {
      return;
   }
   var abbr =  /^#([a-fA-F0-9]{3})$/,
       hex =  /^#([a-fA-F0-9]{6})$/,
       rgba = /^rgba?\(\s*([+-]?\d+)\s*,\s*([+-]?\d+)\s*,\s*([+-]?\d+)\s*(?:,\s*([+-]?[\d\.]+)\s*)?\)$/,
       per = /^rgba?\(\s*([+-]?[\d\.]+)\%\s*,\s*([+-]?[\d\.]+)\%\s*,\s*([+-]?[\d\.]+)\%\s*(?:,\s*([+-]?[\d\.]+)\s*)?\)$/,
       keyword = /(\w+)/;

   var rgb = [0, 0, 0],
       a = 1,
       match = string.match(abbr);
   if (match) {
      match = match[1];
      for (var i = 0; i < rgb.length; i++) {
         rgb[i] = parseInt(match[i] + match[i], 16);
      }
   }
   else if (match = string.match(hex)) {
      match = match[1];
      for (var i = 0; i < rgb.length; i++) {
         rgb[i] = parseInt(match.slice(i * 2, i * 2 + 2), 16);
      }
   }
   else if (match = string.match(rgba)) {
      for (var i = 0; i < rgb.length; i++) {
         rgb[i] = parseInt(match[i + 1]);
      }
      a = parseFloat(match[4]);
   }
   else if (match = string.match(per)) {
      for (var i = 0; i < rgb.length; i++) {
         rgb[i] = Math.round(parseFloat(match[i + 1]) * 2.55);
      }
      a = parseFloat(match[4]);
   }
   else if (match = string.match(keyword)) {
      if (match[1] == "transparent") {
         return [0, 0, 0, 0];
      }
      rgb = colorNames[match[1]];
      if (!rgb) {
         return;
      }
   }

   for (var i = 0; i < rgb.length; i++) {
      rgb[i] = scale(rgb[i], 0, 255);
   }
   if (!a && a != 0) {
      a = 1;
   }
   else {
      a = scale(a, 0, 1);
   }
   rgb[3] = a;
   return rgb;
}

function getHsla(string) {
   if (!string) {
      return;
   }
   var hsl = /^hsla?\(\s*([+-]?\d+)(?:deg)?\s*,\s*([+-]?[\d\.]+)%\s*,\s*([+-]?[\d\.]+)%\s*(?:,\s*([+-]?[\d\.]+)\s*)?\)/;
   var match = string.match(hsl);
   if (match) {
      var alpha = parseFloat(match[4]);
      var h = scale(parseInt(match[1]), 0, 360),
          s = scale(parseFloat(match[2]), 0, 100),
          l = scale(parseFloat(match[3]), 0, 100),
          a = scale(isNaN(alpha) ? 1 : alpha, 0, 1);
      return [h, s, l, a];
   }
}

function getHwb(string) {
   if (!string) {
      return;
   }
   var hwb = /^hwb\(\s*([+-]?\d+)(?:deg)?\s*,\s*([+-]?[\d\.]+)%\s*,\s*([+-]?[\d\.]+)%\s*(?:,\s*([+-]?[\d\.]+)\s*)?\)/;
   var match = string.match(hwb);
   if (match) {
    var alpha = parseFloat(match[4]);
      var h = scale(parseInt(match[1]), 0, 360),
          w = scale(parseFloat(match[2]), 0, 100),
          b = scale(parseFloat(match[3]), 0, 100),
          a = scale(isNaN(alpha) ? 1 : alpha, 0, 1);
      return [h, w, b, a];
   }
}

function getRgb(string) {
   var rgba = getRgba(string);
   return rgba && rgba.slice(0, 3);
}

function getHsl(string) {
  var hsla = getHsla(string);
  return hsla && hsla.slice(0, 3);
}

function getAlpha(string) {
   var vals = getRgba(string);
   if (vals) {
      return vals[3];
   }
   else if (vals = getHsla(string)) {
      return vals[3];
   }
   else if (vals = getHwb(string)) {
      return vals[3];
   }
}

// generators
function hexString(rgb) {
   return "#" + hexDouble(rgb[0]) + hexDouble(rgb[1])
              + hexDouble(rgb[2]);
}

function rgbString(rgba, alpha) {
   if (alpha < 1 || (rgba[3] && rgba[3] < 1)) {
      return rgbaString(rgba, alpha);
   }
   return "rgb(" + rgba[0] + ", " + rgba[1] + ", " + rgba[2] + ")";
}

function rgbaString(rgba, alpha) {
   if (alpha === undefined) {
      alpha = (rgba[3] !== undefined ? rgba[3] : 1);
   }
   return "rgba(" + rgba[0] + ", " + rgba[1] + ", " + rgba[2]
           + ", " + alpha + ")";
}

function percentString(rgba, alpha) {
   if (alpha < 1 || (rgba[3] && rgba[3] < 1)) {
      return percentaString(rgba, alpha);
   }
   var r = Math.round(rgba[0]/255 * 100),
       g = Math.round(rgba[1]/255 * 100),
       b = Math.round(rgba[2]/255 * 100);

   return "rgb(" + r + "%, " + g + "%, " + b + "%)";
}

function percentaString(rgba, alpha) {
   var r = Math.round(rgba[0]/255 * 100),
       g = Math.round(rgba[1]/255 * 100),
       b = Math.round(rgba[2]/255 * 100);
   return "rgba(" + r + "%, " + g + "%, " + b + "%, " + (alpha || rgba[3] || 1) + ")";
}

function hslString(hsla, alpha) {
   if (alpha < 1 || (hsla[3] && hsla[3] < 1)) {
      return hslaString(hsla, alpha);
   }
   return "hsl(" + hsla[0] + ", " + hsla[1] + "%, " + hsla[2] + "%)";
}

function hslaString(hsla, alpha) {
   if (alpha === undefined) {
      alpha = (hsla[3] !== undefined ? hsla[3] : 1);
   }
   return "hsla(" + hsla[0] + ", " + hsla[1] + "%, " + hsla[2] + "%, "
           + alpha + ")";
}

// hwb is a bit different than rgb(a) & hsl(a) since there is no alpha specific syntax
// (hwb have alpha optional & 1 is default value)
function hwbString(hwb, alpha) {
   if (alpha === undefined) {
      alpha = (hwb[3] !== undefined ? hwb[3] : 1);
   }
   return "hwb(" + hwb[0] + ", " + hwb[1] + "%, " + hwb[2] + "%"
           + (alpha !== undefined && alpha !== 1 ? ", " + alpha : "") + ")";
}

function keyword(rgb) {
  return reverseNames[rgb.slice(0, 3)];
}

// helpers
function scale(num, min, max) {
   return Math.min(Math.max(min, num), max);
}

function hexDouble(num) {
  var str = num.toString(16).toUpperCase();
  return (str.length < 2) ? "0" + str : str;
}


//create a list of reverse color names
var reverseNames = {};
for (var name in colorNames) {
   reverseNames[colorNames[name]] = name;
}

},{"color-name":44}],41:[function(require,module,exports){
/* MIT license */
var convert = require('color-convert');
var string = require('chartjs-color-string');

var Color = function (obj) {
	if (obj instanceof Color) {
		return obj;
	}
	if (!(this instanceof Color)) {
		return new Color(obj);
	}

	this.values = {
		rgb: [0, 0, 0],
		hsl: [0, 0, 0],
		hsv: [0, 0, 0],
		hwb: [0, 0, 0],
		cmyk: [0, 0, 0, 0],
		alpha: 1
	};

	// parse Color() argument
	var vals;
	if (typeof obj === 'string') {
		vals = string.getRgba(obj);
		if (vals) {
			this.setValues('rgb', vals);
		} else if (vals = string.getHsla(obj)) {
			this.setValues('hsl', vals);
		} else if (vals = string.getHwb(obj)) {
			this.setValues('hwb', vals);
		} else {
			throw new Error('Unable to parse color from string "' + obj + '"');
		}
	} else if (typeof obj === 'object') {
		vals = obj;
		if (vals.r !== undefined || vals.red !== undefined) {
			this.setValues('rgb', vals);
		} else if (vals.l !== undefined || vals.lightness !== undefined) {
			this.setValues('hsl', vals);
		} else if (vals.v !== undefined || vals.value !== undefined) {
			this.setValues('hsv', vals);
		} else if (vals.w !== undefined || vals.whiteness !== undefined) {
			this.setValues('hwb', vals);
		} else if (vals.c !== undefined || vals.cyan !== undefined) {
			this.setValues('cmyk', vals);
		} else {
			throw new Error('Unable to parse color from object ' + JSON.stringify(obj));
		}
	}
};

Color.prototype = {
	rgb: function () {
		return this.setSpace('rgb', arguments);
	},
	hsl: function () {
		return this.setSpace('hsl', arguments);
	},
	hsv: function () {
		return this.setSpace('hsv', arguments);
	},
	hwb: function () {
		return this.setSpace('hwb', arguments);
	},
	cmyk: function () {
		return this.setSpace('cmyk', arguments);
	},

	rgbArray: function () {
		return this.values.rgb;
	},
	hslArray: function () {
		return this.values.hsl;
	},
	hsvArray: function () {
		return this.values.hsv;
	},
	hwbArray: function () {
		var values = this.values;
		if (values.alpha !== 1) {
			return values.hwb.concat([values.alpha]);
		}
		return values.hwb;
	},
	cmykArray: function () {
		return this.values.cmyk;
	},
	rgbaArray: function () {
		var values = this.values;
		return values.rgb.concat([values.alpha]);
	},
	hslaArray: function () {
		var values = this.values;
		return values.hsl.concat([values.alpha]);
	},
	alpha: function (val) {
		if (val === undefined) {
			return this.values.alpha;
		}
		this.setValues('alpha', val);
		return this;
	},

	red: function (val) {
		return this.setChannel('rgb', 0, val);
	},
	green: function (val) {
		return this.setChannel('rgb', 1, val);
	},
	blue: function (val) {
		return this.setChannel('rgb', 2, val);
	},
	hue: function (val) {
		if (val) {
			val %= 360;
			val = val < 0 ? 360 + val : val;
		}
		return this.setChannel('hsl', 0, val);
	},
	saturation: function (val) {
		return this.setChannel('hsl', 1, val);
	},
	lightness: function (val) {
		return this.setChannel('hsl', 2, val);
	},
	saturationv: function (val) {
		return this.setChannel('hsv', 1, val);
	},
	whiteness: function (val) {
		return this.setChannel('hwb', 1, val);
	},
	blackness: function (val) {
		return this.setChannel('hwb', 2, val);
	},
	value: function (val) {
		return this.setChannel('hsv', 2, val);
	},
	cyan: function (val) {
		return this.setChannel('cmyk', 0, val);
	},
	magenta: function (val) {
		return this.setChannel('cmyk', 1, val);
	},
	yellow: function (val) {
		return this.setChannel('cmyk', 2, val);
	},
	black: function (val) {
		return this.setChannel('cmyk', 3, val);
	},

	hexString: function () {
		return string.hexString(this.values.rgb);
	},
	rgbString: function () {
		return string.rgbString(this.values.rgb, this.values.alpha);
	},
	rgbaString: function () {
		return string.rgbaString(this.values.rgb, this.values.alpha);
	},
	percentString: function () {
		return string.percentString(this.values.rgb, this.values.alpha);
	},
	hslString: function () {
		return string.hslString(this.values.hsl, this.values.alpha);
	},
	hslaString: function () {
		return string.hslaString(this.values.hsl, this.values.alpha);
	},
	hwbString: function () {
		return string.hwbString(this.values.hwb, this.values.alpha);
	},
	keyword: function () {
		return string.keyword(this.values.rgb, this.values.alpha);
	},

	rgbNumber: function () {
		var rgb = this.values.rgb;
		return (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
	},

	luminosity: function () {
		// http://www.w3.org/TR/WCAG20/#relativeluminancedef
		var rgb = this.values.rgb;
		var lum = [];
		for (var i = 0; i < rgb.length; i++) {
			var chan = rgb[i] / 255;
			lum[i] = (chan <= 0.03928) ? chan / 12.92 : Math.pow(((chan + 0.055) / 1.055), 2.4);
		}
		return 0.2126 * lum[0] + 0.7152 * lum[1] + 0.0722 * lum[2];
	},

	contrast: function (color2) {
		// http://www.w3.org/TR/WCAG20/#contrast-ratiodef
		var lum1 = this.luminosity();
		var lum2 = color2.luminosity();
		if (lum1 > lum2) {
			return (lum1 + 0.05) / (lum2 + 0.05);
		}
		return (lum2 + 0.05) / (lum1 + 0.05);
	},

	level: function (color2) {
		var contrastRatio = this.contrast(color2);
		if (contrastRatio >= 7.1) {
			return 'AAA';
		}

		return (contrastRatio >= 4.5) ? 'AA' : '';
	},

	dark: function () {
		// YIQ equation from http://24ways.org/2010/calculating-color-contrast
		var rgb = this.values.rgb;
		var yiq = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
		return yiq < 128;
	},

	light: function () {
		return !this.dark();
	},

	negate: function () {
		var rgb = [];
		for (var i = 0; i < 3; i++) {
			rgb[i] = 255 - this.values.rgb[i];
		}
		this.setValues('rgb', rgb);
		return this;
	},

	lighten: function (ratio) {
		var hsl = this.values.hsl;
		hsl[2] += hsl[2] * ratio;
		this.setValues('hsl', hsl);
		return this;
	},

	darken: function (ratio) {
		var hsl = this.values.hsl;
		hsl[2] -= hsl[2] * ratio;
		this.setValues('hsl', hsl);
		return this;
	},

	saturate: function (ratio) {
		var hsl = this.values.hsl;
		hsl[1] += hsl[1] * ratio;
		this.setValues('hsl', hsl);
		return this;
	},

	desaturate: function (ratio) {
		var hsl = this.values.hsl;
		hsl[1] -= hsl[1] * ratio;
		this.setValues('hsl', hsl);
		return this;
	},

	whiten: function (ratio) {
		var hwb = this.values.hwb;
		hwb[1] += hwb[1] * ratio;
		this.setValues('hwb', hwb);
		return this;
	},

	blacken: function (ratio) {
		var hwb = this.values.hwb;
		hwb[2] += hwb[2] * ratio;
		this.setValues('hwb', hwb);
		return this;
	},

	greyscale: function () {
		var rgb = this.values.rgb;
		// http://en.wikipedia.org/wiki/Grayscale#Converting_color_to_grayscale
		var val = rgb[0] * 0.3 + rgb[1] * 0.59 + rgb[2] * 0.11;
		this.setValues('rgb', [val, val, val]);
		return this;
	},

	clearer: function (ratio) {
		var alpha = this.values.alpha;
		this.setValues('alpha', alpha - (alpha * ratio));
		return this;
	},

	opaquer: function (ratio) {
		var alpha = this.values.alpha;
		this.setValues('alpha', alpha + (alpha * ratio));
		return this;
	},

	rotate: function (degrees) {
		var hsl = this.values.hsl;
		var hue = (hsl[0] + degrees) % 360;
		hsl[0] = hue < 0 ? 360 + hue : hue;
		this.setValues('hsl', hsl);
		return this;
	},

	/**
	 * Ported from sass implementation in C
	 * https://github.com/sass/libsass/blob/0e6b4a2850092356aa3ece07c6b249f0221caced/functions.cpp#L209
	 */
	mix: function (mixinColor, weight) {
		var color1 = this;
		var color2 = mixinColor;
		var p = weight === undefined ? 0.5 : weight;

		var w = 2 * p - 1;
		var a = color1.alpha() - color2.alpha();

		var w1 = (((w * a === -1) ? w : (w + a) / (1 + w * a)) + 1) / 2.0;
		var w2 = 1 - w1;

		return this
			.rgb(
				w1 * color1.red() + w2 * color2.red(),
				w1 * color1.green() + w2 * color2.green(),
				w1 * color1.blue() + w2 * color2.blue()
			)
			.alpha(color1.alpha() * p + color2.alpha() * (1 - p));
	},

	toJSON: function () {
		return this.rgb();
	},

	clone: function () {
		// NOTE(SB): using node-clone creates a dependency to Buffer when using browserify,
		// making the final build way to big to embed in Chart.js. So let's do it manually,
		// assuming that values to clone are 1 dimension arrays containing only numbers,
		// except 'alpha' which is a number.
		var result = new Color();
		var source = this.values;
		var target = result.values;
		var value, type;

		for (var prop in source) {
			if (source.hasOwnProperty(prop)) {
				value = source[prop];
				type = ({}).toString.call(value);
				if (type === '[object Array]') {
					target[prop] = value.slice(0);
				} else if (type === '[object Number]') {
					target[prop] = value;
				} else {
					console.error('unexpected color value:', value);
				}
			}
		}

		return result;
	}
};

Color.prototype.spaces = {
	rgb: ['red', 'green', 'blue'],
	hsl: ['hue', 'saturation', 'lightness'],
	hsv: ['hue', 'saturation', 'value'],
	hwb: ['hue', 'whiteness', 'blackness'],
	cmyk: ['cyan', 'magenta', 'yellow', 'black']
};

Color.prototype.maxes = {
	rgb: [255, 255, 255],
	hsl: [360, 100, 100],
	hsv: [360, 100, 100],
	hwb: [360, 100, 100],
	cmyk: [100, 100, 100, 100]
};

Color.prototype.getValues = function (space) {
	var values = this.values;
	var vals = {};

	for (var i = 0; i < space.length; i++) {
		vals[space.charAt(i)] = values[space][i];
	}

	if (values.alpha !== 1) {
		vals.a = values.alpha;
	}

	// {r: 255, g: 255, b: 255, a: 0.4}
	return vals;
};

Color.prototype.setValues = function (space, vals) {
	var values = this.values;
	var spaces = this.spaces;
	var maxes = this.maxes;
	var alpha = 1;
	var i;

	if (space === 'alpha') {
		alpha = vals;
	} else if (vals.length) {
		// [10, 10, 10]
		values[space] = vals.slice(0, space.length);
		alpha = vals[space.length];
	} else if (vals[space.charAt(0)] !== undefined) {
		// {r: 10, g: 10, b: 10}
		for (i = 0; i < space.length; i++) {
			values[space][i] = vals[space.charAt(i)];
		}

		alpha = vals.a;
	} else if (vals[spaces[space][0]] !== undefined) {
		// {red: 10, green: 10, blue: 10}
		var chans = spaces[space];

		for (i = 0; i < space.length; i++) {
			values[space][i] = vals[chans[i]];
		}

		alpha = vals.alpha;
	}

	values.alpha = Math.max(0, Math.min(1, (alpha === undefined ? values.alpha : alpha)));

	if (space === 'alpha') {
		return false;
	}

	var capped;

	// cap values of the space prior converting all values
	for (i = 0; i < space.length; i++) {
		capped = Math.max(0, Math.min(maxes[space][i], values[space][i]));
		values[space][i] = Math.round(capped);
	}

	// convert to all the other color spaces
	for (var sname in spaces) {
		if (sname !== space) {
			values[sname] = convert[space][sname](values[space]);
		}
	}

	return true;
};

Color.prototype.setSpace = function (space, args) {
	var vals = args[0];

	if (vals === undefined) {
		// color.rgb()
		return this.getValues(space);
	}

	// color.rgb(10, 10, 10)
	if (typeof vals === 'number') {
		vals = Array.prototype.slice.call(args);
	}

	this.setValues(space, vals);
	return this;
};

Color.prototype.setChannel = function (space, index, val) {
	var svalues = this.values[space];
	if (val === undefined) {
		// color.red()
		return svalues[index];
	} else if (val === svalues[index]) {
		// color.red(color.red())
		return this;
	}

	// color.red(100)
	svalues[index] = val;
	this.setValues(space, svalues);

	return this;
};

if (typeof window !== 'undefined') {
	window.Color = Color;
}

module.exports = Color;

},{"chartjs-color-string":40,"color-convert":43}],42:[function(require,module,exports){
/* MIT license */

module.exports = {
  rgb2hsl: rgb2hsl,
  rgb2hsv: rgb2hsv,
  rgb2hwb: rgb2hwb,
  rgb2cmyk: rgb2cmyk,
  rgb2keyword: rgb2keyword,
  rgb2xyz: rgb2xyz,
  rgb2lab: rgb2lab,
  rgb2lch: rgb2lch,

  hsl2rgb: hsl2rgb,
  hsl2hsv: hsl2hsv,
  hsl2hwb: hsl2hwb,
  hsl2cmyk: hsl2cmyk,
  hsl2keyword: hsl2keyword,

  hsv2rgb: hsv2rgb,
  hsv2hsl: hsv2hsl,
  hsv2hwb: hsv2hwb,
  hsv2cmyk: hsv2cmyk,
  hsv2keyword: hsv2keyword,

  hwb2rgb: hwb2rgb,
  hwb2hsl: hwb2hsl,
  hwb2hsv: hwb2hsv,
  hwb2cmyk: hwb2cmyk,
  hwb2keyword: hwb2keyword,

  cmyk2rgb: cmyk2rgb,
  cmyk2hsl: cmyk2hsl,
  cmyk2hsv: cmyk2hsv,
  cmyk2hwb: cmyk2hwb,
  cmyk2keyword: cmyk2keyword,

  keyword2rgb: keyword2rgb,
  keyword2hsl: keyword2hsl,
  keyword2hsv: keyword2hsv,
  keyword2hwb: keyword2hwb,
  keyword2cmyk: keyword2cmyk,
  keyword2lab: keyword2lab,
  keyword2xyz: keyword2xyz,

  xyz2rgb: xyz2rgb,
  xyz2lab: xyz2lab,
  xyz2lch: xyz2lch,

  lab2xyz: lab2xyz,
  lab2rgb: lab2rgb,
  lab2lch: lab2lch,

  lch2lab: lch2lab,
  lch2xyz: lch2xyz,
  lch2rgb: lch2rgb
}


function rgb2hsl(rgb) {
  var r = rgb[0]/255,
      g = rgb[1]/255,
      b = rgb[2]/255,
      min = Math.min(r, g, b),
      max = Math.max(r, g, b),
      delta = max - min,
      h, s, l;

  if (max == min)
    h = 0;
  else if (r == max)
    h = (g - b) / delta;
  else if (g == max)
    h = 2 + (b - r) / delta;
  else if (b == max)
    h = 4 + (r - g)/ delta;

  h = Math.min(h * 60, 360);

  if (h < 0)
    h += 360;

  l = (min + max) / 2;

  if (max == min)
    s = 0;
  else if (l <= 0.5)
    s = delta / (max + min);
  else
    s = delta / (2 - max - min);

  return [h, s * 100, l * 100];
}

function rgb2hsv(rgb) {
  var r = rgb[0],
      g = rgb[1],
      b = rgb[2],
      min = Math.min(r, g, b),
      max = Math.max(r, g, b),
      delta = max - min,
      h, s, v;

  if (max == 0)
    s = 0;
  else
    s = (delta/max * 1000)/10;

  if (max == min)
    h = 0;
  else if (r == max)
    h = (g - b) / delta;
  else if (g == max)
    h = 2 + (b - r) / delta;
  else if (b == max)
    h = 4 + (r - g) / delta;

  h = Math.min(h * 60, 360);

  if (h < 0)
    h += 360;

  v = ((max / 255) * 1000) / 10;

  return [h, s, v];
}

function rgb2hwb(rgb) {
  var r = rgb[0],
      g = rgb[1],
      b = rgb[2],
      h = rgb2hsl(rgb)[0],
      w = 1/255 * Math.min(r, Math.min(g, b)),
      b = 1 - 1/255 * Math.max(r, Math.max(g, b));

  return [h, w * 100, b * 100];
}

function rgb2cmyk(rgb) {
  var r = rgb[0] / 255,
      g = rgb[1] / 255,
      b = rgb[2] / 255,
      c, m, y, k;

  k = Math.min(1 - r, 1 - g, 1 - b);
  c = (1 - r - k) / (1 - k) || 0;
  m = (1 - g - k) / (1 - k) || 0;
  y = (1 - b - k) / (1 - k) || 0;
  return [c * 100, m * 100, y * 100, k * 100];
}

function rgb2keyword(rgb) {
  return reverseKeywords[JSON.stringify(rgb)];
}

function rgb2xyz(rgb) {
  var r = rgb[0] / 255,
      g = rgb[1] / 255,
      b = rgb[2] / 255;

  // assume sRGB
  r = r > 0.04045 ? Math.pow(((r + 0.055) / 1.055), 2.4) : (r / 12.92);
  g = g > 0.04045 ? Math.pow(((g + 0.055) / 1.055), 2.4) : (g / 12.92);
  b = b > 0.04045 ? Math.pow(((b + 0.055) / 1.055), 2.4) : (b / 12.92);

  var x = (r * 0.4124) + (g * 0.3576) + (b * 0.1805);
  var y = (r * 0.2126) + (g * 0.7152) + (b * 0.0722);
  var z = (r * 0.0193) + (g * 0.1192) + (b * 0.9505);

  return [x * 100, y *100, z * 100];
}

function rgb2lab(rgb) {
  var xyz = rgb2xyz(rgb),
        x = xyz[0],
        y = xyz[1],
        z = xyz[2],
        l, a, b;

  x /= 95.047;
  y /= 100;
  z /= 108.883;

  x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + (16 / 116);
  y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + (16 / 116);
  z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + (16 / 116);

  l = (116 * y) - 16;
  a = 500 * (x - y);
  b = 200 * (y - z);

  return [l, a, b];
}

function rgb2lch(args) {
  return lab2lch(rgb2lab(args));
}

function hsl2rgb(hsl) {
  var h = hsl[0] / 360,
      s = hsl[1] / 100,
      l = hsl[2] / 100,
      t1, t2, t3, rgb, val;

  if (s == 0) {
    val = l * 255;
    return [val, val, val];
  }

  if (l < 0.5)
    t2 = l * (1 + s);
  else
    t2 = l + s - l * s;
  t1 = 2 * l - t2;

  rgb = [0, 0, 0];
  for (var i = 0; i < 3; i++) {
    t3 = h + 1 / 3 * - (i - 1);
    t3 < 0 && t3++;
    t3 > 1 && t3--;

    if (6 * t3 < 1)
      val = t1 + (t2 - t1) * 6 * t3;
    else if (2 * t3 < 1)
      val = t2;
    else if (3 * t3 < 2)
      val = t1 + (t2 - t1) * (2 / 3 - t3) * 6;
    else
      val = t1;

    rgb[i] = val * 255;
  }

  return rgb;
}

function hsl2hsv(hsl) {
  var h = hsl[0],
      s = hsl[1] / 100,
      l = hsl[2] / 100,
      sv, v;

  if(l === 0) {
      // no need to do calc on black
      // also avoids divide by 0 error
      return [0, 0, 0];
  }

  l *= 2;
  s *= (l <= 1) ? l : 2 - l;
  v = (l + s) / 2;
  sv = (2 * s) / (l + s);
  return [h, sv * 100, v * 100];
}

function hsl2hwb(args) {
  return rgb2hwb(hsl2rgb(args));
}

function hsl2cmyk(args) {
  return rgb2cmyk(hsl2rgb(args));
}

function hsl2keyword(args) {
  return rgb2keyword(hsl2rgb(args));
}


function hsv2rgb(hsv) {
  var h = hsv[0] / 60,
      s = hsv[1] / 100,
      v = hsv[2] / 100,
      hi = Math.floor(h) % 6;

  var f = h - Math.floor(h),
      p = 255 * v * (1 - s),
      q = 255 * v * (1 - (s * f)),
      t = 255 * v * (1 - (s * (1 - f))),
      v = 255 * v;

  switch(hi) {
    case 0:
      return [v, t, p];
    case 1:
      return [q, v, p];
    case 2:
      return [p, v, t];
    case 3:
      return [p, q, v];
    case 4:
      return [t, p, v];
    case 5:
      return [v, p, q];
  }
}

function hsv2hsl(hsv) {
  var h = hsv[0],
      s = hsv[1] / 100,
      v = hsv[2] / 100,
      sl, l;

  l = (2 - s) * v;
  sl = s * v;
  sl /= (l <= 1) ? l : 2 - l;
  sl = sl || 0;
  l /= 2;
  return [h, sl * 100, l * 100];
}

function hsv2hwb(args) {
  return rgb2hwb(hsv2rgb(args))
}

function hsv2cmyk(args) {
  return rgb2cmyk(hsv2rgb(args));
}

function hsv2keyword(args) {
  return rgb2keyword(hsv2rgb(args));
}

// http://dev.w3.org/csswg/css-color/#hwb-to-rgb
function hwb2rgb(hwb) {
  var h = hwb[0] / 360,
      wh = hwb[1] / 100,
      bl = hwb[2] / 100,
      ratio = wh + bl,
      i, v, f, n;

  // wh + bl cant be > 1
  if (ratio > 1) {
    wh /= ratio;
    bl /= ratio;
  }

  i = Math.floor(6 * h);
  v = 1 - bl;
  f = 6 * h - i;
  if ((i & 0x01) != 0) {
    f = 1 - f;
  }
  n = wh + f * (v - wh);  // linear interpolation

  switch (i) {
    default:
    case 6:
    case 0: r = v; g = n; b = wh; break;
    case 1: r = n; g = v; b = wh; break;
    case 2: r = wh; g = v; b = n; break;
    case 3: r = wh; g = n; b = v; break;
    case 4: r = n; g = wh; b = v; break;
    case 5: r = v; g = wh; b = n; break;
  }

  return [r * 255, g * 255, b * 255];
}

function hwb2hsl(args) {
  return rgb2hsl(hwb2rgb(args));
}

function hwb2hsv(args) {
  return rgb2hsv(hwb2rgb(args));
}

function hwb2cmyk(args) {
  return rgb2cmyk(hwb2rgb(args));
}

function hwb2keyword(args) {
  return rgb2keyword(hwb2rgb(args));
}

function cmyk2rgb(cmyk) {
  var c = cmyk[0] / 100,
      m = cmyk[1] / 100,
      y = cmyk[2] / 100,
      k = cmyk[3] / 100,
      r, g, b;

  r = 1 - Math.min(1, c * (1 - k) + k);
  g = 1 - Math.min(1, m * (1 - k) + k);
  b = 1 - Math.min(1, y * (1 - k) + k);
  return [r * 255, g * 255, b * 255];
}

function cmyk2hsl(args) {
  return rgb2hsl(cmyk2rgb(args));
}

function cmyk2hsv(args) {
  return rgb2hsv(cmyk2rgb(args));
}

function cmyk2hwb(args) {
  return rgb2hwb(cmyk2rgb(args));
}

function cmyk2keyword(args) {
  return rgb2keyword(cmyk2rgb(args));
}


function xyz2rgb(xyz) {
  var x = xyz[0] / 100,
      y = xyz[1] / 100,
      z = xyz[2] / 100,
      r, g, b;

  r = (x * 3.2406) + (y * -1.5372) + (z * -0.4986);
  g = (x * -0.9689) + (y * 1.8758) + (z * 0.0415);
  b = (x * 0.0557) + (y * -0.2040) + (z * 1.0570);

  // assume sRGB
  r = r > 0.0031308 ? ((1.055 * Math.pow(r, 1.0 / 2.4)) - 0.055)
    : r = (r * 12.92);

  g = g > 0.0031308 ? ((1.055 * Math.pow(g, 1.0 / 2.4)) - 0.055)
    : g = (g * 12.92);

  b = b > 0.0031308 ? ((1.055 * Math.pow(b, 1.0 / 2.4)) - 0.055)
    : b = (b * 12.92);

  r = Math.min(Math.max(0, r), 1);
  g = Math.min(Math.max(0, g), 1);
  b = Math.min(Math.max(0, b), 1);

  return [r * 255, g * 255, b * 255];
}

function xyz2lab(xyz) {
  var x = xyz[0],
      y = xyz[1],
      z = xyz[2],
      l, a, b;

  x /= 95.047;
  y /= 100;
  z /= 108.883;

  x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + (16 / 116);
  y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + (16 / 116);
  z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + (16 / 116);

  l = (116 * y) - 16;
  a = 500 * (x - y);
  b = 200 * (y - z);

  return [l, a, b];
}

function xyz2lch(args) {
  return lab2lch(xyz2lab(args));
}

function lab2xyz(lab) {
  var l = lab[0],
      a = lab[1],
      b = lab[2],
      x, y, z, y2;

  if (l <= 8) {
    y = (l * 100) / 903.3;
    y2 = (7.787 * (y / 100)) + (16 / 116);
  } else {
    y = 100 * Math.pow((l + 16) / 116, 3);
    y2 = Math.pow(y / 100, 1/3);
  }

  x = x / 95.047 <= 0.008856 ? x = (95.047 * ((a / 500) + y2 - (16 / 116))) / 7.787 : 95.047 * Math.pow((a / 500) + y2, 3);

  z = z / 108.883 <= 0.008859 ? z = (108.883 * (y2 - (b / 200) - (16 / 116))) / 7.787 : 108.883 * Math.pow(y2 - (b / 200), 3);

  return [x, y, z];
}

function lab2lch(lab) {
  var l = lab[0],
      a = lab[1],
      b = lab[2],
      hr, h, c;

  hr = Math.atan2(b, a);
  h = hr * 360 / 2 / Math.PI;
  if (h < 0) {
    h += 360;
  }
  c = Math.sqrt(a * a + b * b);
  return [l, c, h];
}

function lab2rgb(args) {
  return xyz2rgb(lab2xyz(args));
}

function lch2lab(lch) {
  var l = lch[0],
      c = lch[1],
      h = lch[2],
      a, b, hr;

  hr = h / 360 * 2 * Math.PI;
  a = c * Math.cos(hr);
  b = c * Math.sin(hr);
  return [l, a, b];
}

function lch2xyz(args) {
  return lab2xyz(lch2lab(args));
}

function lch2rgb(args) {
  return lab2rgb(lch2lab(args));
}

function keyword2rgb(keyword) {
  return cssKeywords[keyword];
}

function keyword2hsl(args) {
  return rgb2hsl(keyword2rgb(args));
}

function keyword2hsv(args) {
  return rgb2hsv(keyword2rgb(args));
}

function keyword2hwb(args) {
  return rgb2hwb(keyword2rgb(args));
}

function keyword2cmyk(args) {
  return rgb2cmyk(keyword2rgb(args));
}

function keyword2lab(args) {
  return rgb2lab(keyword2rgb(args));
}

function keyword2xyz(args) {
  return rgb2xyz(keyword2rgb(args));
}

var cssKeywords = {
  aliceblue:  [240,248,255],
  antiquewhite: [250,235,215],
  aqua: [0,255,255],
  aquamarine: [127,255,212],
  azure:  [240,255,255],
  beige:  [245,245,220],
  bisque: [255,228,196],
  black:  [0,0,0],
  blanchedalmond: [255,235,205],
  blue: [0,0,255],
  blueviolet: [138,43,226],
  brown:  [165,42,42],
  burlywood:  [222,184,135],
  cadetblue:  [95,158,160],
  chartreuse: [127,255,0],
  chocolate:  [210,105,30],
  coral:  [255,127,80],
  cornflowerblue: [100,149,237],
  cornsilk: [255,248,220],
  crimson:  [220,20,60],
  cyan: [0,255,255],
  darkblue: [0,0,139],
  darkcyan: [0,139,139],
  darkgoldenrod:  [184,134,11],
  darkgray: [169,169,169],
  darkgreen:  [0,100,0],
  darkgrey: [169,169,169],
  darkkhaki:  [189,183,107],
  darkmagenta:  [139,0,139],
  darkolivegreen: [85,107,47],
  darkorange: [255,140,0],
  darkorchid: [153,50,204],
  darkred:  [139,0,0],
  darksalmon: [233,150,122],
  darkseagreen: [143,188,143],
  darkslateblue:  [72,61,139],
  darkslategray:  [47,79,79],
  darkslategrey:  [47,79,79],
  darkturquoise:  [0,206,209],
  darkviolet: [148,0,211],
  deeppink: [255,20,147],
  deepskyblue:  [0,191,255],
  dimgray:  [105,105,105],
  dimgrey:  [105,105,105],
  dodgerblue: [30,144,255],
  firebrick:  [178,34,34],
  floralwhite:  [255,250,240],
  forestgreen:  [34,139,34],
  fuchsia:  [255,0,255],
  gainsboro:  [220,220,220],
  ghostwhite: [248,248,255],
  gold: [255,215,0],
  goldenrod:  [218,165,32],
  gray: [128,128,128],
  green:  [0,128,0],
  greenyellow:  [173,255,47],
  grey: [128,128,128],
  honeydew: [240,255,240],
  hotpink:  [255,105,180],
  indianred:  [205,92,92],
  indigo: [75,0,130],
  ivory:  [255,255,240],
  khaki:  [240,230,140],
  lavender: [230,230,250],
  lavenderblush:  [255,240,245],
  lawngreen:  [124,252,0],
  lemonchiffon: [255,250,205],
  lightblue:  [173,216,230],
  lightcoral: [240,128,128],
  lightcyan:  [224,255,255],
  lightgoldenrodyellow: [250,250,210],
  lightgray:  [211,211,211],
  lightgreen: [144,238,144],
  lightgrey:  [211,211,211],
  lightpink:  [255,182,193],
  lightsalmon:  [255,160,122],
  lightseagreen:  [32,178,170],
  lightskyblue: [135,206,250],
  lightslategray: [119,136,153],
  lightslategrey: [119,136,153],
  lightsteelblue: [176,196,222],
  lightyellow:  [255,255,224],
  lime: [0,255,0],
  limegreen:  [50,205,50],
  linen:  [250,240,230],
  magenta:  [255,0,255],
  maroon: [128,0,0],
  mediumaquamarine: [102,205,170],
  mediumblue: [0,0,205],
  mediumorchid: [186,85,211],
  mediumpurple: [147,112,219],
  mediumseagreen: [60,179,113],
  mediumslateblue:  [123,104,238],
  mediumspringgreen:  [0,250,154],
  mediumturquoise:  [72,209,204],
  mediumvioletred:  [199,21,133],
  midnightblue: [25,25,112],
  mintcream:  [245,255,250],
  mistyrose:  [255,228,225],
  moccasin: [255,228,181],
  navajowhite:  [255,222,173],
  navy: [0,0,128],
  oldlace:  [253,245,230],
  olive:  [128,128,0],
  olivedrab:  [107,142,35],
  orange: [255,165,0],
  orangered:  [255,69,0],
  orchid: [218,112,214],
  palegoldenrod:  [238,232,170],
  palegreen:  [152,251,152],
  paleturquoise:  [175,238,238],
  palevioletred:  [219,112,147],
  papayawhip: [255,239,213],
  peachpuff:  [255,218,185],
  peru: [205,133,63],
  pink: [255,192,203],
  plum: [221,160,221],
  powderblue: [176,224,230],
  purple: [128,0,128],
  rebeccapurple: [102, 51, 153],
  red:  [255,0,0],
  rosybrown:  [188,143,143],
  royalblue:  [65,105,225],
  saddlebrown:  [139,69,19],
  salmon: [250,128,114],
  sandybrown: [244,164,96],
  seagreen: [46,139,87],
  seashell: [255,245,238],
  sienna: [160,82,45],
  silver: [192,192,192],
  skyblue:  [135,206,235],
  slateblue:  [106,90,205],
  slategray:  [112,128,144],
  slategrey:  [112,128,144],
  snow: [255,250,250],
  springgreen:  [0,255,127],
  steelblue:  [70,130,180],
  tan:  [210,180,140],
  teal: [0,128,128],
  thistle:  [216,191,216],
  tomato: [255,99,71],
  turquoise:  [64,224,208],
  violet: [238,130,238],
  wheat:  [245,222,179],
  white:  [255,255,255],
  whitesmoke: [245,245,245],
  yellow: [255,255,0],
  yellowgreen:  [154,205,50]
};

var reverseKeywords = {};
for (var key in cssKeywords) {
  reverseKeywords[JSON.stringify(cssKeywords[key])] = key;
}

},{}],43:[function(require,module,exports){
var conversions = require("./conversions");

var convert = function() {
   return new Converter();
}

for (var func in conversions) {
  // export Raw versions
  convert[func + "Raw"] =  (function(func) {
    // accept array or plain args
    return function(arg) {
      if (typeof arg == "number")
        arg = Array.prototype.slice.call(arguments);
      return conversions[func](arg);
    }
  })(func);

  var pair = /(\w+)2(\w+)/.exec(func),
      from = pair[1],
      to = pair[2];

  // export rgb2hsl and ["rgb"]["hsl"]
  convert[from] = convert[from] || {};

  convert[from][to] = convert[func] = (function(func) { 
    return function(arg) {
      if (typeof arg == "number")
        arg = Array.prototype.slice.call(arguments);
      
      var val = conversions[func](arg);
      if (typeof val == "string" || val === undefined)
        return val; // keyword

      for (var i = 0; i < val.length; i++)
        val[i] = Math.round(val[i]);
      return val;
    }
  })(func);
}


/* Converter does lazy conversion and caching */
var Converter = function() {
   this.convs = {};
};

/* Either get the values for a space or
  set the values for a space, depending on args */
Converter.prototype.routeSpace = function(space, args) {
   var values = args[0];
   if (values === undefined) {
      // color.rgb()
      return this.getValues(space);
   }
   // color.rgb(10, 10, 10)
   if (typeof values == "number") {
      values = Array.prototype.slice.call(args);        
   }

   return this.setValues(space, values);
};
  
/* Set the values for a space, invalidating cache */
Converter.prototype.setValues = function(space, values) {
   this.space = space;
   this.convs = {};
   this.convs[space] = values;
   return this;
};

/* Get the values for a space. If there's already
  a conversion for the space, fetch it, otherwise
  compute it */
Converter.prototype.getValues = function(space) {
   var vals = this.convs[space];
   if (!vals) {
      var fspace = this.space,
          from = this.convs[fspace];
      vals = convert[fspace][space](from);

      this.convs[space] = vals;
   }
  return vals;
};

["rgb", "hsl", "hsv", "cmyk", "keyword"].forEach(function(space) {
   Converter.prototype[space] = function(vals) {
      return this.routeSpace(space, arguments);
   }
});

module.exports = convert;
},{"./conversions":42}],44:[function(require,module,exports){
module.exports = {
	"aliceblue": [240, 248, 255],
	"antiquewhite": [250, 235, 215],
	"aqua": [0, 255, 255],
	"aquamarine": [127, 255, 212],
	"azure": [240, 255, 255],
	"beige": [245, 245, 220],
	"bisque": [255, 228, 196],
	"black": [0, 0, 0],
	"blanchedalmond": [255, 235, 205],
	"blue": [0, 0, 255],
	"blueviolet": [138, 43, 226],
	"brown": [165, 42, 42],
	"burlywood": [222, 184, 135],
	"cadetblue": [95, 158, 160],
	"chartreuse": [127, 255, 0],
	"chocolate": [210, 105, 30],
	"coral": [255, 127, 80],
	"cornflowerblue": [100, 149, 237],
	"cornsilk": [255, 248, 220],
	"crimson": [220, 20, 60],
	"cyan": [0, 255, 255],
	"darkblue": [0, 0, 139],
	"darkcyan": [0, 139, 139],
	"darkgoldenrod": [184, 134, 11],
	"darkgray": [169, 169, 169],
	"darkgreen": [0, 100, 0],
	"darkgrey": [169, 169, 169],
	"darkkhaki": [189, 183, 107],
	"darkmagenta": [139, 0, 139],
	"darkolivegreen": [85, 107, 47],
	"darkorange": [255, 140, 0],
	"darkorchid": [153, 50, 204],
	"darkred": [139, 0, 0],
	"darksalmon": [233, 150, 122],
	"darkseagreen": [143, 188, 143],
	"darkslateblue": [72, 61, 139],
	"darkslategray": [47, 79, 79],
	"darkslategrey": [47, 79, 79],
	"darkturquoise": [0, 206, 209],
	"darkviolet": [148, 0, 211],
	"deeppink": [255, 20, 147],
	"deepskyblue": [0, 191, 255],
	"dimgray": [105, 105, 105],
	"dimgrey": [105, 105, 105],
	"dodgerblue": [30, 144, 255],
	"firebrick": [178, 34, 34],
	"floralwhite": [255, 250, 240],
	"forestgreen": [34, 139, 34],
	"fuchsia": [255, 0, 255],
	"gainsboro": [220, 220, 220],
	"ghostwhite": [248, 248, 255],
	"gold": [255, 215, 0],
	"goldenrod": [218, 165, 32],
	"gray": [128, 128, 128],
	"green": [0, 128, 0],
	"greenyellow": [173, 255, 47],
	"grey": [128, 128, 128],
	"honeydew": [240, 255, 240],
	"hotpink": [255, 105, 180],
	"indianred": [205, 92, 92],
	"indigo": [75, 0, 130],
	"ivory": [255, 255, 240],
	"khaki": [240, 230, 140],
	"lavender": [230, 230, 250],
	"lavenderblush": [255, 240, 245],
	"lawngreen": [124, 252, 0],
	"lemonchiffon": [255, 250, 205],
	"lightblue": [173, 216, 230],
	"lightcoral": [240, 128, 128],
	"lightcyan": [224, 255, 255],
	"lightgoldenrodyellow": [250, 250, 210],
	"lightgray": [211, 211, 211],
	"lightgreen": [144, 238, 144],
	"lightgrey": [211, 211, 211],
	"lightpink": [255, 182, 193],
	"lightsalmon": [255, 160, 122],
	"lightseagreen": [32, 178, 170],
	"lightskyblue": [135, 206, 250],
	"lightslategray": [119, 136, 153],
	"lightslategrey": [119, 136, 153],
	"lightsteelblue": [176, 196, 222],
	"lightyellow": [255, 255, 224],
	"lime": [0, 255, 0],
	"limegreen": [50, 205, 50],
	"linen": [250, 240, 230],
	"magenta": [255, 0, 255],
	"maroon": [128, 0, 0],
	"mediumaquamarine": [102, 205, 170],
	"mediumblue": [0, 0, 205],
	"mediumorchid": [186, 85, 211],
	"mediumpurple": [147, 112, 219],
	"mediumseagreen": [60, 179, 113],
	"mediumslateblue": [123, 104, 238],
	"mediumspringgreen": [0, 250, 154],
	"mediumturquoise": [72, 209, 204],
	"mediumvioletred": [199, 21, 133],
	"midnightblue": [25, 25, 112],
	"mintcream": [245, 255, 250],
	"mistyrose": [255, 228, 225],
	"moccasin": [255, 228, 181],
	"navajowhite": [255, 222, 173],
	"navy": [0, 0, 128],
	"oldlace": [253, 245, 230],
	"olive": [128, 128, 0],
	"olivedrab": [107, 142, 35],
	"orange": [255, 165, 0],
	"orangered": [255, 69, 0],
	"orchid": [218, 112, 214],
	"palegoldenrod": [238, 232, 170],
	"palegreen": [152, 251, 152],
	"paleturquoise": [175, 238, 238],
	"palevioletred": [219, 112, 147],
	"papayawhip": [255, 239, 213],
	"peachpuff": [255, 218, 185],
	"peru": [205, 133, 63],
	"pink": [255, 192, 203],
	"plum": [221, 160, 221],
	"powderblue": [176, 224, 230],
	"purple": [128, 0, 128],
	"rebeccapurple": [102, 51, 153],
	"red": [255, 0, 0],
	"rosybrown": [188, 143, 143],
	"royalblue": [65, 105, 225],
	"saddlebrown": [139, 69, 19],
	"salmon": [250, 128, 114],
	"sandybrown": [244, 164, 96],
	"seagreen": [46, 139, 87],
	"seashell": [255, 245, 238],
	"sienna": [160, 82, 45],
	"silver": [192, 192, 192],
	"skyblue": [135, 206, 235],
	"slateblue": [106, 90, 205],
	"slategray": [112, 128, 144],
	"slategrey": [112, 128, 144],
	"snow": [255, 250, 250],
	"springgreen": [0, 255, 127],
	"steelblue": [70, 130, 180],
	"tan": [210, 180, 140],
	"teal": [0, 128, 128],
	"thistle": [216, 191, 216],
	"tomato": [255, 99, 71],
	"turquoise": [64, 224, 208],
	"violet": [238, 130, 238],
	"wheat": [245, 222, 179],
	"white": [255, 255, 255],
	"whitesmoke": [245, 245, 245],
	"yellow": [255, 255, 0],
	"yellowgreen": [154, 205, 50]
};
},{}],45:[function(require,module,exports){
//! moment.js
//! version : 2.13.0
//! authors : Tim Wood, Iskren Chernev, Moment.js contributors
//! license : MIT
//! momentjs.com

;(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    global.moment = factory()
}(this, function () { 'use strict';

    var hookCallback;

    function utils_hooks__hooks () {
        return hookCallback.apply(null, arguments);
    }

    // This is done to register the method called with moment()
    // without creating circular dependencies.
    function setHookCallback (callback) {
        hookCallback = callback;
    }

    function isArray(input) {
        return input instanceof Array || Object.prototype.toString.call(input) === '[object Array]';
    }

    function isDate(input) {
        return input instanceof Date || Object.prototype.toString.call(input) === '[object Date]';
    }

    function map(arr, fn) {
        var res = [], i;
        for (i = 0; i < arr.length; ++i) {
            res.push(fn(arr[i], i));
        }
        return res;
    }

    function hasOwnProp(a, b) {
        return Object.prototype.hasOwnProperty.call(a, b);
    }

    function extend(a, b) {
        for (var i in b) {
            if (hasOwnProp(b, i)) {
                a[i] = b[i];
            }
        }

        if (hasOwnProp(b, 'toString')) {
            a.toString = b.toString;
        }

        if (hasOwnProp(b, 'valueOf')) {
            a.valueOf = b.valueOf;
        }

        return a;
    }

    function create_utc__createUTC (input, format, locale, strict) {
        return createLocalOrUTC(input, format, locale, strict, true).utc();
    }

    function defaultParsingFlags() {
        // We need to deep clone this object.
        return {
            empty           : false,
            unusedTokens    : [],
            unusedInput     : [],
            overflow        : -2,
            charsLeftOver   : 0,
            nullInput       : false,
            invalidMonth    : null,
            invalidFormat   : false,
            userInvalidated : false,
            iso             : false,
            parsedDateParts : [],
            meridiem        : null
        };
    }

    function getParsingFlags(m) {
        if (m._pf == null) {
            m._pf = defaultParsingFlags();
        }
        return m._pf;
    }

    var some;
    if (Array.prototype.some) {
        some = Array.prototype.some;
    } else {
        some = function (fun) {
            var t = Object(this);
            var len = t.length >>> 0;

            for (var i = 0; i < len; i++) {
                if (i in t && fun.call(this, t[i], i, t)) {
                    return true;
                }
            }

            return false;
        };
    }

    function valid__isValid(m) {
        if (m._isValid == null) {
            var flags = getParsingFlags(m);
            var parsedParts = some.call(flags.parsedDateParts, function (i) {
                return i != null;
            });
            m._isValid = !isNaN(m._d.getTime()) &&
                flags.overflow < 0 &&
                !flags.empty &&
                !flags.invalidMonth &&
                !flags.invalidWeekday &&
                !flags.nullInput &&
                !flags.invalidFormat &&
                !flags.userInvalidated &&
                (!flags.meridiem || (flags.meridiem && parsedParts));

            if (m._strict) {
                m._isValid = m._isValid &&
                    flags.charsLeftOver === 0 &&
                    flags.unusedTokens.length === 0 &&
                    flags.bigHour === undefined;
            }
        }
        return m._isValid;
    }

    function valid__createInvalid (flags) {
        var m = create_utc__createUTC(NaN);
        if (flags != null) {
            extend(getParsingFlags(m), flags);
        }
        else {
            getParsingFlags(m).userInvalidated = true;
        }

        return m;
    }

    function isUndefined(input) {
        return input === void 0;
    }

    // Plugins that add properties should also add the key here (null value),
    // so we can properly clone ourselves.
    var momentProperties = utils_hooks__hooks.momentProperties = [];

    function copyConfig(to, from) {
        var i, prop, val;

        if (!isUndefined(from._isAMomentObject)) {
            to._isAMomentObject = from._isAMomentObject;
        }
        if (!isUndefined(from._i)) {
            to._i = from._i;
        }
        if (!isUndefined(from._f)) {
            to._f = from._f;
        }
        if (!isUndefined(from._l)) {
            to._l = from._l;
        }
        if (!isUndefined(from._strict)) {
            to._strict = from._strict;
        }
        if (!isUndefined(from._tzm)) {
            to._tzm = from._tzm;
        }
        if (!isUndefined(from._isUTC)) {
            to._isUTC = from._isUTC;
        }
        if (!isUndefined(from._offset)) {
            to._offset = from._offset;
        }
        if (!isUndefined(from._pf)) {
            to._pf = getParsingFlags(from);
        }
        if (!isUndefined(from._locale)) {
            to._locale = from._locale;
        }

        if (momentProperties.length > 0) {
            for (i in momentProperties) {
                prop = momentProperties[i];
                val = from[prop];
                if (!isUndefined(val)) {
                    to[prop] = val;
                }
            }
        }

        return to;
    }

    var updateInProgress = false;

    // Moment prototype object
    function Moment(config) {
        copyConfig(this, config);
        this._d = new Date(config._d != null ? config._d.getTime() : NaN);
        // Prevent infinite loop in case updateOffset creates new moment
        // objects.
        if (updateInProgress === false) {
            updateInProgress = true;
            utils_hooks__hooks.updateOffset(this);
            updateInProgress = false;
        }
    }

    function isMoment (obj) {
        return obj instanceof Moment || (obj != null && obj._isAMomentObject != null);
    }

    function absFloor (number) {
        if (number < 0) {
            return Math.ceil(number);
        } else {
            return Math.floor(number);
        }
    }

    function toInt(argumentForCoercion) {
        var coercedNumber = +argumentForCoercion,
            value = 0;

        if (coercedNumber !== 0 && isFinite(coercedNumber)) {
            value = absFloor(coercedNumber);
        }

        return value;
    }

    // compare two arrays, return the number of differences
    function compareArrays(array1, array2, dontConvert) {
        var len = Math.min(array1.length, array2.length),
            lengthDiff = Math.abs(array1.length - array2.length),
            diffs = 0,
            i;
        for (i = 0; i < len; i++) {
            if ((dontConvert && array1[i] !== array2[i]) ||
                (!dontConvert && toInt(array1[i]) !== toInt(array2[i]))) {
                diffs++;
            }
        }
        return diffs + lengthDiff;
    }

    function warn(msg) {
        if (utils_hooks__hooks.suppressDeprecationWarnings === false &&
                (typeof console !==  'undefined') && console.warn) {
            console.warn('Deprecation warning: ' + msg);
        }
    }

    function deprecate(msg, fn) {
        var firstTime = true;

        return extend(function () {
            if (utils_hooks__hooks.deprecationHandler != null) {
                utils_hooks__hooks.deprecationHandler(null, msg);
            }
            if (firstTime) {
                warn(msg + '\nArguments: ' + Array.prototype.slice.call(arguments).join(', ') + '\n' + (new Error()).stack);
                firstTime = false;
            }
            return fn.apply(this, arguments);
        }, fn);
    }

    var deprecations = {};

    function deprecateSimple(name, msg) {
        if (utils_hooks__hooks.deprecationHandler != null) {
            utils_hooks__hooks.deprecationHandler(name, msg);
        }
        if (!deprecations[name]) {
            warn(msg);
            deprecations[name] = true;
        }
    }

    utils_hooks__hooks.suppressDeprecationWarnings = false;
    utils_hooks__hooks.deprecationHandler = null;

    function isFunction(input) {
        return input instanceof Function || Object.prototype.toString.call(input) === '[object Function]';
    }

    function isObject(input) {
        return Object.prototype.toString.call(input) === '[object Object]';
    }

    function locale_set__set (config) {
        var prop, i;
        for (i in config) {
            prop = config[i];
            if (isFunction(prop)) {
                this[i] = prop;
            } else {
                this['_' + i] = prop;
            }
        }
        this._config = config;
        // Lenient ordinal parsing accepts just a number in addition to
        // number + (possibly) stuff coming from _ordinalParseLenient.
        this._ordinalParseLenient = new RegExp(this._ordinalParse.source + '|' + (/\d{1,2}/).source);
    }

    function mergeConfigs(parentConfig, childConfig) {
        var res = extend({}, parentConfig), prop;
        for (prop in childConfig) {
            if (hasOwnProp(childConfig, prop)) {
                if (isObject(parentConfig[prop]) && isObject(childConfig[prop])) {
                    res[prop] = {};
                    extend(res[prop], parentConfig[prop]);
                    extend(res[prop], childConfig[prop]);
                } else if (childConfig[prop] != null) {
                    res[prop] = childConfig[prop];
                } else {
                    delete res[prop];
                }
            }
        }
        return res;
    }

    function Locale(config) {
        if (config != null) {
            this.set(config);
        }
    }

    var keys;

    if (Object.keys) {
        keys = Object.keys;
    } else {
        keys = function (obj) {
            var i, res = [];
            for (i in obj) {
                if (hasOwnProp(obj, i)) {
                    res.push(i);
                }
            }
            return res;
        };
    }

    // internal storage for locale config files
    var locales = {};
    var globalLocale;

    function normalizeLocale(key) {
        return key ? key.toLowerCase().replace('_', '-') : key;
    }

    // pick the locale from the array
    // try ['en-au', 'en-gb'] as 'en-au', 'en-gb', 'en', as in move through the list trying each
    // substring from most specific to least, but move to the next array item if it's a more specific variant than the current root
    function chooseLocale(names) {
        var i = 0, j, next, locale, split;

        while (i < names.length) {
            split = normalizeLocale(names[i]).split('-');
            j = split.length;
            next = normalizeLocale(names[i + 1]);
            next = next ? next.split('-') : null;
            while (j > 0) {
                locale = loadLocale(split.slice(0, j).join('-'));
                if (locale) {
                    return locale;
                }
                if (next && next.length >= j && compareArrays(split, next, true) >= j - 1) {
                    //the next array item is better than a shallower substring of this one
                    break;
                }
                j--;
            }
            i++;
        }
        return null;
    }

    function loadLocale(name) {
        var oldLocale = null;
        // TODO: Find a better way to register and load all the locales in Node
        if (!locales[name] && (typeof module !== 'undefined') &&
                module && module.exports) {
            try {
                oldLocale = globalLocale._abbr;
                require('./locale/' + name);
                // because defineLocale currently also sets the global locale, we
                // want to undo that for lazy loaded locales
                locale_locales__getSetGlobalLocale(oldLocale);
            } catch (e) { }
        }
        return locales[name];
    }

    // This function will load locale and then set the global locale.  If
    // no arguments are passed in, it will simply return the current global
    // locale key.
    function locale_locales__getSetGlobalLocale (key, values) {
        var data;
        if (key) {
            if (isUndefined(values)) {
                data = locale_locales__getLocale(key);
            }
            else {
                data = defineLocale(key, values);
            }

            if (data) {
                // moment.duration._locale = moment._locale = data;
                globalLocale = data;
            }
        }

        return globalLocale._abbr;
    }

    function defineLocale (name, config) {
        if (config !== null) {
            config.abbr = name;
            if (locales[name] != null) {
                deprecateSimple('defineLocaleOverride',
                        'use moment.updateLocale(localeName, config) to change ' +
                        'an existing locale. moment.defineLocale(localeName, ' +
                        'config) should only be used for creating a new locale');
                config = mergeConfigs(locales[name]._config, config);
            } else if (config.parentLocale != null) {
                if (locales[config.parentLocale] != null) {
                    config = mergeConfigs(locales[config.parentLocale]._config, config);
                } else {
                    // treat as if there is no base config
                    deprecateSimple('parentLocaleUndefined',
                            'specified parentLocale is not defined yet');
                }
            }
            locales[name] = new Locale(config);

            // backwards compat for now: also set the locale
            locale_locales__getSetGlobalLocale(name);

            return locales[name];
        } else {
            // useful for testing
            delete locales[name];
            return null;
        }
    }

    function updateLocale(name, config) {
        if (config != null) {
            var locale;
            if (locales[name] != null) {
                config = mergeConfigs(locales[name]._config, config);
            }
            locale = new Locale(config);
            locale.parentLocale = locales[name];
            locales[name] = locale;

            // backwards compat for now: also set the locale
            locale_locales__getSetGlobalLocale(name);
        } else {
            // pass null for config to unupdate, useful for tests
            if (locales[name] != null) {
                if (locales[name].parentLocale != null) {
                    locales[name] = locales[name].parentLocale;
                } else if (locales[name] != null) {
                    delete locales[name];
                }
            }
        }
        return locales[name];
    }

    // returns locale data
    function locale_locales__getLocale (key) {
        var locale;

        if (key && key._locale && key._locale._abbr) {
            key = key._locale._abbr;
        }

        if (!key) {
            return globalLocale;
        }

        if (!isArray(key)) {
            //short-circuit everything else
            locale = loadLocale(key);
            if (locale) {
                return locale;
            }
            key = [key];
        }

        return chooseLocale(key);
    }

    function locale_locales__listLocales() {
        return keys(locales);
    }

    var aliases = {};

    function addUnitAlias (unit, shorthand) {
        var lowerCase = unit.toLowerCase();
        aliases[lowerCase] = aliases[lowerCase + 's'] = aliases[shorthand] = unit;
    }

    function normalizeUnits(units) {
        return typeof units === 'string' ? aliases[units] || aliases[units.toLowerCase()] : undefined;
    }

    function normalizeObjectUnits(inputObject) {
        var normalizedInput = {},
            normalizedProp,
            prop;

        for (prop in inputObject) {
            if (hasOwnProp(inputObject, prop)) {
                normalizedProp = normalizeUnits(prop);
                if (normalizedProp) {
                    normalizedInput[normalizedProp] = inputObject[prop];
                }
            }
        }

        return normalizedInput;
    }

    function makeGetSet (unit, keepTime) {
        return function (value) {
            if (value != null) {
                get_set__set(this, unit, value);
                utils_hooks__hooks.updateOffset(this, keepTime);
                return this;
            } else {
                return get_set__get(this, unit);
            }
        };
    }

    function get_set__get (mom, unit) {
        return mom.isValid() ?
            mom._d['get' + (mom._isUTC ? 'UTC' : '') + unit]() : NaN;
    }

    function get_set__set (mom, unit, value) {
        if (mom.isValid()) {
            mom._d['set' + (mom._isUTC ? 'UTC' : '') + unit](value);
        }
    }

    // MOMENTS

    function getSet (units, value) {
        var unit;
        if (typeof units === 'object') {
            for (unit in units) {
                this.set(unit, units[unit]);
            }
        } else {
            units = normalizeUnits(units);
            if (isFunction(this[units])) {
                return this[units](value);
            }
        }
        return this;
    }

    function zeroFill(number, targetLength, forceSign) {
        var absNumber = '' + Math.abs(number),
            zerosToFill = targetLength - absNumber.length,
            sign = number >= 0;
        return (sign ? (forceSign ? '+' : '') : '-') +
            Math.pow(10, Math.max(0, zerosToFill)).toString().substr(1) + absNumber;
    }

    var formattingTokens = /(\[[^\[]*\])|(\\)?([Hh]mm(ss)?|Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Qo?|YYYYYY|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|kk?|mm?|ss?|S{1,9}|x|X|zz?|ZZ?|.)/g;

    var localFormattingTokens = /(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g;

    var formatFunctions = {};

    var formatTokenFunctions = {};

    // token:    'M'
    // padded:   ['MM', 2]
    // ordinal:  'Mo'
    // callback: function () { this.month() + 1 }
    function addFormatToken (token, padded, ordinal, callback) {
        var func = callback;
        if (typeof callback === 'string') {
            func = function () {
                return this[callback]();
            };
        }
        if (token) {
            formatTokenFunctions[token] = func;
        }
        if (padded) {
            formatTokenFunctions[padded[0]] = function () {
                return zeroFill(func.apply(this, arguments), padded[1], padded[2]);
            };
        }
        if (ordinal) {
            formatTokenFunctions[ordinal] = function () {
                return this.localeData().ordinal(func.apply(this, arguments), token);
            };
        }
    }

    function removeFormattingTokens(input) {
        if (input.match(/\[[\s\S]/)) {
            return input.replace(/^\[|\]$/g, '');
        }
        return input.replace(/\\/g, '');
    }

    function makeFormatFunction(format) {
        var array = format.match(formattingTokens), i, length;

        for (i = 0, length = array.length; i < length; i++) {
            if (formatTokenFunctions[array[i]]) {
                array[i] = formatTokenFunctions[array[i]];
            } else {
                array[i] = removeFormattingTokens(array[i]);
            }
        }

        return function (mom) {
            var output = '', i;
            for (i = 0; i < length; i++) {
                output += array[i] instanceof Function ? array[i].call(mom, format) : array[i];
            }
            return output;
        };
    }

    // format date using native date object
    function formatMoment(m, format) {
        if (!m.isValid()) {
            return m.localeData().invalidDate();
        }

        format = expandFormat(format, m.localeData());
        formatFunctions[format] = formatFunctions[format] || makeFormatFunction(format);

        return formatFunctions[format](m);
    }

    function expandFormat(format, locale) {
        var i = 5;

        function replaceLongDateFormatTokens(input) {
            return locale.longDateFormat(input) || input;
        }

        localFormattingTokens.lastIndex = 0;
        while (i >= 0 && localFormattingTokens.test(format)) {
            format = format.replace(localFormattingTokens, replaceLongDateFormatTokens);
            localFormattingTokens.lastIndex = 0;
            i -= 1;
        }

        return format;
    }

    var match1         = /\d/;            //       0 - 9
    var match2         = /\d\d/;          //      00 - 99
    var match3         = /\d{3}/;         //     000 - 999
    var match4         = /\d{4}/;         //    0000 - 9999
    var match6         = /[+-]?\d{6}/;    // -999999 - 999999
    var match1to2      = /\d\d?/;         //       0 - 99
    var match3to4      = /\d\d\d\d?/;     //     999 - 9999
    var match5to6      = /\d\d\d\d\d\d?/; //   99999 - 999999
    var match1to3      = /\d{1,3}/;       //       0 - 999
    var match1to4      = /\d{1,4}/;       //       0 - 9999
    var match1to6      = /[+-]?\d{1,6}/;  // -999999 - 999999

    var matchUnsigned  = /\d+/;           //       0 - inf
    var matchSigned    = /[+-]?\d+/;      //    -inf - inf

    var matchOffset    = /Z|[+-]\d\d:?\d\d/gi; // +00:00 -00:00 +0000 -0000 or Z
    var matchShortOffset = /Z|[+-]\d\d(?::?\d\d)?/gi; // +00 -00 +00:00 -00:00 +0000 -0000 or Z

    var matchTimestamp = /[+-]?\d+(\.\d{1,3})?/; // 123456789 123456789.123

    // any word (or two) characters or numbers including two/three word month in arabic.
    // includes scottish gaelic two word and hyphenated months
    var matchWord = /[0-9]*['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+|[\u0600-\u06FF\/]+(\s*?[\u0600-\u06FF]+){1,2}/i;


    var regexes = {};

    function addRegexToken (token, regex, strictRegex) {
        regexes[token] = isFunction(regex) ? regex : function (isStrict, localeData) {
            return (isStrict && strictRegex) ? strictRegex : regex;
        };
    }

    function getParseRegexForToken (token, config) {
        if (!hasOwnProp(regexes, token)) {
            return new RegExp(unescapeFormat(token));
        }

        return regexes[token](config._strict, config._locale);
    }

    // Code from http://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript
    function unescapeFormat(s) {
        return regexEscape(s.replace('\\', '').replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g, function (matched, p1, p2, p3, p4) {
            return p1 || p2 || p3 || p4;
        }));
    }

    function regexEscape(s) {
        return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    var tokens = {};

    function addParseToken (token, callback) {
        var i, func = callback;
        if (typeof token === 'string') {
            token = [token];
        }
        if (typeof callback === 'number') {
            func = function (input, array) {
                array[callback] = toInt(input);
            };
        }
        for (i = 0; i < token.length; i++) {
            tokens[token[i]] = func;
        }
    }

    function addWeekParseToken (token, callback) {
        addParseToken(token, function (input, array, config, token) {
            config._w = config._w || {};
            callback(input, config._w, config, token);
        });
    }

    function addTimeToArrayFromToken(token, input, config) {
        if (input != null && hasOwnProp(tokens, token)) {
            tokens[token](input, config._a, config, token);
        }
    }

    var YEAR = 0;
    var MONTH = 1;
    var DATE = 2;
    var HOUR = 3;
    var MINUTE = 4;
    var SECOND = 5;
    var MILLISECOND = 6;
    var WEEK = 7;
    var WEEKDAY = 8;

    var indexOf;

    if (Array.prototype.indexOf) {
        indexOf = Array.prototype.indexOf;
    } else {
        indexOf = function (o) {
            // I know
            var i;
            for (i = 0; i < this.length; ++i) {
                if (this[i] === o) {
                    return i;
                }
            }
            return -1;
        };
    }

    function daysInMonth(year, month) {
        return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    }

    // FORMATTING

    addFormatToken('M', ['MM', 2], 'Mo', function () {
        return this.month() + 1;
    });

    addFormatToken('MMM', 0, 0, function (format) {
        return this.localeData().monthsShort(this, format);
    });

    addFormatToken('MMMM', 0, 0, function (format) {
        return this.localeData().months(this, format);
    });

    // ALIASES

    addUnitAlias('month', 'M');

    // PARSING

    addRegexToken('M',    match1to2);
    addRegexToken('MM',   match1to2, match2);
    addRegexToken('MMM',  function (isStrict, locale) {
        return locale.monthsShortRegex(isStrict);
    });
    addRegexToken('MMMM', function (isStrict, locale) {
        return locale.monthsRegex(isStrict);
    });

    addParseToken(['M', 'MM'], function (input, array) {
        array[MONTH] = toInt(input) - 1;
    });

    addParseToken(['MMM', 'MMMM'], function (input, array, config, token) {
        var month = config._locale.monthsParse(input, token, config._strict);
        // if we didn't find a month name, mark the date as invalid.
        if (month != null) {
            array[MONTH] = month;
        } else {
            getParsingFlags(config).invalidMonth = input;
        }
    });

    // LOCALES

    var MONTHS_IN_FORMAT = /D[oD]?(\[[^\[\]]*\]|\s+)+MMMM?/;
    var defaultLocaleMonths = 'January_February_March_April_May_June_July_August_September_October_November_December'.split('_');
    function localeMonths (m, format) {
        return isArray(this._months) ? this._months[m.month()] :
            this._months[MONTHS_IN_FORMAT.test(format) ? 'format' : 'standalone'][m.month()];
    }

    var defaultLocaleMonthsShort = 'Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec'.split('_');
    function localeMonthsShort (m, format) {
        return isArray(this._monthsShort) ? this._monthsShort[m.month()] :
            this._monthsShort[MONTHS_IN_FORMAT.test(format) ? 'format' : 'standalone'][m.month()];
    }

    function units_month__handleStrictParse(monthName, format, strict) {
        var i, ii, mom, llc = monthName.toLocaleLowerCase();
        if (!this._monthsParse) {
            // this is not used
            this._monthsParse = [];
            this._longMonthsParse = [];
            this._shortMonthsParse = [];
            for (i = 0; i < 12; ++i) {
                mom = create_utc__createUTC([2000, i]);
                this._shortMonthsParse[i] = this.monthsShort(mom, '').toLocaleLowerCase();
                this._longMonthsParse[i] = this.months(mom, '').toLocaleLowerCase();
            }
        }

        if (strict) {
            if (format === 'MMM') {
                ii = indexOf.call(this._shortMonthsParse, llc);
                return ii !== -1 ? ii : null;
            } else {
                ii = indexOf.call(this._longMonthsParse, llc);
                return ii !== -1 ? ii : null;
            }
        } else {
            if (format === 'MMM') {
                ii = indexOf.call(this._shortMonthsParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._longMonthsParse, llc);
                return ii !== -1 ? ii : null;
            } else {
                ii = indexOf.call(this._longMonthsParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._shortMonthsParse, llc);
                return ii !== -1 ? ii : null;
            }
        }
    }

    function localeMonthsParse (monthName, format, strict) {
        var i, mom, regex;

        if (this._monthsParseExact) {
            return units_month__handleStrictParse.call(this, monthName, format, strict);
        }

        if (!this._monthsParse) {
            this._monthsParse = [];
            this._longMonthsParse = [];
            this._shortMonthsParse = [];
        }

        // TODO: add sorting
        // Sorting makes sure if one month (or abbr) is a prefix of another
        // see sorting in computeMonthsParse
        for (i = 0; i < 12; i++) {
            // make the regex if we don't have it already
            mom = create_utc__createUTC([2000, i]);
            if (strict && !this._longMonthsParse[i]) {
                this._longMonthsParse[i] = new RegExp('^' + this.months(mom, '').replace('.', '') + '$', 'i');
                this._shortMonthsParse[i] = new RegExp('^' + this.monthsShort(mom, '').replace('.', '') + '$', 'i');
            }
            if (!strict && !this._monthsParse[i]) {
                regex = '^' + this.months(mom, '') + '|^' + this.monthsShort(mom, '');
                this._monthsParse[i] = new RegExp(regex.replace('.', ''), 'i');
            }
            // test the regex
            if (strict && format === 'MMMM' && this._longMonthsParse[i].test(monthName)) {
                return i;
            } else if (strict && format === 'MMM' && this._shortMonthsParse[i].test(monthName)) {
                return i;
            } else if (!strict && this._monthsParse[i].test(monthName)) {
                return i;
            }
        }
    }

    // MOMENTS

    function setMonth (mom, value) {
        var dayOfMonth;

        if (!mom.isValid()) {
            // No op
            return mom;
        }

        if (typeof value === 'string') {
            if (/^\d+$/.test(value)) {
                value = toInt(value);
            } else {
                value = mom.localeData().monthsParse(value);
                // TODO: Another silent failure?
                if (typeof value !== 'number') {
                    return mom;
                }
            }
        }

        dayOfMonth = Math.min(mom.date(), daysInMonth(mom.year(), value));
        mom._d['set' + (mom._isUTC ? 'UTC' : '') + 'Month'](value, dayOfMonth);
        return mom;
    }

    function getSetMonth (value) {
        if (value != null) {
            setMonth(this, value);
            utils_hooks__hooks.updateOffset(this, true);
            return this;
        } else {
            return get_set__get(this, 'Month');
        }
    }

    function getDaysInMonth () {
        return daysInMonth(this.year(), this.month());
    }

    var defaultMonthsShortRegex = matchWord;
    function monthsShortRegex (isStrict) {
        if (this._monthsParseExact) {
            if (!hasOwnProp(this, '_monthsRegex')) {
                computeMonthsParse.call(this);
            }
            if (isStrict) {
                return this._monthsShortStrictRegex;
            } else {
                return this._monthsShortRegex;
            }
        } else {
            return this._monthsShortStrictRegex && isStrict ?
                this._monthsShortStrictRegex : this._monthsShortRegex;
        }
    }

    var defaultMonthsRegex = matchWord;
    function monthsRegex (isStrict) {
        if (this._monthsParseExact) {
            if (!hasOwnProp(this, '_monthsRegex')) {
                computeMonthsParse.call(this);
            }
            if (isStrict) {
                return this._monthsStrictRegex;
            } else {
                return this._monthsRegex;
            }
        } else {
            return this._monthsStrictRegex && isStrict ?
                this._monthsStrictRegex : this._monthsRegex;
        }
    }

    function computeMonthsParse () {
        function cmpLenRev(a, b) {
            return b.length - a.length;
        }

        var shortPieces = [], longPieces = [], mixedPieces = [],
            i, mom;
        for (i = 0; i < 12; i++) {
            // make the regex if we don't have it already
            mom = create_utc__createUTC([2000, i]);
            shortPieces.push(this.monthsShort(mom, ''));
            longPieces.push(this.months(mom, ''));
            mixedPieces.push(this.months(mom, ''));
            mixedPieces.push(this.monthsShort(mom, ''));
        }
        // Sorting makes sure if one month (or abbr) is a prefix of another it
        // will match the longer piece.
        shortPieces.sort(cmpLenRev);
        longPieces.sort(cmpLenRev);
        mixedPieces.sort(cmpLenRev);
        for (i = 0; i < 12; i++) {
            shortPieces[i] = regexEscape(shortPieces[i]);
            longPieces[i] = regexEscape(longPieces[i]);
            mixedPieces[i] = regexEscape(mixedPieces[i]);
        }

        this._monthsRegex = new RegExp('^(' + mixedPieces.join('|') + ')', 'i');
        this._monthsShortRegex = this._monthsRegex;
        this._monthsStrictRegex = new RegExp('^(' + longPieces.join('|') + ')', 'i');
        this._monthsShortStrictRegex = new RegExp('^(' + shortPieces.join('|') + ')', 'i');
    }

    function checkOverflow (m) {
        var overflow;
        var a = m._a;

        if (a && getParsingFlags(m).overflow === -2) {
            overflow =
                a[MONTH]       < 0 || a[MONTH]       > 11  ? MONTH :
                a[DATE]        < 1 || a[DATE]        > daysInMonth(a[YEAR], a[MONTH]) ? DATE :
                a[HOUR]        < 0 || a[HOUR]        > 24 || (a[HOUR] === 24 && (a[MINUTE] !== 0 || a[SECOND] !== 0 || a[MILLISECOND] !== 0)) ? HOUR :
                a[MINUTE]      < 0 || a[MINUTE]      > 59  ? MINUTE :
                a[SECOND]      < 0 || a[SECOND]      > 59  ? SECOND :
                a[MILLISECOND] < 0 || a[MILLISECOND] > 999 ? MILLISECOND :
                -1;

            if (getParsingFlags(m)._overflowDayOfYear && (overflow < YEAR || overflow > DATE)) {
                overflow = DATE;
            }
            if (getParsingFlags(m)._overflowWeeks && overflow === -1) {
                overflow = WEEK;
            }
            if (getParsingFlags(m)._overflowWeekday && overflow === -1) {
                overflow = WEEKDAY;
            }

            getParsingFlags(m).overflow = overflow;
        }

        return m;
    }

    // iso 8601 regex
    // 0000-00-00 0000-W00 or 0000-W00-0 + T + 00 or 00:00 or 00:00:00 or 00:00:00.000 + +00:00 or +0000 or +00)
    var extendedIsoRegex = /^\s*((?:[+-]\d{6}|\d{4})-(?:\d\d-\d\d|W\d\d-\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?::\d\d(?::\d\d(?:[.,]\d+)?)?)?)([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?/;
    var basicIsoRegex = /^\s*((?:[+-]\d{6}|\d{4})(?:\d\d\d\d|W\d\d\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?:\d\d(?:\d\d(?:[.,]\d+)?)?)?)([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?/;

    var tzRegex = /Z|[+-]\d\d(?::?\d\d)?/;

    var isoDates = [
        ['YYYYYY-MM-DD', /[+-]\d{6}-\d\d-\d\d/],
        ['YYYY-MM-DD', /\d{4}-\d\d-\d\d/],
        ['GGGG-[W]WW-E', /\d{4}-W\d\d-\d/],
        ['GGGG-[W]WW', /\d{4}-W\d\d/, false],
        ['YYYY-DDD', /\d{4}-\d{3}/],
        ['YYYY-MM', /\d{4}-\d\d/, false],
        ['YYYYYYMMDD', /[+-]\d{10}/],
        ['YYYYMMDD', /\d{8}/],
        // YYYYMM is NOT allowed by the standard
        ['GGGG[W]WWE', /\d{4}W\d{3}/],
        ['GGGG[W]WW', /\d{4}W\d{2}/, false],
        ['YYYYDDD', /\d{7}/]
    ];

    // iso time formats and regexes
    var isoTimes = [
        ['HH:mm:ss.SSSS', /\d\d:\d\d:\d\d\.\d+/],
        ['HH:mm:ss,SSSS', /\d\d:\d\d:\d\d,\d+/],
        ['HH:mm:ss', /\d\d:\d\d:\d\d/],
        ['HH:mm', /\d\d:\d\d/],
        ['HHmmss.SSSS', /\d\d\d\d\d\d\.\d+/],
        ['HHmmss,SSSS', /\d\d\d\d\d\d,\d+/],
        ['HHmmss', /\d\d\d\d\d\d/],
        ['HHmm', /\d\d\d\d/],
        ['HH', /\d\d/]
    ];

    var aspNetJsonRegex = /^\/?Date\((\-?\d+)/i;

    // date from iso format
    function configFromISO(config) {
        var i, l,
            string = config._i,
            match = extendedIsoRegex.exec(string) || basicIsoRegex.exec(string),
            allowTime, dateFormat, timeFormat, tzFormat;

        if (match) {
            getParsingFlags(config).iso = true;

            for (i = 0, l = isoDates.length; i < l; i++) {
                if (isoDates[i][1].exec(match[1])) {
                    dateFormat = isoDates[i][0];
                    allowTime = isoDates[i][2] !== false;
                    break;
                }
            }
            if (dateFormat == null) {
                config._isValid = false;
                return;
            }
            if (match[3]) {
                for (i = 0, l = isoTimes.length; i < l; i++) {
                    if (isoTimes[i][1].exec(match[3])) {
                        // match[2] should be 'T' or space
                        timeFormat = (match[2] || ' ') + isoTimes[i][0];
                        break;
                    }
                }
                if (timeFormat == null) {
                    config._isValid = false;
                    return;
                }
            }
            if (!allowTime && timeFormat != null) {
                config._isValid = false;
                return;
            }
            if (match[4]) {
                if (tzRegex.exec(match[4])) {
                    tzFormat = 'Z';
                } else {
                    config._isValid = false;
                    return;
                }
            }
            config._f = dateFormat + (timeFormat || '') + (tzFormat || '');
            configFromStringAndFormat(config);
        } else {
            config._isValid = false;
        }
    }

    // date from iso format or fallback
    function configFromString(config) {
        var matched = aspNetJsonRegex.exec(config._i);

        if (matched !== null) {
            config._d = new Date(+matched[1]);
            return;
        }

        configFromISO(config);
        if (config._isValid === false) {
            delete config._isValid;
            utils_hooks__hooks.createFromInputFallback(config);
        }
    }

    utils_hooks__hooks.createFromInputFallback = deprecate(
        'moment construction falls back to js Date. This is ' +
        'discouraged and will be removed in upcoming major ' +
        'release. Please refer to ' +
        'https://github.com/moment/moment/issues/1407 for more info.',
        function (config) {
            config._d = new Date(config._i + (config._useUTC ? ' UTC' : ''));
        }
    );

    function createDate (y, m, d, h, M, s, ms) {
        //can't just apply() to create a date:
        //http://stackoverflow.com/questions/181348/instantiating-a-javascript-object-by-calling-prototype-constructor-apply
        var date = new Date(y, m, d, h, M, s, ms);

        //the date constructor remaps years 0-99 to 1900-1999
        if (y < 100 && y >= 0 && isFinite(date.getFullYear())) {
            date.setFullYear(y);
        }
        return date;
    }

    function createUTCDate (y) {
        var date = new Date(Date.UTC.apply(null, arguments));

        //the Date.UTC function remaps years 0-99 to 1900-1999
        if (y < 100 && y >= 0 && isFinite(date.getUTCFullYear())) {
            date.setUTCFullYear(y);
        }
        return date;
    }

    // FORMATTING

    addFormatToken('Y', 0, 0, function () {
        var y = this.year();
        return y <= 9999 ? '' + y : '+' + y;
    });

    addFormatToken(0, ['YY', 2], 0, function () {
        return this.year() % 100;
    });

    addFormatToken(0, ['YYYY',   4],       0, 'year');
    addFormatToken(0, ['YYYYY',  5],       0, 'year');
    addFormatToken(0, ['YYYYYY', 6, true], 0, 'year');

    // ALIASES

    addUnitAlias('year', 'y');

    // PARSING

    addRegexToken('Y',      matchSigned);
    addRegexToken('YY',     match1to2, match2);
    addRegexToken('YYYY',   match1to4, match4);
    addRegexToken('YYYYY',  match1to6, match6);
    addRegexToken('YYYYYY', match1to6, match6);

    addParseToken(['YYYYY', 'YYYYYY'], YEAR);
    addParseToken('YYYY', function (input, array) {
        array[YEAR] = input.length === 2 ? utils_hooks__hooks.parseTwoDigitYear(input) : toInt(input);
    });
    addParseToken('YY', function (input, array) {
        array[YEAR] = utils_hooks__hooks.parseTwoDigitYear(input);
    });
    addParseToken('Y', function (input, array) {
        array[YEAR] = parseInt(input, 10);
    });

    // HELPERS

    function daysInYear(year) {
        return isLeapYear(year) ? 366 : 365;
    }

    function isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    }

    // HOOKS

    utils_hooks__hooks.parseTwoDigitYear = function (input) {
        return toInt(input) + (toInt(input) > 68 ? 1900 : 2000);
    };

    // MOMENTS

    var getSetYear = makeGetSet('FullYear', true);

    function getIsLeapYear () {
        return isLeapYear(this.year());
    }

    // start-of-first-week - start-of-year
    function firstWeekOffset(year, dow, doy) {
        var // first-week day -- which january is always in the first week (4 for iso, 1 for other)
            fwd = 7 + dow - doy,
            // first-week day local weekday -- which local weekday is fwd
            fwdlw = (7 + createUTCDate(year, 0, fwd).getUTCDay() - dow) % 7;

        return -fwdlw + fwd - 1;
    }

    //http://en.wikipedia.org/wiki/ISO_week_date#Calculating_a_date_given_the_year.2C_week_number_and_weekday
    function dayOfYearFromWeeks(year, week, weekday, dow, doy) {
        var localWeekday = (7 + weekday - dow) % 7,
            weekOffset = firstWeekOffset(year, dow, doy),
            dayOfYear = 1 + 7 * (week - 1) + localWeekday + weekOffset,
            resYear, resDayOfYear;

        if (dayOfYear <= 0) {
            resYear = year - 1;
            resDayOfYear = daysInYear(resYear) + dayOfYear;
        } else if (dayOfYear > daysInYear(year)) {
            resYear = year + 1;
            resDayOfYear = dayOfYear - daysInYear(year);
        } else {
            resYear = year;
            resDayOfYear = dayOfYear;
        }

        return {
            year: resYear,
            dayOfYear: resDayOfYear
        };
    }

    function weekOfYear(mom, dow, doy) {
        var weekOffset = firstWeekOffset(mom.year(), dow, doy),
            week = Math.floor((mom.dayOfYear() - weekOffset - 1) / 7) + 1,
            resWeek, resYear;

        if (week < 1) {
            resYear = mom.year() - 1;
            resWeek = week + weeksInYear(resYear, dow, doy);
        } else if (week > weeksInYear(mom.year(), dow, doy)) {
            resWeek = week - weeksInYear(mom.year(), dow, doy);
            resYear = mom.year() + 1;
        } else {
            resYear = mom.year();
            resWeek = week;
        }

        return {
            week: resWeek,
            year: resYear
        };
    }

    function weeksInYear(year, dow, doy) {
        var weekOffset = firstWeekOffset(year, dow, doy),
            weekOffsetNext = firstWeekOffset(year + 1, dow, doy);
        return (daysInYear(year) - weekOffset + weekOffsetNext) / 7;
    }

    // Pick the first defined of two or three arguments.
    function defaults(a, b, c) {
        if (a != null) {
            return a;
        }
        if (b != null) {
            return b;
        }
        return c;
    }

    function currentDateArray(config) {
        // hooks is actually the exported moment object
        var nowValue = new Date(utils_hooks__hooks.now());
        if (config._useUTC) {
            return [nowValue.getUTCFullYear(), nowValue.getUTCMonth(), nowValue.getUTCDate()];
        }
        return [nowValue.getFullYear(), nowValue.getMonth(), nowValue.getDate()];
    }

    // convert an array to a date.
    // the array should mirror the parameters below
    // note: all values past the year are optional and will default to the lowest possible value.
    // [year, month, day , hour, minute, second, millisecond]
    function configFromArray (config) {
        var i, date, input = [], currentDate, yearToUse;

        if (config._d) {
            return;
        }

        currentDate = currentDateArray(config);

        //compute day of the year from weeks and weekdays
        if (config._w && config._a[DATE] == null && config._a[MONTH] == null) {
            dayOfYearFromWeekInfo(config);
        }

        //if the day of the year is set, figure out what it is
        if (config._dayOfYear) {
            yearToUse = defaults(config._a[YEAR], currentDate[YEAR]);

            if (config._dayOfYear > daysInYear(yearToUse)) {
                getParsingFlags(config)._overflowDayOfYear = true;
            }

            date = createUTCDate(yearToUse, 0, config._dayOfYear);
            config._a[MONTH] = date.getUTCMonth();
            config._a[DATE] = date.getUTCDate();
        }

        // Default to current date.
        // * if no year, month, day of month are given, default to today
        // * if day of month is given, default month and year
        // * if month is given, default only year
        // * if year is given, don't default anything
        for (i = 0; i < 3 && config._a[i] == null; ++i) {
            config._a[i] = input[i] = currentDate[i];
        }

        // Zero out whatever was not defaulted, including time
        for (; i < 7; i++) {
            config._a[i] = input[i] = (config._a[i] == null) ? (i === 2 ? 1 : 0) : config._a[i];
        }

        // Check for 24:00:00.000
        if (config._a[HOUR] === 24 &&
                config._a[MINUTE] === 0 &&
                config._a[SECOND] === 0 &&
                config._a[MILLISECOND] === 0) {
            config._nextDay = true;
            config._a[HOUR] = 0;
        }

        config._d = (config._useUTC ? createUTCDate : createDate).apply(null, input);
        // Apply timezone offset from input. The actual utcOffset can be changed
        // with parseZone.
        if (config._tzm != null) {
            config._d.setUTCMinutes(config._d.getUTCMinutes() - config._tzm);
        }

        if (config._nextDay) {
            config._a[HOUR] = 24;
        }
    }

    function dayOfYearFromWeekInfo(config) {
        var w, weekYear, week, weekday, dow, doy, temp, weekdayOverflow;

        w = config._w;
        if (w.GG != null || w.W != null || w.E != null) {
            dow = 1;
            doy = 4;

            // TODO: We need to take the current isoWeekYear, but that depends on
            // how we interpret now (local, utc, fixed offset). So create
            // a now version of current config (take local/utc/offset flags, and
            // create now).
            weekYear = defaults(w.GG, config._a[YEAR], weekOfYear(local__createLocal(), 1, 4).year);
            week = defaults(w.W, 1);
            weekday = defaults(w.E, 1);
            if (weekday < 1 || weekday > 7) {
                weekdayOverflow = true;
            }
        } else {
            dow = config._locale._week.dow;
            doy = config._locale._week.doy;

            weekYear = defaults(w.gg, config._a[YEAR], weekOfYear(local__createLocal(), dow, doy).year);
            week = defaults(w.w, 1);

            if (w.d != null) {
                // weekday -- low day numbers are considered next week
                weekday = w.d;
                if (weekday < 0 || weekday > 6) {
                    weekdayOverflow = true;
                }
            } else if (w.e != null) {
                // local weekday -- counting starts from begining of week
                weekday = w.e + dow;
                if (w.e < 0 || w.e > 6) {
                    weekdayOverflow = true;
                }
            } else {
                // default to begining of week
                weekday = dow;
            }
        }
        if (week < 1 || week > weeksInYear(weekYear, dow, doy)) {
            getParsingFlags(config)._overflowWeeks = true;
        } else if (weekdayOverflow != null) {
            getParsingFlags(config)._overflowWeekday = true;
        } else {
            temp = dayOfYearFromWeeks(weekYear, week, weekday, dow, doy);
            config._a[YEAR] = temp.year;
            config._dayOfYear = temp.dayOfYear;
        }
    }

    // constant that refers to the ISO standard
    utils_hooks__hooks.ISO_8601 = function () {};

    // date from string and format string
    function configFromStringAndFormat(config) {
        // TODO: Move this to another part of the creation flow to prevent circular deps
        if (config._f === utils_hooks__hooks.ISO_8601) {
            configFromISO(config);
            return;
        }

        config._a = [];
        getParsingFlags(config).empty = true;

        // This array is used to make a Date, either with `new Date` or `Date.UTC`
        var string = '' + config._i,
            i, parsedInput, tokens, token, skipped,
            stringLength = string.length,
            totalParsedInputLength = 0;

        tokens = expandFormat(config._f, config._locale).match(formattingTokens) || [];

        for (i = 0; i < tokens.length; i++) {
            token = tokens[i];
            parsedInput = (string.match(getParseRegexForToken(token, config)) || [])[0];
            // console.log('token', token, 'parsedInput', parsedInput,
            //         'regex', getParseRegexForToken(token, config));
            if (parsedInput) {
                skipped = string.substr(0, string.indexOf(parsedInput));
                if (skipped.length > 0) {
                    getParsingFlags(config).unusedInput.push(skipped);
                }
                string = string.slice(string.indexOf(parsedInput) + parsedInput.length);
                totalParsedInputLength += parsedInput.length;
            }
            // don't parse if it's not a known token
            if (formatTokenFunctions[token]) {
                if (parsedInput) {
                    getParsingFlags(config).empty = false;
                }
                else {
                    getParsingFlags(config).unusedTokens.push(token);
                }
                addTimeToArrayFromToken(token, parsedInput, config);
            }
            else if (config._strict && !parsedInput) {
                getParsingFlags(config).unusedTokens.push(token);
            }
        }

        // add remaining unparsed input length to the string
        getParsingFlags(config).charsLeftOver = stringLength - totalParsedInputLength;
        if (string.length > 0) {
            getParsingFlags(config).unusedInput.push(string);
        }

        // clear _12h flag if hour is <= 12
        if (getParsingFlags(config).bigHour === true &&
                config._a[HOUR] <= 12 &&
                config._a[HOUR] > 0) {
            getParsingFlags(config).bigHour = undefined;
        }

        getParsingFlags(config).parsedDateParts = config._a.slice(0);
        getParsingFlags(config).meridiem = config._meridiem;
        // handle meridiem
        config._a[HOUR] = meridiemFixWrap(config._locale, config._a[HOUR], config._meridiem);

        configFromArray(config);
        checkOverflow(config);
    }


    function meridiemFixWrap (locale, hour, meridiem) {
        var isPm;

        if (meridiem == null) {
            // nothing to do
            return hour;
        }
        if (locale.meridiemHour != null) {
            return locale.meridiemHour(hour, meridiem);
        } else if (locale.isPM != null) {
            // Fallback
            isPm = locale.isPM(meridiem);
            if (isPm && hour < 12) {
                hour += 12;
            }
            if (!isPm && hour === 12) {
                hour = 0;
            }
            return hour;
        } else {
            // this is not supposed to happen
            return hour;
        }
    }

    // date from string and array of format strings
    function configFromStringAndArray(config) {
        var tempConfig,
            bestMoment,

            scoreToBeat,
            i,
            currentScore;

        if (config._f.length === 0) {
            getParsingFlags(config).invalidFormat = true;
            config._d = new Date(NaN);
            return;
        }

        for (i = 0; i < config._f.length; i++) {
            currentScore = 0;
            tempConfig = copyConfig({}, config);
            if (config._useUTC != null) {
                tempConfig._useUTC = config._useUTC;
            }
            tempConfig._f = config._f[i];
            configFromStringAndFormat(tempConfig);

            if (!valid__isValid(tempConfig)) {
                continue;
            }

            // if there is any input that was not parsed add a penalty for that format
            currentScore += getParsingFlags(tempConfig).charsLeftOver;

            //or tokens
            currentScore += getParsingFlags(tempConfig).unusedTokens.length * 10;

            getParsingFlags(tempConfig).score = currentScore;

            if (scoreToBeat == null || currentScore < scoreToBeat) {
                scoreToBeat = currentScore;
                bestMoment = tempConfig;
            }
        }

        extend(config, bestMoment || tempConfig);
    }

    function configFromObject(config) {
        if (config._d) {
            return;
        }

        var i = normalizeObjectUnits(config._i);
        config._a = map([i.year, i.month, i.day || i.date, i.hour, i.minute, i.second, i.millisecond], function (obj) {
            return obj && parseInt(obj, 10);
        });

        configFromArray(config);
    }

    function createFromConfig (config) {
        var res = new Moment(checkOverflow(prepareConfig(config)));
        if (res._nextDay) {
            // Adding is smart enough around DST
            res.add(1, 'd');
            res._nextDay = undefined;
        }

        return res;
    }

    function prepareConfig (config) {
        var input = config._i,
            format = config._f;

        config._locale = config._locale || locale_locales__getLocale(config._l);

        if (input === null || (format === undefined && input === '')) {
            return valid__createInvalid({nullInput: true});
        }

        if (typeof input === 'string') {
            config._i = input = config._locale.preparse(input);
        }

        if (isMoment(input)) {
            return new Moment(checkOverflow(input));
        } else if (isArray(format)) {
            configFromStringAndArray(config);
        } else if (format) {
            configFromStringAndFormat(config);
        } else if (isDate(input)) {
            config._d = input;
        } else {
            configFromInput(config);
        }

        if (!valid__isValid(config)) {
            config._d = null;
        }

        return config;
    }

    function configFromInput(config) {
        var input = config._i;
        if (input === undefined) {
            config._d = new Date(utils_hooks__hooks.now());
        } else if (isDate(input)) {
            config._d = new Date(input.valueOf());
        } else if (typeof input === 'string') {
            configFromString(config);
        } else if (isArray(input)) {
            config._a = map(input.slice(0), function (obj) {
                return parseInt(obj, 10);
            });
            configFromArray(config);
        } else if (typeof(input) === 'object') {
            configFromObject(config);
        } else if (typeof(input) === 'number') {
            // from milliseconds
            config._d = new Date(input);
        } else {
            utils_hooks__hooks.createFromInputFallback(config);
        }
    }

    function createLocalOrUTC (input, format, locale, strict, isUTC) {
        var c = {};

        if (typeof(locale) === 'boolean') {
            strict = locale;
            locale = undefined;
        }
        // object construction must be done this way.
        // https://github.com/moment/moment/issues/1423
        c._isAMomentObject = true;
        c._useUTC = c._isUTC = isUTC;
        c._l = locale;
        c._i = input;
        c._f = format;
        c._strict = strict;

        return createFromConfig(c);
    }

    function local__createLocal (input, format, locale, strict) {
        return createLocalOrUTC(input, format, locale, strict, false);
    }

    var prototypeMin = deprecate(
         'moment().min is deprecated, use moment.max instead. https://github.com/moment/moment/issues/1548',
         function () {
             var other = local__createLocal.apply(null, arguments);
             if (this.isValid() && other.isValid()) {
                 return other < this ? this : other;
             } else {
                 return valid__createInvalid();
             }
         }
     );

    var prototypeMax = deprecate(
        'moment().max is deprecated, use moment.min instead. https://github.com/moment/moment/issues/1548',
        function () {
            var other = local__createLocal.apply(null, arguments);
            if (this.isValid() && other.isValid()) {
                return other > this ? this : other;
            } else {
                return valid__createInvalid();
            }
        }
    );

    // Pick a moment m from moments so that m[fn](other) is true for all
    // other. This relies on the function fn to be transitive.
    //
    // moments should either be an array of moment objects or an array, whose
    // first element is an array of moment objects.
    function pickBy(fn, moments) {
        var res, i;
        if (moments.length === 1 && isArray(moments[0])) {
            moments = moments[0];
        }
        if (!moments.length) {
            return local__createLocal();
        }
        res = moments[0];
        for (i = 1; i < moments.length; ++i) {
            if (!moments[i].isValid() || moments[i][fn](res)) {
                res = moments[i];
            }
        }
        return res;
    }

    // TODO: Use [].sort instead?
    function min () {
        var args = [].slice.call(arguments, 0);

        return pickBy('isBefore', args);
    }

    function max () {
        var args = [].slice.call(arguments, 0);

        return pickBy('isAfter', args);
    }

    var now = function () {
        return Date.now ? Date.now() : +(new Date());
    };

    function Duration (duration) {
        var normalizedInput = normalizeObjectUnits(duration),
            years = normalizedInput.year || 0,
            quarters = normalizedInput.quarter || 0,
            months = normalizedInput.month || 0,
            weeks = normalizedInput.week || 0,
            days = normalizedInput.day || 0,
            hours = normalizedInput.hour || 0,
            minutes = normalizedInput.minute || 0,
            seconds = normalizedInput.second || 0,
            milliseconds = normalizedInput.millisecond || 0;

        // representation for dateAddRemove
        this._milliseconds = +milliseconds +
            seconds * 1e3 + // 1000
            minutes * 6e4 + // 1000 * 60
            hours * 1000 * 60 * 60; //using 1000 * 60 * 60 instead of 36e5 to avoid floating point rounding errors https://github.com/moment/moment/issues/2978
        // Because of dateAddRemove treats 24 hours as different from a
        // day when working around DST, we need to store them separately
        this._days = +days +
            weeks * 7;
        // It is impossible translate months into days without knowing
        // which months you are are talking about, so we have to store
        // it separately.
        this._months = +months +
            quarters * 3 +
            years * 12;

        this._data = {};

        this._locale = locale_locales__getLocale();

        this._bubble();
    }

    function isDuration (obj) {
        return obj instanceof Duration;
    }

    // FORMATTING

    function offset (token, separator) {
        addFormatToken(token, 0, 0, function () {
            var offset = this.utcOffset();
            var sign = '+';
            if (offset < 0) {
                offset = -offset;
                sign = '-';
            }
            return sign + zeroFill(~~(offset / 60), 2) + separator + zeroFill(~~(offset) % 60, 2);
        });
    }

    offset('Z', ':');
    offset('ZZ', '');

    // PARSING

    addRegexToken('Z',  matchShortOffset);
    addRegexToken('ZZ', matchShortOffset);
    addParseToken(['Z', 'ZZ'], function (input, array, config) {
        config._useUTC = true;
        config._tzm = offsetFromString(matchShortOffset, input);
    });

    // HELPERS

    // timezone chunker
    // '+10:00' > ['10',  '00']
    // '-1530'  > ['-15', '30']
    var chunkOffset = /([\+\-]|\d\d)/gi;

    function offsetFromString(matcher, string) {
        var matches = ((string || '').match(matcher) || []);
        var chunk   = matches[matches.length - 1] || [];
        var parts   = (chunk + '').match(chunkOffset) || ['-', 0, 0];
        var minutes = +(parts[1] * 60) + toInt(parts[2]);

        return parts[0] === '+' ? minutes : -minutes;
    }

    // Return a moment from input, that is local/utc/zone equivalent to model.
    function cloneWithOffset(input, model) {
        var res, diff;
        if (model._isUTC) {
            res = model.clone();
            diff = (isMoment(input) || isDate(input) ? input.valueOf() : local__createLocal(input).valueOf()) - res.valueOf();
            // Use low-level api, because this fn is low-level api.
            res._d.setTime(res._d.valueOf() + diff);
            utils_hooks__hooks.updateOffset(res, false);
            return res;
        } else {
            return local__createLocal(input).local();
        }
    }

    function getDateOffset (m) {
        // On Firefox.24 Date#getTimezoneOffset returns a floating point.
        // https://github.com/moment/moment/pull/1871
        return -Math.round(m._d.getTimezoneOffset() / 15) * 15;
    }

    // HOOKS

    // This function will be called whenever a moment is mutated.
    // It is intended to keep the offset in sync with the timezone.
    utils_hooks__hooks.updateOffset = function () {};

    // MOMENTS

    // keepLocalTime = true means only change the timezone, without
    // affecting the local hour. So 5:31:26 +0300 --[utcOffset(2, true)]-->
    // 5:31:26 +0200 It is possible that 5:31:26 doesn't exist with offset
    // +0200, so we adjust the time as needed, to be valid.
    //
    // Keeping the time actually adds/subtracts (one hour)
    // from the actual represented time. That is why we call updateOffset
    // a second time. In case it wants us to change the offset again
    // _changeInProgress == true case, then we have to adjust, because
    // there is no such time in the given timezone.
    function getSetOffset (input, keepLocalTime) {
        var offset = this._offset || 0,
            localAdjust;
        if (!this.isValid()) {
            return input != null ? this : NaN;
        }
        if (input != null) {
            if (typeof input === 'string') {
                input = offsetFromString(matchShortOffset, input);
            } else if (Math.abs(input) < 16) {
                input = input * 60;
            }
            if (!this._isUTC && keepLocalTime) {
                localAdjust = getDateOffset(this);
            }
            this._offset = input;
            this._isUTC = true;
            if (localAdjust != null) {
                this.add(localAdjust, 'm');
            }
            if (offset !== input) {
                if (!keepLocalTime || this._changeInProgress) {
                    add_subtract__addSubtract(this, create__createDuration(input - offset, 'm'), 1, false);
                } else if (!this._changeInProgress) {
                    this._changeInProgress = true;
                    utils_hooks__hooks.updateOffset(this, true);
                    this._changeInProgress = null;
                }
            }
            return this;
        } else {
            return this._isUTC ? offset : getDateOffset(this);
        }
    }

    function getSetZone (input, keepLocalTime) {
        if (input != null) {
            if (typeof input !== 'string') {
                input = -input;
            }

            this.utcOffset(input, keepLocalTime);

            return this;
        } else {
            return -this.utcOffset();
        }
    }

    function setOffsetToUTC (keepLocalTime) {
        return this.utcOffset(0, keepLocalTime);
    }

    function setOffsetToLocal (keepLocalTime) {
        if (this._isUTC) {
            this.utcOffset(0, keepLocalTime);
            this._isUTC = false;

            if (keepLocalTime) {
                this.subtract(getDateOffset(this), 'm');
            }
        }
        return this;
    }

    function setOffsetToParsedOffset () {
        if (this._tzm) {
            this.utcOffset(this._tzm);
        } else if (typeof this._i === 'string') {
            this.utcOffset(offsetFromString(matchOffset, this._i));
        }
        return this;
    }

    function hasAlignedHourOffset (input) {
        if (!this.isValid()) {
            return false;
        }
        input = input ? local__createLocal(input).utcOffset() : 0;

        return (this.utcOffset() - input) % 60 === 0;
    }

    function isDaylightSavingTime () {
        return (
            this.utcOffset() > this.clone().month(0).utcOffset() ||
            this.utcOffset() > this.clone().month(5).utcOffset()
        );
    }

    function isDaylightSavingTimeShifted () {
        if (!isUndefined(this._isDSTShifted)) {
            return this._isDSTShifted;
        }

        var c = {};

        copyConfig(c, this);
        c = prepareConfig(c);

        if (c._a) {
            var other = c._isUTC ? create_utc__createUTC(c._a) : local__createLocal(c._a);
            this._isDSTShifted = this.isValid() &&
                compareArrays(c._a, other.toArray()) > 0;
        } else {
            this._isDSTShifted = false;
        }

        return this._isDSTShifted;
    }

    function isLocal () {
        return this.isValid() ? !this._isUTC : false;
    }

    function isUtcOffset () {
        return this.isValid() ? this._isUTC : false;
    }

    function isUtc () {
        return this.isValid() ? this._isUTC && this._offset === 0 : false;
    }

    // ASP.NET json date format regex
    var aspNetRegex = /^(\-)?(?:(\d*)[. ])?(\d+)\:(\d+)(?:\:(\d+)\.?(\d{3})?\d*)?$/;

    // from http://docs.closure-library.googlecode.com/git/closure_goog_date_date.js.source.html
    // somewhat more in line with 4.4.3.2 2004 spec, but allows decimal anywhere
    // and further modified to allow for strings containing both week and day
    var isoRegex = /^(-)?P(?:(-?[0-9,.]*)Y)?(?:(-?[0-9,.]*)M)?(?:(-?[0-9,.]*)W)?(?:(-?[0-9,.]*)D)?(?:T(?:(-?[0-9,.]*)H)?(?:(-?[0-9,.]*)M)?(?:(-?[0-9,.]*)S)?)?$/;

    function create__createDuration (input, key) {
        var duration = input,
            // matching against regexp is expensive, do it on demand
            match = null,
            sign,
            ret,
            diffRes;

        if (isDuration(input)) {
            duration = {
                ms : input._milliseconds,
                d  : input._days,
                M  : input._months
            };
        } else if (typeof input === 'number') {
            duration = {};
            if (key) {
                duration[key] = input;
            } else {
                duration.milliseconds = input;
            }
        } else if (!!(match = aspNetRegex.exec(input))) {
            sign = (match[1] === '-') ? -1 : 1;
            duration = {
                y  : 0,
                d  : toInt(match[DATE])        * sign,
                h  : toInt(match[HOUR])        * sign,
                m  : toInt(match[MINUTE])      * sign,
                s  : toInt(match[SECOND])      * sign,
                ms : toInt(match[MILLISECOND]) * sign
            };
        } else if (!!(match = isoRegex.exec(input))) {
            sign = (match[1] === '-') ? -1 : 1;
            duration = {
                y : parseIso(match[2], sign),
                M : parseIso(match[3], sign),
                w : parseIso(match[4], sign),
                d : parseIso(match[5], sign),
                h : parseIso(match[6], sign),
                m : parseIso(match[7], sign),
                s : parseIso(match[8], sign)
            };
        } else if (duration == null) {// checks for null or undefined
            duration = {};
        } else if (typeof duration === 'object' && ('from' in duration || 'to' in duration)) {
            diffRes = momentsDifference(local__createLocal(duration.from), local__createLocal(duration.to));

            duration = {};
            duration.ms = diffRes.milliseconds;
            duration.M = diffRes.months;
        }

        ret = new Duration(duration);

        if (isDuration(input) && hasOwnProp(input, '_locale')) {
            ret._locale = input._locale;
        }

        return ret;
    }

    create__createDuration.fn = Duration.prototype;

    function parseIso (inp, sign) {
        // We'd normally use ~~inp for this, but unfortunately it also
        // converts floats to ints.
        // inp may be undefined, so careful calling replace on it.
        var res = inp && parseFloat(inp.replace(',', '.'));
        // apply sign while we're at it
        return (isNaN(res) ? 0 : res) * sign;
    }

    function positiveMomentsDifference(base, other) {
        var res = {milliseconds: 0, months: 0};

        res.months = other.month() - base.month() +
            (other.year() - base.year()) * 12;
        if (base.clone().add(res.months, 'M').isAfter(other)) {
            --res.months;
        }

        res.milliseconds = +other - +(base.clone().add(res.months, 'M'));

        return res;
    }

    function momentsDifference(base, other) {
        var res;
        if (!(base.isValid() && other.isValid())) {
            return {milliseconds: 0, months: 0};
        }

        other = cloneWithOffset(other, base);
        if (base.isBefore(other)) {
            res = positiveMomentsDifference(base, other);
        } else {
            res = positiveMomentsDifference(other, base);
            res.milliseconds = -res.milliseconds;
            res.months = -res.months;
        }

        return res;
    }

    function absRound (number) {
        if (number < 0) {
            return Math.round(-1 * number) * -1;
        } else {
            return Math.round(number);
        }
    }

    // TODO: remove 'name' arg after deprecation is removed
    function createAdder(direction, name) {
        return function (val, period) {
            var dur, tmp;
            //invert the arguments, but complain about it
            if (period !== null && !isNaN(+period)) {
                deprecateSimple(name, 'moment().' + name  + '(period, number) is deprecated. Please use moment().' + name + '(number, period).');
                tmp = val; val = period; period = tmp;
            }

            val = typeof val === 'string' ? +val : val;
            dur = create__createDuration(val, period);
            add_subtract__addSubtract(this, dur, direction);
            return this;
        };
    }

    function add_subtract__addSubtract (mom, duration, isAdding, updateOffset) {
        var milliseconds = duration._milliseconds,
            days = absRound(duration._days),
            months = absRound(duration._months);

        if (!mom.isValid()) {
            // No op
            return;
        }

        updateOffset = updateOffset == null ? true : updateOffset;

        if (milliseconds) {
            mom._d.setTime(mom._d.valueOf() + milliseconds * isAdding);
        }
        if (days) {
            get_set__set(mom, 'Date', get_set__get(mom, 'Date') + days * isAdding);
        }
        if (months) {
            setMonth(mom, get_set__get(mom, 'Month') + months * isAdding);
        }
        if (updateOffset) {
            utils_hooks__hooks.updateOffset(mom, days || months);
        }
    }

    var add_subtract__add      = createAdder(1, 'add');
    var add_subtract__subtract = createAdder(-1, 'subtract');

    function moment_calendar__calendar (time, formats) {
        // We want to compare the start of today, vs this.
        // Getting start-of-today depends on whether we're local/utc/offset or not.
        var now = time || local__createLocal(),
            sod = cloneWithOffset(now, this).startOf('day'),
            diff = this.diff(sod, 'days', true),
            format = diff < -6 ? 'sameElse' :
                diff < -1 ? 'lastWeek' :
                diff < 0 ? 'lastDay' :
                diff < 1 ? 'sameDay' :
                diff < 2 ? 'nextDay' :
                diff < 7 ? 'nextWeek' : 'sameElse';

        var output = formats && (isFunction(formats[format]) ? formats[format]() : formats[format]);

        return this.format(output || this.localeData().calendar(format, this, local__createLocal(now)));
    }

    function clone () {
        return new Moment(this);
    }

    function isAfter (input, units) {
        var localInput = isMoment(input) ? input : local__createLocal(input);
        if (!(this.isValid() && localInput.isValid())) {
            return false;
        }
        units = normalizeUnits(!isUndefined(units) ? units : 'millisecond');
        if (units === 'millisecond') {
            return this.valueOf() > localInput.valueOf();
        } else {
            return localInput.valueOf() < this.clone().startOf(units).valueOf();
        }
    }

    function isBefore (input, units) {
        var localInput = isMoment(input) ? input : local__createLocal(input);
        if (!(this.isValid() && localInput.isValid())) {
            return false;
        }
        units = normalizeUnits(!isUndefined(units) ? units : 'millisecond');
        if (units === 'millisecond') {
            return this.valueOf() < localInput.valueOf();
        } else {
            return this.clone().endOf(units).valueOf() < localInput.valueOf();
        }
    }

    function isBetween (from, to, units, inclusivity) {
        inclusivity = inclusivity || '()';
        return (inclusivity[0] === '(' ? this.isAfter(from, units) : !this.isBefore(from, units)) &&
            (inclusivity[1] === ')' ? this.isBefore(to, units) : !this.isAfter(to, units));
    }

    function isSame (input, units) {
        var localInput = isMoment(input) ? input : local__createLocal(input),
            inputMs;
        if (!(this.isValid() && localInput.isValid())) {
            return false;
        }
        units = normalizeUnits(units || 'millisecond');
        if (units === 'millisecond') {
            return this.valueOf() === localInput.valueOf();
        } else {
            inputMs = localInput.valueOf();
            return this.clone().startOf(units).valueOf() <= inputMs && inputMs <= this.clone().endOf(units).valueOf();
        }
    }

    function isSameOrAfter (input, units) {
        return this.isSame(input, units) || this.isAfter(input,units);
    }

    function isSameOrBefore (input, units) {
        return this.isSame(input, units) || this.isBefore(input,units);
    }

    function diff (input, units, asFloat) {
        var that,
            zoneDelta,
            delta, output;

        if (!this.isValid()) {
            return NaN;
        }

        that = cloneWithOffset(input, this);

        if (!that.isValid()) {
            return NaN;
        }

        zoneDelta = (that.utcOffset() - this.utcOffset()) * 6e4;

        units = normalizeUnits(units);

        if (units === 'year' || units === 'month' || units === 'quarter') {
            output = monthDiff(this, that);
            if (units === 'quarter') {
                output = output / 3;
            } else if (units === 'year') {
                output = output / 12;
            }
        } else {
            delta = this - that;
            output = units === 'second' ? delta / 1e3 : // 1000
                units === 'minute' ? delta / 6e4 : // 1000 * 60
                units === 'hour' ? delta / 36e5 : // 1000 * 60 * 60
                units === 'day' ? (delta - zoneDelta) / 864e5 : // 1000 * 60 * 60 * 24, negate dst
                units === 'week' ? (delta - zoneDelta) / 6048e5 : // 1000 * 60 * 60 * 24 * 7, negate dst
                delta;
        }
        return asFloat ? output : absFloor(output);
    }

    function monthDiff (a, b) {
        // difference in months
        var wholeMonthDiff = ((b.year() - a.year()) * 12) + (b.month() - a.month()),
            // b is in (anchor - 1 month, anchor + 1 month)
            anchor = a.clone().add(wholeMonthDiff, 'months'),
            anchor2, adjust;

        if (b - anchor < 0) {
            anchor2 = a.clone().add(wholeMonthDiff - 1, 'months');
            // linear across the month
            adjust = (b - anchor) / (anchor - anchor2);
        } else {
            anchor2 = a.clone().add(wholeMonthDiff + 1, 'months');
            // linear across the month
            adjust = (b - anchor) / (anchor2 - anchor);
        }

        //check for negative zero, return zero if negative zero
        return -(wholeMonthDiff + adjust) || 0;
    }

    utils_hooks__hooks.defaultFormat = 'YYYY-MM-DDTHH:mm:ssZ';
    utils_hooks__hooks.defaultFormatUtc = 'YYYY-MM-DDTHH:mm:ss[Z]';

    function toString () {
        return this.clone().locale('en').format('ddd MMM DD YYYY HH:mm:ss [GMT]ZZ');
    }

    function moment_format__toISOString () {
        var m = this.clone().utc();
        if (0 < m.year() && m.year() <= 9999) {
            if (isFunction(Date.prototype.toISOString)) {
                // native implementation is ~50x faster, use it when we can
                return this.toDate().toISOString();
            } else {
                return formatMoment(m, 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
            }
        } else {
            return formatMoment(m, 'YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
        }
    }

    function format (inputString) {
        if (!inputString) {
            inputString = this.isUtc() ? utils_hooks__hooks.defaultFormatUtc : utils_hooks__hooks.defaultFormat;
        }
        var output = formatMoment(this, inputString);
        return this.localeData().postformat(output);
    }

    function from (time, withoutSuffix) {
        if (this.isValid() &&
                ((isMoment(time) && time.isValid()) ||
                 local__createLocal(time).isValid())) {
            return create__createDuration({to: this, from: time}).locale(this.locale()).humanize(!withoutSuffix);
        } else {
            return this.localeData().invalidDate();
        }
    }

    function fromNow (withoutSuffix) {
        return this.from(local__createLocal(), withoutSuffix);
    }

    function to (time, withoutSuffix) {
        if (this.isValid() &&
                ((isMoment(time) && time.isValid()) ||
                 local__createLocal(time).isValid())) {
            return create__createDuration({from: this, to: time}).locale(this.locale()).humanize(!withoutSuffix);
        } else {
            return this.localeData().invalidDate();
        }
    }

    function toNow (withoutSuffix) {
        return this.to(local__createLocal(), withoutSuffix);
    }

    // If passed a locale key, it will set the locale for this
    // instance.  Otherwise, it will return the locale configuration
    // variables for this instance.
    function locale (key) {
        var newLocaleData;

        if (key === undefined) {
            return this._locale._abbr;
        } else {
            newLocaleData = locale_locales__getLocale(key);
            if (newLocaleData != null) {
                this._locale = newLocaleData;
            }
            return this;
        }
    }

    var lang = deprecate(
        'moment().lang() is deprecated. Instead, use moment().localeData() to get the language configuration. Use moment().locale() to change languages.',
        function (key) {
            if (key === undefined) {
                return this.localeData();
            } else {
                return this.locale(key);
            }
        }
    );

    function localeData () {
        return this._locale;
    }

    function startOf (units) {
        units = normalizeUnits(units);
        // the following switch intentionally omits break keywords
        // to utilize falling through the cases.
        switch (units) {
        case 'year':
            this.month(0);
            /* falls through */
        case 'quarter':
        case 'month':
            this.date(1);
            /* falls through */
        case 'week':
        case 'isoWeek':
        case 'day':
        case 'date':
            this.hours(0);
            /* falls through */
        case 'hour':
            this.minutes(0);
            /* falls through */
        case 'minute':
            this.seconds(0);
            /* falls through */
        case 'second':
            this.milliseconds(0);
        }

        // weeks are a special case
        if (units === 'week') {
            this.weekday(0);
        }
        if (units === 'isoWeek') {
            this.isoWeekday(1);
        }

        // quarters are also special
        if (units === 'quarter') {
            this.month(Math.floor(this.month() / 3) * 3);
        }

        return this;
    }

    function endOf (units) {
        units = normalizeUnits(units);
        if (units === undefined || units === 'millisecond') {
            return this;
        }

        // 'date' is an alias for 'day', so it should be considered as such.
        if (units === 'date') {
            units = 'day';
        }

        return this.startOf(units).add(1, (units === 'isoWeek' ? 'week' : units)).subtract(1, 'ms');
    }

    function to_type__valueOf () {
        return this._d.valueOf() - ((this._offset || 0) * 60000);
    }

    function unix () {
        return Math.floor(this.valueOf() / 1000);
    }

    function toDate () {
        return this._offset ? new Date(this.valueOf()) : this._d;
    }

    function toArray () {
        var m = this;
        return [m.year(), m.month(), m.date(), m.hour(), m.minute(), m.second(), m.millisecond()];
    }

    function toObject () {
        var m = this;
        return {
            years: m.year(),
            months: m.month(),
            date: m.date(),
            hours: m.hours(),
            minutes: m.minutes(),
            seconds: m.seconds(),
            milliseconds: m.milliseconds()
        };
    }

    function toJSON () {
        // new Date(NaN).toJSON() === null
        return this.isValid() ? this.toISOString() : null;
    }

    function moment_valid__isValid () {
        return valid__isValid(this);
    }

    function parsingFlags () {
        return extend({}, getParsingFlags(this));
    }

    function invalidAt () {
        return getParsingFlags(this).overflow;
    }

    function creationData() {
        return {
            input: this._i,
            format: this._f,
            locale: this._locale,
            isUTC: this._isUTC,
            strict: this._strict
        };
    }

    // FORMATTING

    addFormatToken(0, ['gg', 2], 0, function () {
        return this.weekYear() % 100;
    });

    addFormatToken(0, ['GG', 2], 0, function () {
        return this.isoWeekYear() % 100;
    });

    function addWeekYearFormatToken (token, getter) {
        addFormatToken(0, [token, token.length], 0, getter);
    }

    addWeekYearFormatToken('gggg',     'weekYear');
    addWeekYearFormatToken('ggggg',    'weekYear');
    addWeekYearFormatToken('GGGG',  'isoWeekYear');
    addWeekYearFormatToken('GGGGG', 'isoWeekYear');

    // ALIASES

    addUnitAlias('weekYear', 'gg');
    addUnitAlias('isoWeekYear', 'GG');

    // PARSING

    addRegexToken('G',      matchSigned);
    addRegexToken('g',      matchSigned);
    addRegexToken('GG',     match1to2, match2);
    addRegexToken('gg',     match1to2, match2);
    addRegexToken('GGGG',   match1to4, match4);
    addRegexToken('gggg',   match1to4, match4);
    addRegexToken('GGGGG',  match1to6, match6);
    addRegexToken('ggggg',  match1to6, match6);

    addWeekParseToken(['gggg', 'ggggg', 'GGGG', 'GGGGG'], function (input, week, config, token) {
        week[token.substr(0, 2)] = toInt(input);
    });

    addWeekParseToken(['gg', 'GG'], function (input, week, config, token) {
        week[token] = utils_hooks__hooks.parseTwoDigitYear(input);
    });

    // MOMENTS

    function getSetWeekYear (input) {
        return getSetWeekYearHelper.call(this,
                input,
                this.week(),
                this.weekday(),
                this.localeData()._week.dow,
                this.localeData()._week.doy);
    }

    function getSetISOWeekYear (input) {
        return getSetWeekYearHelper.call(this,
                input, this.isoWeek(), this.isoWeekday(), 1, 4);
    }

    function getISOWeeksInYear () {
        return weeksInYear(this.year(), 1, 4);
    }

    function getWeeksInYear () {
        var weekInfo = this.localeData()._week;
        return weeksInYear(this.year(), weekInfo.dow, weekInfo.doy);
    }

    function getSetWeekYearHelper(input, week, weekday, dow, doy) {
        var weeksTarget;
        if (input == null) {
            return weekOfYear(this, dow, doy).year;
        } else {
            weeksTarget = weeksInYear(input, dow, doy);
            if (week > weeksTarget) {
                week = weeksTarget;
            }
            return setWeekAll.call(this, input, week, weekday, dow, doy);
        }
    }

    function setWeekAll(weekYear, week, weekday, dow, doy) {
        var dayOfYearData = dayOfYearFromWeeks(weekYear, week, weekday, dow, doy),
            date = createUTCDate(dayOfYearData.year, 0, dayOfYearData.dayOfYear);

        this.year(date.getUTCFullYear());
        this.month(date.getUTCMonth());
        this.date(date.getUTCDate());
        return this;
    }

    // FORMATTING

    addFormatToken('Q', 0, 'Qo', 'quarter');

    // ALIASES

    addUnitAlias('quarter', 'Q');

    // PARSING

    addRegexToken('Q', match1);
    addParseToken('Q', function (input, array) {
        array[MONTH] = (toInt(input) - 1) * 3;
    });

    // MOMENTS

    function getSetQuarter (input) {
        return input == null ? Math.ceil((this.month() + 1) / 3) : this.month((input - 1) * 3 + this.month() % 3);
    }

    // FORMATTING

    addFormatToken('w', ['ww', 2], 'wo', 'week');
    addFormatToken('W', ['WW', 2], 'Wo', 'isoWeek');

    // ALIASES

    addUnitAlias('week', 'w');
    addUnitAlias('isoWeek', 'W');

    // PARSING

    addRegexToken('w',  match1to2);
    addRegexToken('ww', match1to2, match2);
    addRegexToken('W',  match1to2);
    addRegexToken('WW', match1to2, match2);

    addWeekParseToken(['w', 'ww', 'W', 'WW'], function (input, week, config, token) {
        week[token.substr(0, 1)] = toInt(input);
    });

    // HELPERS

    // LOCALES

    function localeWeek (mom) {
        return weekOfYear(mom, this._week.dow, this._week.doy).week;
    }

    var defaultLocaleWeek = {
        dow : 0, // Sunday is the first day of the week.
        doy : 6  // The week that contains Jan 1st is the first week of the year.
    };

    function localeFirstDayOfWeek () {
        return this._week.dow;
    }

    function localeFirstDayOfYear () {
        return this._week.doy;
    }

    // MOMENTS

    function getSetWeek (input) {
        var week = this.localeData().week(this);
        return input == null ? week : this.add((input - week) * 7, 'd');
    }

    function getSetISOWeek (input) {
        var week = weekOfYear(this, 1, 4).week;
        return input == null ? week : this.add((input - week) * 7, 'd');
    }

    // FORMATTING

    addFormatToken('D', ['DD', 2], 'Do', 'date');

    // ALIASES

    addUnitAlias('date', 'D');

    // PARSING

    addRegexToken('D',  match1to2);
    addRegexToken('DD', match1to2, match2);
    addRegexToken('Do', function (isStrict, locale) {
        return isStrict ? locale._ordinalParse : locale._ordinalParseLenient;
    });

    addParseToken(['D', 'DD'], DATE);
    addParseToken('Do', function (input, array) {
        array[DATE] = toInt(input.match(match1to2)[0], 10);
    });

    // MOMENTS

    var getSetDayOfMonth = makeGetSet('Date', true);

    // FORMATTING

    addFormatToken('d', 0, 'do', 'day');

    addFormatToken('dd', 0, 0, function (format) {
        return this.localeData().weekdaysMin(this, format);
    });

    addFormatToken('ddd', 0, 0, function (format) {
        return this.localeData().weekdaysShort(this, format);
    });

    addFormatToken('dddd', 0, 0, function (format) {
        return this.localeData().weekdays(this, format);
    });

    addFormatToken('e', 0, 0, 'weekday');
    addFormatToken('E', 0, 0, 'isoWeekday');

    // ALIASES

    addUnitAlias('day', 'd');
    addUnitAlias('weekday', 'e');
    addUnitAlias('isoWeekday', 'E');

    // PARSING

    addRegexToken('d',    match1to2);
    addRegexToken('e',    match1to2);
    addRegexToken('E',    match1to2);
    addRegexToken('dd',   function (isStrict, locale) {
        return locale.weekdaysMinRegex(isStrict);
    });
    addRegexToken('ddd',   function (isStrict, locale) {
        return locale.weekdaysShortRegex(isStrict);
    });
    addRegexToken('dddd',   function (isStrict, locale) {
        return locale.weekdaysRegex(isStrict);
    });

    addWeekParseToken(['dd', 'ddd', 'dddd'], function (input, week, config, token) {
        var weekday = config._locale.weekdaysParse(input, token, config._strict);
        // if we didn't get a weekday name, mark the date as invalid
        if (weekday != null) {
            week.d = weekday;
        } else {
            getParsingFlags(config).invalidWeekday = input;
        }
    });

    addWeekParseToken(['d', 'e', 'E'], function (input, week, config, token) {
        week[token] = toInt(input);
    });

    // HELPERS

    function parseWeekday(input, locale) {
        if (typeof input !== 'string') {
            return input;
        }

        if (!isNaN(input)) {
            return parseInt(input, 10);
        }

        input = locale.weekdaysParse(input);
        if (typeof input === 'number') {
            return input;
        }

        return null;
    }

    // LOCALES

    var defaultLocaleWeekdays = 'Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday'.split('_');
    function localeWeekdays (m, format) {
        return isArray(this._weekdays) ? this._weekdays[m.day()] :
            this._weekdays[this._weekdays.isFormat.test(format) ? 'format' : 'standalone'][m.day()];
    }

    var defaultLocaleWeekdaysShort = 'Sun_Mon_Tue_Wed_Thu_Fri_Sat'.split('_');
    function localeWeekdaysShort (m) {
        return this._weekdaysShort[m.day()];
    }

    var defaultLocaleWeekdaysMin = 'Su_Mo_Tu_We_Th_Fr_Sa'.split('_');
    function localeWeekdaysMin (m) {
        return this._weekdaysMin[m.day()];
    }

    function day_of_week__handleStrictParse(weekdayName, format, strict) {
        var i, ii, mom, llc = weekdayName.toLocaleLowerCase();
        if (!this._weekdaysParse) {
            this._weekdaysParse = [];
            this._shortWeekdaysParse = [];
            this._minWeekdaysParse = [];

            for (i = 0; i < 7; ++i) {
                mom = create_utc__createUTC([2000, 1]).day(i);
                this._minWeekdaysParse[i] = this.weekdaysMin(mom, '').toLocaleLowerCase();
                this._shortWeekdaysParse[i] = this.weekdaysShort(mom, '').toLocaleLowerCase();
                this._weekdaysParse[i] = this.weekdays(mom, '').toLocaleLowerCase();
            }
        }

        if (strict) {
            if (format === 'dddd') {
                ii = indexOf.call(this._weekdaysParse, llc);
                return ii !== -1 ? ii : null;
            } else if (format === 'ddd') {
                ii = indexOf.call(this._shortWeekdaysParse, llc);
                return ii !== -1 ? ii : null;
            } else {
                ii = indexOf.call(this._minWeekdaysParse, llc);
                return ii !== -1 ? ii : null;
            }
        } else {
            if (format === 'dddd') {
                ii = indexOf.call(this._weekdaysParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._shortWeekdaysParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._minWeekdaysParse, llc);
                return ii !== -1 ? ii : null;
            } else if (format === 'ddd') {
                ii = indexOf.call(this._shortWeekdaysParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._weekdaysParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._minWeekdaysParse, llc);
                return ii !== -1 ? ii : null;
            } else {
                ii = indexOf.call(this._minWeekdaysParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._weekdaysParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._shortWeekdaysParse, llc);
                return ii !== -1 ? ii : null;
            }
        }
    }

    function localeWeekdaysParse (weekdayName, format, strict) {
        var i, mom, regex;

        if (this._weekdaysParseExact) {
            return day_of_week__handleStrictParse.call(this, weekdayName, format, strict);
        }

        if (!this._weekdaysParse) {
            this._weekdaysParse = [];
            this._minWeekdaysParse = [];
            this._shortWeekdaysParse = [];
            this._fullWeekdaysParse = [];
        }

        for (i = 0; i < 7; i++) {
            // make the regex if we don't have it already

            mom = create_utc__createUTC([2000, 1]).day(i);
            if (strict && !this._fullWeekdaysParse[i]) {
                this._fullWeekdaysParse[i] = new RegExp('^' + this.weekdays(mom, '').replace('.', '\.?') + '$', 'i');
                this._shortWeekdaysParse[i] = new RegExp('^' + this.weekdaysShort(mom, '').replace('.', '\.?') + '$', 'i');
                this._minWeekdaysParse[i] = new RegExp('^' + this.weekdaysMin(mom, '').replace('.', '\.?') + '$', 'i');
            }
            if (!this._weekdaysParse[i]) {
                regex = '^' + this.weekdays(mom, '') + '|^' + this.weekdaysShort(mom, '') + '|^' + this.weekdaysMin(mom, '');
                this._weekdaysParse[i] = new RegExp(regex.replace('.', ''), 'i');
            }
            // test the regex
            if (strict && format === 'dddd' && this._fullWeekdaysParse[i].test(weekdayName)) {
                return i;
            } else if (strict && format === 'ddd' && this._shortWeekdaysParse[i].test(weekdayName)) {
                return i;
            } else if (strict && format === 'dd' && this._minWeekdaysParse[i].test(weekdayName)) {
                return i;
            } else if (!strict && this._weekdaysParse[i].test(weekdayName)) {
                return i;
            }
        }
    }

    // MOMENTS

    function getSetDayOfWeek (input) {
        if (!this.isValid()) {
            return input != null ? this : NaN;
        }
        var day = this._isUTC ? this._d.getUTCDay() : this._d.getDay();
        if (input != null) {
            input = parseWeekday(input, this.localeData());
            return this.add(input - day, 'd');
        } else {
            return day;
        }
    }

    function getSetLocaleDayOfWeek (input) {
        if (!this.isValid()) {
            return input != null ? this : NaN;
        }
        var weekday = (this.day() + 7 - this.localeData()._week.dow) % 7;
        return input == null ? weekday : this.add(input - weekday, 'd');
    }

    function getSetISODayOfWeek (input) {
        if (!this.isValid()) {
            return input != null ? this : NaN;
        }
        // behaves the same as moment#day except
        // as a getter, returns 7 instead of 0 (1-7 range instead of 0-6)
        // as a setter, sunday should belong to the previous week.
        return input == null ? this.day() || 7 : this.day(this.day() % 7 ? input : input - 7);
    }

    var defaultWeekdaysRegex = matchWord;
    function weekdaysRegex (isStrict) {
        if (this._weekdaysParseExact) {
            if (!hasOwnProp(this, '_weekdaysRegex')) {
                computeWeekdaysParse.call(this);
            }
            if (isStrict) {
                return this._weekdaysStrictRegex;
            } else {
                return this._weekdaysRegex;
            }
        } else {
            return this._weekdaysStrictRegex && isStrict ?
                this._weekdaysStrictRegex : this._weekdaysRegex;
        }
    }

    var defaultWeekdaysShortRegex = matchWord;
    function weekdaysShortRegex (isStrict) {
        if (this._weekdaysParseExact) {
            if (!hasOwnProp(this, '_weekdaysRegex')) {
                computeWeekdaysParse.call(this);
            }
            if (isStrict) {
                return this._weekdaysShortStrictRegex;
            } else {
                return this._weekdaysShortRegex;
            }
        } else {
            return this._weekdaysShortStrictRegex && isStrict ?
                this._weekdaysShortStrictRegex : this._weekdaysShortRegex;
        }
    }

    var defaultWeekdaysMinRegex = matchWord;
    function weekdaysMinRegex (isStrict) {
        if (this._weekdaysParseExact) {
            if (!hasOwnProp(this, '_weekdaysRegex')) {
                computeWeekdaysParse.call(this);
            }
            if (isStrict) {
                return this._weekdaysMinStrictRegex;
            } else {
                return this._weekdaysMinRegex;
            }
        } else {
            return this._weekdaysMinStrictRegex && isStrict ?
                this._weekdaysMinStrictRegex : this._weekdaysMinRegex;
        }
    }


    function computeWeekdaysParse () {
        function cmpLenRev(a, b) {
            return b.length - a.length;
        }

        var minPieces = [], shortPieces = [], longPieces = [], mixedPieces = [],
            i, mom, minp, shortp, longp;
        for (i = 0; i < 7; i++) {
            // make the regex if we don't have it already
            mom = create_utc__createUTC([2000, 1]).day(i);
            minp = this.weekdaysMin(mom, '');
            shortp = this.weekdaysShort(mom, '');
            longp = this.weekdays(mom, '');
            minPieces.push(minp);
            shortPieces.push(shortp);
            longPieces.push(longp);
            mixedPieces.push(minp);
            mixedPieces.push(shortp);
            mixedPieces.push(longp);
        }
        // Sorting makes sure if one weekday (or abbr) is a prefix of another it
        // will match the longer piece.
        minPieces.sort(cmpLenRev);
        shortPieces.sort(cmpLenRev);
        longPieces.sort(cmpLenRev);
        mixedPieces.sort(cmpLenRev);
        for (i = 0; i < 7; i++) {
            shortPieces[i] = regexEscape(shortPieces[i]);
            longPieces[i] = regexEscape(longPieces[i]);
            mixedPieces[i] = regexEscape(mixedPieces[i]);
        }

        this._weekdaysRegex = new RegExp('^(' + mixedPieces.join('|') + ')', 'i');
        this._weekdaysShortRegex = this._weekdaysRegex;
        this._weekdaysMinRegex = this._weekdaysRegex;

        this._weekdaysStrictRegex = new RegExp('^(' + longPieces.join('|') + ')', 'i');
        this._weekdaysShortStrictRegex = new RegExp('^(' + shortPieces.join('|') + ')', 'i');
        this._weekdaysMinStrictRegex = new RegExp('^(' + minPieces.join('|') + ')', 'i');
    }

    // FORMATTING

    addFormatToken('DDD', ['DDDD', 3], 'DDDo', 'dayOfYear');

    // ALIASES

    addUnitAlias('dayOfYear', 'DDD');

    // PARSING

    addRegexToken('DDD',  match1to3);
    addRegexToken('DDDD', match3);
    addParseToken(['DDD', 'DDDD'], function (input, array, config) {
        config._dayOfYear = toInt(input);
    });

    // HELPERS

    // MOMENTS

    function getSetDayOfYear (input) {
        var dayOfYear = Math.round((this.clone().startOf('day') - this.clone().startOf('year')) / 864e5) + 1;
        return input == null ? dayOfYear : this.add((input - dayOfYear), 'd');
    }

    // FORMATTING

    function hFormat() {
        return this.hours() % 12 || 12;
    }

    function kFormat() {
        return this.hours() || 24;
    }

    addFormatToken('H', ['HH', 2], 0, 'hour');
    addFormatToken('h', ['hh', 2], 0, hFormat);
    addFormatToken('k', ['kk', 2], 0, kFormat);

    addFormatToken('hmm', 0, 0, function () {
        return '' + hFormat.apply(this) + zeroFill(this.minutes(), 2);
    });

    addFormatToken('hmmss', 0, 0, function () {
        return '' + hFormat.apply(this) + zeroFill(this.minutes(), 2) +
            zeroFill(this.seconds(), 2);
    });

    addFormatToken('Hmm', 0, 0, function () {
        return '' + this.hours() + zeroFill(this.minutes(), 2);
    });

    addFormatToken('Hmmss', 0, 0, function () {
        return '' + this.hours() + zeroFill(this.minutes(), 2) +
            zeroFill(this.seconds(), 2);
    });

    function meridiem (token, lowercase) {
        addFormatToken(token, 0, 0, function () {
            return this.localeData().meridiem(this.hours(), this.minutes(), lowercase);
        });
    }

    meridiem('a', true);
    meridiem('A', false);

    // ALIASES

    addUnitAlias('hour', 'h');

    // PARSING

    function matchMeridiem (isStrict, locale) {
        return locale._meridiemParse;
    }

    addRegexToken('a',  matchMeridiem);
    addRegexToken('A',  matchMeridiem);
    addRegexToken('H',  match1to2);
    addRegexToken('h',  match1to2);
    addRegexToken('HH', match1to2, match2);
    addRegexToken('hh', match1to2, match2);

    addRegexToken('hmm', match3to4);
    addRegexToken('hmmss', match5to6);
    addRegexToken('Hmm', match3to4);
    addRegexToken('Hmmss', match5to6);

    addParseToken(['H', 'HH'], HOUR);
    addParseToken(['a', 'A'], function (input, array, config) {
        config._isPm = config._locale.isPM(input);
        config._meridiem = input;
    });
    addParseToken(['h', 'hh'], function (input, array, config) {
        array[HOUR] = toInt(input);
        getParsingFlags(config).bigHour = true;
    });
    addParseToken('hmm', function (input, array, config) {
        var pos = input.length - 2;
        array[HOUR] = toInt(input.substr(0, pos));
        array[MINUTE] = toInt(input.substr(pos));
        getParsingFlags(config).bigHour = true;
    });
    addParseToken('hmmss', function (input, array, config) {
        var pos1 = input.length - 4;
        var pos2 = input.length - 2;
        array[HOUR] = toInt(input.substr(0, pos1));
        array[MINUTE] = toInt(input.substr(pos1, 2));
        array[SECOND] = toInt(input.substr(pos2));
        getParsingFlags(config).bigHour = true;
    });
    addParseToken('Hmm', function (input, array, config) {
        var pos = input.length - 2;
        array[HOUR] = toInt(input.substr(0, pos));
        array[MINUTE] = toInt(input.substr(pos));
    });
    addParseToken('Hmmss', function (input, array, config) {
        var pos1 = input.length - 4;
        var pos2 = input.length - 2;
        array[HOUR] = toInt(input.substr(0, pos1));
        array[MINUTE] = toInt(input.substr(pos1, 2));
        array[SECOND] = toInt(input.substr(pos2));
    });

    // LOCALES

    function localeIsPM (input) {
        // IE8 Quirks Mode & IE7 Standards Mode do not allow accessing strings like arrays
        // Using charAt should be more compatible.
        return ((input + '').toLowerCase().charAt(0) === 'p');
    }

    var defaultLocaleMeridiemParse = /[ap]\.?m?\.?/i;
    function localeMeridiem (hours, minutes, isLower) {
        if (hours > 11) {
            return isLower ? 'pm' : 'PM';
        } else {
            return isLower ? 'am' : 'AM';
        }
    }


    // MOMENTS

    // Setting the hour should keep the time, because the user explicitly
    // specified which hour he wants. So trying to maintain the same hour (in
    // a new timezone) makes sense. Adding/subtracting hours does not follow
    // this rule.
    var getSetHour = makeGetSet('Hours', true);

    // FORMATTING

    addFormatToken('m', ['mm', 2], 0, 'minute');

    // ALIASES

    addUnitAlias('minute', 'm');

    // PARSING

    addRegexToken('m',  match1to2);
    addRegexToken('mm', match1to2, match2);
    addParseToken(['m', 'mm'], MINUTE);

    // MOMENTS

    var getSetMinute = makeGetSet('Minutes', false);

    // FORMATTING

    addFormatToken('s', ['ss', 2], 0, 'second');

    // ALIASES

    addUnitAlias('second', 's');

    // PARSING

    addRegexToken('s',  match1to2);
    addRegexToken('ss', match1to2, match2);
    addParseToken(['s', 'ss'], SECOND);

    // MOMENTS

    var getSetSecond = makeGetSet('Seconds', false);

    // FORMATTING

    addFormatToken('S', 0, 0, function () {
        return ~~(this.millisecond() / 100);
    });

    addFormatToken(0, ['SS', 2], 0, function () {
        return ~~(this.millisecond() / 10);
    });

    addFormatToken(0, ['SSS', 3], 0, 'millisecond');
    addFormatToken(0, ['SSSS', 4], 0, function () {
        return this.millisecond() * 10;
    });
    addFormatToken(0, ['SSSSS', 5], 0, function () {
        return this.millisecond() * 100;
    });
    addFormatToken(0, ['SSSSSS', 6], 0, function () {
        return this.millisecond() * 1000;
    });
    addFormatToken(0, ['SSSSSSS', 7], 0, function () {
        return this.millisecond() * 10000;
    });
    addFormatToken(0, ['SSSSSSSS', 8], 0, function () {
        return this.millisecond() * 100000;
    });
    addFormatToken(0, ['SSSSSSSSS', 9], 0, function () {
        return this.millisecond() * 1000000;
    });


    // ALIASES

    addUnitAlias('millisecond', 'ms');

    // PARSING

    addRegexToken('S',    match1to3, match1);
    addRegexToken('SS',   match1to3, match2);
    addRegexToken('SSS',  match1to3, match3);

    var token;
    for (token = 'SSSS'; token.length <= 9; token += 'S') {
        addRegexToken(token, matchUnsigned);
    }

    function parseMs(input, array) {
        array[MILLISECOND] = toInt(('0.' + input) * 1000);
    }

    for (token = 'S'; token.length <= 9; token += 'S') {
        addParseToken(token, parseMs);
    }
    // MOMENTS

    var getSetMillisecond = makeGetSet('Milliseconds', false);

    // FORMATTING

    addFormatToken('z',  0, 0, 'zoneAbbr');
    addFormatToken('zz', 0, 0, 'zoneName');

    // MOMENTS

    function getZoneAbbr () {
        return this._isUTC ? 'UTC' : '';
    }

    function getZoneName () {
        return this._isUTC ? 'Coordinated Universal Time' : '';
    }

    var momentPrototype__proto = Moment.prototype;

    momentPrototype__proto.add               = add_subtract__add;
    momentPrototype__proto.calendar          = moment_calendar__calendar;
    momentPrototype__proto.clone             = clone;
    momentPrototype__proto.diff              = diff;
    momentPrototype__proto.endOf             = endOf;
    momentPrototype__proto.format            = format;
    momentPrototype__proto.from              = from;
    momentPrototype__proto.fromNow           = fromNow;
    momentPrototype__proto.to                = to;
    momentPrototype__proto.toNow             = toNow;
    momentPrototype__proto.get               = getSet;
    momentPrototype__proto.invalidAt         = invalidAt;
    momentPrototype__proto.isAfter           = isAfter;
    momentPrototype__proto.isBefore          = isBefore;
    momentPrototype__proto.isBetween         = isBetween;
    momentPrototype__proto.isSame            = isSame;
    momentPrototype__proto.isSameOrAfter     = isSameOrAfter;
    momentPrototype__proto.isSameOrBefore    = isSameOrBefore;
    momentPrototype__proto.isValid           = moment_valid__isValid;
    momentPrototype__proto.lang              = lang;
    momentPrototype__proto.locale            = locale;
    momentPrototype__proto.localeData        = localeData;
    momentPrototype__proto.max               = prototypeMax;
    momentPrototype__proto.min               = prototypeMin;
    momentPrototype__proto.parsingFlags      = parsingFlags;
    momentPrototype__proto.set               = getSet;
    momentPrototype__proto.startOf           = startOf;
    momentPrototype__proto.subtract          = add_subtract__subtract;
    momentPrototype__proto.toArray           = toArray;
    momentPrototype__proto.toObject          = toObject;
    momentPrototype__proto.toDate            = toDate;
    momentPrototype__proto.toISOString       = moment_format__toISOString;
    momentPrototype__proto.toJSON            = toJSON;
    momentPrototype__proto.toString          = toString;
    momentPrototype__proto.unix              = unix;
    momentPrototype__proto.valueOf           = to_type__valueOf;
    momentPrototype__proto.creationData      = creationData;

    // Year
    momentPrototype__proto.year       = getSetYear;
    momentPrototype__proto.isLeapYear = getIsLeapYear;

    // Week Year
    momentPrototype__proto.weekYear    = getSetWeekYear;
    momentPrototype__proto.isoWeekYear = getSetISOWeekYear;

    // Quarter
    momentPrototype__proto.quarter = momentPrototype__proto.quarters = getSetQuarter;

    // Month
    momentPrototype__proto.month       = getSetMonth;
    momentPrototype__proto.daysInMonth = getDaysInMonth;

    // Week
    momentPrototype__proto.week           = momentPrototype__proto.weeks        = getSetWeek;
    momentPrototype__proto.isoWeek        = momentPrototype__proto.isoWeeks     = getSetISOWeek;
    momentPrototype__proto.weeksInYear    = getWeeksInYear;
    momentPrototype__proto.isoWeeksInYear = getISOWeeksInYear;

    // Day
    momentPrototype__proto.date       = getSetDayOfMonth;
    momentPrototype__proto.day        = momentPrototype__proto.days             = getSetDayOfWeek;
    momentPrototype__proto.weekday    = getSetLocaleDayOfWeek;
    momentPrototype__proto.isoWeekday = getSetISODayOfWeek;
    momentPrototype__proto.dayOfYear  = getSetDayOfYear;

    // Hour
    momentPrototype__proto.hour = momentPrototype__proto.hours = getSetHour;

    // Minute
    momentPrototype__proto.minute = momentPrototype__proto.minutes = getSetMinute;

    // Second
    momentPrototype__proto.second = momentPrototype__proto.seconds = getSetSecond;

    // Millisecond
    momentPrototype__proto.millisecond = momentPrototype__proto.milliseconds = getSetMillisecond;

    // Offset
    momentPrototype__proto.utcOffset            = getSetOffset;
    momentPrototype__proto.utc                  = setOffsetToUTC;
    momentPrototype__proto.local                = setOffsetToLocal;
    momentPrototype__proto.parseZone            = setOffsetToParsedOffset;
    momentPrototype__proto.hasAlignedHourOffset = hasAlignedHourOffset;
    momentPrototype__proto.isDST                = isDaylightSavingTime;
    momentPrototype__proto.isDSTShifted         = isDaylightSavingTimeShifted;
    momentPrototype__proto.isLocal              = isLocal;
    momentPrototype__proto.isUtcOffset          = isUtcOffset;
    momentPrototype__proto.isUtc                = isUtc;
    momentPrototype__proto.isUTC                = isUtc;

    // Timezone
    momentPrototype__proto.zoneAbbr = getZoneAbbr;
    momentPrototype__proto.zoneName = getZoneName;

    // Deprecations
    momentPrototype__proto.dates  = deprecate('dates accessor is deprecated. Use date instead.', getSetDayOfMonth);
    momentPrototype__proto.months = deprecate('months accessor is deprecated. Use month instead', getSetMonth);
    momentPrototype__proto.years  = deprecate('years accessor is deprecated. Use year instead', getSetYear);
    momentPrototype__proto.zone   = deprecate('moment().zone is deprecated, use moment().utcOffset instead. https://github.com/moment/moment/issues/1779', getSetZone);

    var momentPrototype = momentPrototype__proto;

    function moment__createUnix (input) {
        return local__createLocal(input * 1000);
    }

    function moment__createInZone () {
        return local__createLocal.apply(null, arguments).parseZone();
    }

    var defaultCalendar = {
        sameDay : '[Today at] LT',
        nextDay : '[Tomorrow at] LT',
        nextWeek : 'dddd [at] LT',
        lastDay : '[Yesterday at] LT',
        lastWeek : '[Last] dddd [at] LT',
        sameElse : 'L'
    };

    function locale_calendar__calendar (key, mom, now) {
        var output = this._calendar[key];
        return isFunction(output) ? output.call(mom, now) : output;
    }

    var defaultLongDateFormat = {
        LTS  : 'h:mm:ss A',
        LT   : 'h:mm A',
        L    : 'MM/DD/YYYY',
        LL   : 'MMMM D, YYYY',
        LLL  : 'MMMM D, YYYY h:mm A',
        LLLL : 'dddd, MMMM D, YYYY h:mm A'
    };

    function longDateFormat (key) {
        var format = this._longDateFormat[key],
            formatUpper = this._longDateFormat[key.toUpperCase()];

        if (format || !formatUpper) {
            return format;
        }

        this._longDateFormat[key] = formatUpper.replace(/MMMM|MM|DD|dddd/g, function (val) {
            return val.slice(1);
        });

        return this._longDateFormat[key];
    }

    var defaultInvalidDate = 'Invalid date';

    function invalidDate () {
        return this._invalidDate;
    }

    var defaultOrdinal = '%d';
    var defaultOrdinalParse = /\d{1,2}/;

    function ordinal (number) {
        return this._ordinal.replace('%d', number);
    }

    function preParsePostFormat (string) {
        return string;
    }

    var defaultRelativeTime = {
        future : 'in %s',
        past   : '%s ago',
        s  : 'a few seconds',
        m  : 'a minute',
        mm : '%d minutes',
        h  : 'an hour',
        hh : '%d hours',
        d  : 'a day',
        dd : '%d days',
        M  : 'a month',
        MM : '%d months',
        y  : 'a year',
        yy : '%d years'
    };

    function relative__relativeTime (number, withoutSuffix, string, isFuture) {
        var output = this._relativeTime[string];
        return (isFunction(output)) ?
            output(number, withoutSuffix, string, isFuture) :
            output.replace(/%d/i, number);
    }

    function pastFuture (diff, output) {
        var format = this._relativeTime[diff > 0 ? 'future' : 'past'];
        return isFunction(format) ? format(output) : format.replace(/%s/i, output);
    }

    var prototype__proto = Locale.prototype;

    prototype__proto._calendar       = defaultCalendar;
    prototype__proto.calendar        = locale_calendar__calendar;
    prototype__proto._longDateFormat = defaultLongDateFormat;
    prototype__proto.longDateFormat  = longDateFormat;
    prototype__proto._invalidDate    = defaultInvalidDate;
    prototype__proto.invalidDate     = invalidDate;
    prototype__proto._ordinal        = defaultOrdinal;
    prototype__proto.ordinal         = ordinal;
    prototype__proto._ordinalParse   = defaultOrdinalParse;
    prototype__proto.preparse        = preParsePostFormat;
    prototype__proto.postformat      = preParsePostFormat;
    prototype__proto._relativeTime   = defaultRelativeTime;
    prototype__proto.relativeTime    = relative__relativeTime;
    prototype__proto.pastFuture      = pastFuture;
    prototype__proto.set             = locale_set__set;

    // Month
    prototype__proto.months            =        localeMonths;
    prototype__proto._months           = defaultLocaleMonths;
    prototype__proto.monthsShort       =        localeMonthsShort;
    prototype__proto._monthsShort      = defaultLocaleMonthsShort;
    prototype__proto.monthsParse       =        localeMonthsParse;
    prototype__proto._monthsRegex      = defaultMonthsRegex;
    prototype__proto.monthsRegex       = monthsRegex;
    prototype__proto._monthsShortRegex = defaultMonthsShortRegex;
    prototype__proto.monthsShortRegex  = monthsShortRegex;

    // Week
    prototype__proto.week = localeWeek;
    prototype__proto._week = defaultLocaleWeek;
    prototype__proto.firstDayOfYear = localeFirstDayOfYear;
    prototype__proto.firstDayOfWeek = localeFirstDayOfWeek;

    // Day of Week
    prototype__proto.weekdays       =        localeWeekdays;
    prototype__proto._weekdays      = defaultLocaleWeekdays;
    prototype__proto.weekdaysMin    =        localeWeekdaysMin;
    prototype__proto._weekdaysMin   = defaultLocaleWeekdaysMin;
    prototype__proto.weekdaysShort  =        localeWeekdaysShort;
    prototype__proto._weekdaysShort = defaultLocaleWeekdaysShort;
    prototype__proto.weekdaysParse  =        localeWeekdaysParse;

    prototype__proto._weekdaysRegex      = defaultWeekdaysRegex;
    prototype__proto.weekdaysRegex       =        weekdaysRegex;
    prototype__proto._weekdaysShortRegex = defaultWeekdaysShortRegex;
    prototype__proto.weekdaysShortRegex  =        weekdaysShortRegex;
    prototype__proto._weekdaysMinRegex   = defaultWeekdaysMinRegex;
    prototype__proto.weekdaysMinRegex    =        weekdaysMinRegex;

    // Hours
    prototype__proto.isPM = localeIsPM;
    prototype__proto._meridiemParse = defaultLocaleMeridiemParse;
    prototype__proto.meridiem = localeMeridiem;

    function lists__get (format, index, field, setter) {
        var locale = locale_locales__getLocale();
        var utc = create_utc__createUTC().set(setter, index);
        return locale[field](utc, format);
    }

    function listMonthsImpl (format, index, field) {
        if (typeof format === 'number') {
            index = format;
            format = undefined;
        }

        format = format || '';

        if (index != null) {
            return lists__get(format, index, field, 'month');
        }

        var i;
        var out = [];
        for (i = 0; i < 12; i++) {
            out[i] = lists__get(format, i, field, 'month');
        }
        return out;
    }

    // ()
    // (5)
    // (fmt, 5)
    // (fmt)
    // (true)
    // (true, 5)
    // (true, fmt, 5)
    // (true, fmt)
    function listWeekdaysImpl (localeSorted, format, index, field) {
        if (typeof localeSorted === 'boolean') {
            if (typeof format === 'number') {
                index = format;
                format = undefined;
            }

            format = format || '';
        } else {
            format = localeSorted;
            index = format;
            localeSorted = false;

            if (typeof format === 'number') {
                index = format;
                format = undefined;
            }

            format = format || '';
        }

        var locale = locale_locales__getLocale(),
            shift = localeSorted ? locale._week.dow : 0;

        if (index != null) {
            return lists__get(format, (index + shift) % 7, field, 'day');
        }

        var i;
        var out = [];
        for (i = 0; i < 7; i++) {
            out[i] = lists__get(format, (i + shift) % 7, field, 'day');
        }
        return out;
    }

    function lists__listMonths (format, index) {
        return listMonthsImpl(format, index, 'months');
    }

    function lists__listMonthsShort (format, index) {
        return listMonthsImpl(format, index, 'monthsShort');
    }

    function lists__listWeekdays (localeSorted, format, index) {
        return listWeekdaysImpl(localeSorted, format, index, 'weekdays');
    }

    function lists__listWeekdaysShort (localeSorted, format, index) {
        return listWeekdaysImpl(localeSorted, format, index, 'weekdaysShort');
    }

    function lists__listWeekdaysMin (localeSorted, format, index) {
        return listWeekdaysImpl(localeSorted, format, index, 'weekdaysMin');
    }

    locale_locales__getSetGlobalLocale('en', {
        ordinalParse: /\d{1,2}(th|st|nd|rd)/,
        ordinal : function (number) {
            var b = number % 10,
                output = (toInt(number % 100 / 10) === 1) ? 'th' :
                (b === 1) ? 'st' :
                (b === 2) ? 'nd' :
                (b === 3) ? 'rd' : 'th';
            return number + output;
        }
    });

    // Side effect imports
    utils_hooks__hooks.lang = deprecate('moment.lang is deprecated. Use moment.locale instead.', locale_locales__getSetGlobalLocale);
    utils_hooks__hooks.langData = deprecate('moment.langData is deprecated. Use moment.localeData instead.', locale_locales__getLocale);

    var mathAbs = Math.abs;

    function duration_abs__abs () {
        var data           = this._data;

        this._milliseconds = mathAbs(this._milliseconds);
        this._days         = mathAbs(this._days);
        this._months       = mathAbs(this._months);

        data.milliseconds  = mathAbs(data.milliseconds);
        data.seconds       = mathAbs(data.seconds);
        data.minutes       = mathAbs(data.minutes);
        data.hours         = mathAbs(data.hours);
        data.months        = mathAbs(data.months);
        data.years         = mathAbs(data.years);

        return this;
    }

    function duration_add_subtract__addSubtract (duration, input, value, direction) {
        var other = create__createDuration(input, value);

        duration._milliseconds += direction * other._milliseconds;
        duration._days         += direction * other._days;
        duration._months       += direction * other._months;

        return duration._bubble();
    }

    // supports only 2.0-style add(1, 's') or add(duration)
    function duration_add_subtract__add (input, value) {
        return duration_add_subtract__addSubtract(this, input, value, 1);
    }

    // supports only 2.0-style subtract(1, 's') or subtract(duration)
    function duration_add_subtract__subtract (input, value) {
        return duration_add_subtract__addSubtract(this, input, value, -1);
    }

    function absCeil (number) {
        if (number < 0) {
            return Math.floor(number);
        } else {
            return Math.ceil(number);
        }
    }

    function bubble () {
        var milliseconds = this._milliseconds;
        var days         = this._days;
        var months       = this._months;
        var data         = this._data;
        var seconds, minutes, hours, years, monthsFromDays;

        // if we have a mix of positive and negative values, bubble down first
        // check: https://github.com/moment/moment/issues/2166
        if (!((milliseconds >= 0 && days >= 0 && months >= 0) ||
                (milliseconds <= 0 && days <= 0 && months <= 0))) {
            milliseconds += absCeil(monthsToDays(months) + days) * 864e5;
            days = 0;
            months = 0;
        }

        // The following code bubbles up values, see the tests for
        // examples of what that means.
        data.milliseconds = milliseconds % 1000;

        seconds           = absFloor(milliseconds / 1000);
        data.seconds      = seconds % 60;

        minutes           = absFloor(seconds / 60);
        data.minutes      = minutes % 60;

        hours             = absFloor(minutes / 60);
        data.hours        = hours % 24;

        days += absFloor(hours / 24);

        // convert days to months
        monthsFromDays = absFloor(daysToMonths(days));
        months += monthsFromDays;
        days -= absCeil(monthsToDays(monthsFromDays));

        // 12 months -> 1 year
        years = absFloor(months / 12);
        months %= 12;

        data.days   = days;
        data.months = months;
        data.years  = years;

        return this;
    }

    function daysToMonths (days) {
        // 400 years have 146097 days (taking into account leap year rules)
        // 400 years have 12 months === 4800
        return days * 4800 / 146097;
    }

    function monthsToDays (months) {
        // the reverse of daysToMonths
        return months * 146097 / 4800;
    }

    function as (units) {
        var days;
        var months;
        var milliseconds = this._milliseconds;

        units = normalizeUnits(units);

        if (units === 'month' || units === 'year') {
            days   = this._days   + milliseconds / 864e5;
            months = this._months + daysToMonths(days);
            return units === 'month' ? months : months / 12;
        } else {
            // handle milliseconds separately because of floating point math errors (issue #1867)
            days = this._days + Math.round(monthsToDays(this._months));
            switch (units) {
                case 'week'   : return days / 7     + milliseconds / 6048e5;
                case 'day'    : return days         + milliseconds / 864e5;
                case 'hour'   : return days * 24    + milliseconds / 36e5;
                case 'minute' : return days * 1440  + milliseconds / 6e4;
                case 'second' : return days * 86400 + milliseconds / 1000;
                // Math.floor prevents floating point math errors here
                case 'millisecond': return Math.floor(days * 864e5) + milliseconds;
                default: throw new Error('Unknown unit ' + units);
            }
        }
    }

    // TODO: Use this.as('ms')?
    function duration_as__valueOf () {
        return (
            this._milliseconds +
            this._days * 864e5 +
            (this._months % 12) * 2592e6 +
            toInt(this._months / 12) * 31536e6
        );
    }

    function makeAs (alias) {
        return function () {
            return this.as(alias);
        };
    }

    var asMilliseconds = makeAs('ms');
    var asSeconds      = makeAs('s');
    var asMinutes      = makeAs('m');
    var asHours        = makeAs('h');
    var asDays         = makeAs('d');
    var asWeeks        = makeAs('w');
    var asMonths       = makeAs('M');
    var asYears        = makeAs('y');

    function duration_get__get (units) {
        units = normalizeUnits(units);
        return this[units + 's']();
    }

    function makeGetter(name) {
        return function () {
            return this._data[name];
        };
    }

    var milliseconds = makeGetter('milliseconds');
    var seconds      = makeGetter('seconds');
    var minutes      = makeGetter('minutes');
    var hours        = makeGetter('hours');
    var days         = makeGetter('days');
    var months       = makeGetter('months');
    var years        = makeGetter('years');

    function weeks () {
        return absFloor(this.days() / 7);
    }

    var round = Math.round;
    var thresholds = {
        s: 45,  // seconds to minute
        m: 45,  // minutes to hour
        h: 22,  // hours to day
        d: 26,  // days to month
        M: 11   // months to year
    };

    // helper function for moment.fn.from, moment.fn.fromNow, and moment.duration.fn.humanize
    function substituteTimeAgo(string, number, withoutSuffix, isFuture, locale) {
        return locale.relativeTime(number || 1, !!withoutSuffix, string, isFuture);
    }

    function duration_humanize__relativeTime (posNegDuration, withoutSuffix, locale) {
        var duration = create__createDuration(posNegDuration).abs();
        var seconds  = round(duration.as('s'));
        var minutes  = round(duration.as('m'));
        var hours    = round(duration.as('h'));
        var days     = round(duration.as('d'));
        var months   = round(duration.as('M'));
        var years    = round(duration.as('y'));

        var a = seconds < thresholds.s && ['s', seconds]  ||
                minutes <= 1           && ['m']           ||
                minutes < thresholds.m && ['mm', minutes] ||
                hours   <= 1           && ['h']           ||
                hours   < thresholds.h && ['hh', hours]   ||
                days    <= 1           && ['d']           ||
                days    < thresholds.d && ['dd', days]    ||
                months  <= 1           && ['M']           ||
                months  < thresholds.M && ['MM', months]  ||
                years   <= 1           && ['y']           || ['yy', years];

        a[2] = withoutSuffix;
        a[3] = +posNegDuration > 0;
        a[4] = locale;
        return substituteTimeAgo.apply(null, a);
    }

    // This function allows you to set a threshold for relative time strings
    function duration_humanize__getSetRelativeTimeThreshold (threshold, limit) {
        if (thresholds[threshold] === undefined) {
            return false;
        }
        if (limit === undefined) {
            return thresholds[threshold];
        }
        thresholds[threshold] = limit;
        return true;
    }

    function humanize (withSuffix) {
        var locale = this.localeData();
        var output = duration_humanize__relativeTime(this, !withSuffix, locale);

        if (withSuffix) {
            output = locale.pastFuture(+this, output);
        }

        return locale.postformat(output);
    }

    var iso_string__abs = Math.abs;

    function iso_string__toISOString() {
        // for ISO strings we do not use the normal bubbling rules:
        //  * milliseconds bubble up until they become hours
        //  * days do not bubble at all
        //  * months bubble up until they become years
        // This is because there is no context-free conversion between hours and days
        // (think of clock changes)
        // and also not between days and months (28-31 days per month)
        var seconds = iso_string__abs(this._milliseconds) / 1000;
        var days         = iso_string__abs(this._days);
        var months       = iso_string__abs(this._months);
        var minutes, hours, years;

        // 3600 seconds -> 60 minutes -> 1 hour
        minutes           = absFloor(seconds / 60);
        hours             = absFloor(minutes / 60);
        seconds %= 60;
        minutes %= 60;

        // 12 months -> 1 year
        years  = absFloor(months / 12);
        months %= 12;


        // inspired by https://github.com/dordille/moment-isoduration/blob/master/moment.isoduration.js
        var Y = years;
        var M = months;
        var D = days;
        var h = hours;
        var m = minutes;
        var s = seconds;
        var total = this.asSeconds();

        if (!total) {
            // this is the same as C#'s (Noda) and python (isodate)...
            // but not other JS (goog.date)
            return 'P0D';
        }

        return (total < 0 ? '-' : '') +
            'P' +
            (Y ? Y + 'Y' : '') +
            (M ? M + 'M' : '') +
            (D ? D + 'D' : '') +
            ((h || m || s) ? 'T' : '') +
            (h ? h + 'H' : '') +
            (m ? m + 'M' : '') +
            (s ? s + 'S' : '');
    }

    var duration_prototype__proto = Duration.prototype;

    duration_prototype__proto.abs            = duration_abs__abs;
    duration_prototype__proto.add            = duration_add_subtract__add;
    duration_prototype__proto.subtract       = duration_add_subtract__subtract;
    duration_prototype__proto.as             = as;
    duration_prototype__proto.asMilliseconds = asMilliseconds;
    duration_prototype__proto.asSeconds      = asSeconds;
    duration_prototype__proto.asMinutes      = asMinutes;
    duration_prototype__proto.asHours        = asHours;
    duration_prototype__proto.asDays         = asDays;
    duration_prototype__proto.asWeeks        = asWeeks;
    duration_prototype__proto.asMonths       = asMonths;
    duration_prototype__proto.asYears        = asYears;
    duration_prototype__proto.valueOf        = duration_as__valueOf;
    duration_prototype__proto._bubble        = bubble;
    duration_prototype__proto.get            = duration_get__get;
    duration_prototype__proto.milliseconds   = milliseconds;
    duration_prototype__proto.seconds        = seconds;
    duration_prototype__proto.minutes        = minutes;
    duration_prototype__proto.hours          = hours;
    duration_prototype__proto.days           = days;
    duration_prototype__proto.weeks          = weeks;
    duration_prototype__proto.months         = months;
    duration_prototype__proto.years          = years;
    duration_prototype__proto.humanize       = humanize;
    duration_prototype__proto.toISOString    = iso_string__toISOString;
    duration_prototype__proto.toString       = iso_string__toISOString;
    duration_prototype__proto.toJSON         = iso_string__toISOString;
    duration_prototype__proto.locale         = locale;
    duration_prototype__proto.localeData     = localeData;

    // Deprecations
    duration_prototype__proto.toIsoString = deprecate('toIsoString() is deprecated. Please use toISOString() instead (notice the capitals)', iso_string__toISOString);
    duration_prototype__proto.lang = lang;

    // Side effect imports

    // FORMATTING

    addFormatToken('X', 0, 0, 'unix');
    addFormatToken('x', 0, 0, 'valueOf');

    // PARSING

    addRegexToken('x', matchSigned);
    addRegexToken('X', matchTimestamp);
    addParseToken('X', function (input, array, config) {
        config._d = new Date(parseFloat(input, 10) * 1000);
    });
    addParseToken('x', function (input, array, config) {
        config._d = new Date(toInt(input));
    });

    // Side effect imports


    utils_hooks__hooks.version = '2.13.0';

    setHookCallback(local__createLocal);

    utils_hooks__hooks.fn                    = momentPrototype;
    utils_hooks__hooks.min                   = min;
    utils_hooks__hooks.max                   = max;
    utils_hooks__hooks.now                   = now;
    utils_hooks__hooks.utc                   = create_utc__createUTC;
    utils_hooks__hooks.unix                  = moment__createUnix;
    utils_hooks__hooks.months                = lists__listMonths;
    utils_hooks__hooks.isDate                = isDate;
    utils_hooks__hooks.locale                = locale_locales__getSetGlobalLocale;
    utils_hooks__hooks.invalid               = valid__createInvalid;
    utils_hooks__hooks.duration              = create__createDuration;
    utils_hooks__hooks.isMoment              = isMoment;
    utils_hooks__hooks.weekdays              = lists__listWeekdays;
    utils_hooks__hooks.parseZone             = moment__createInZone;
    utils_hooks__hooks.localeData            = locale_locales__getLocale;
    utils_hooks__hooks.isDuration            = isDuration;
    utils_hooks__hooks.monthsShort           = lists__listMonthsShort;
    utils_hooks__hooks.weekdaysMin           = lists__listWeekdaysMin;
    utils_hooks__hooks.defineLocale          = defineLocale;
    utils_hooks__hooks.updateLocale          = updateLocale;
    utils_hooks__hooks.locales               = locale_locales__listLocales;
    utils_hooks__hooks.weekdaysShort         = lists__listWeekdaysShort;
    utils_hooks__hooks.normalizeUnits        = normalizeUnits;
    utils_hooks__hooks.relativeTimeThreshold = duration_humanize__getSetRelativeTimeThreshold;
    utils_hooks__hooks.prototype             = momentPrototype;

    var _moment = utils_hooks__hooks;

    return _moment;

}));
},{}],46:[function(require,module,exports){
'use strict';

module.exports = require('./lib')

},{"./lib":51}],47:[function(require,module,exports){
'use strict';

var asap = require('asap/raw');

function noop() {}

// States:
//
// 0 - pending
// 1 - fulfilled with _value
// 2 - rejected with _value
// 3 - adopted the state of another promise, _value
//
// once the state is no longer pending (0) it is immutable

// All `_` prefixed properties will be reduced to `_{random number}`
// at build time to obfuscate them and discourage their use.
// We don't use symbols or Object.defineProperty to fully hide them
// because the performance isn't good enough.


// to avoid using try/catch inside critical functions, we
// extract them to here.
var LAST_ERROR = null;
var IS_ERROR = {};
function getThen(obj) {
  try {
    return obj.then;
  } catch (ex) {
    LAST_ERROR = ex;
    return IS_ERROR;
  }
}

function tryCallOne(fn, a) {
  try {
    return fn(a);
  } catch (ex) {
    LAST_ERROR = ex;
    return IS_ERROR;
  }
}
function tryCallTwo(fn, a, b) {
  try {
    fn(a, b);
  } catch (ex) {
    LAST_ERROR = ex;
    return IS_ERROR;
  }
}

module.exports = Promise;

function Promise(fn) {
  if (typeof this !== 'object') {
    throw new TypeError('Promises must be constructed via new');
  }
  if (typeof fn !== 'function') {
    throw new TypeError('not a function');
  }
  this._45 = 0;
  this._81 = 0;
  this._65 = null;
  this._54 = null;
  if (fn === noop) return;
  doResolve(fn, this);
}
Promise._10 = null;
Promise._97 = null;
Promise._61 = noop;

Promise.prototype.then = function(onFulfilled, onRejected) {
  if (this.constructor !== Promise) {
    return safeThen(this, onFulfilled, onRejected);
  }
  var res = new Promise(noop);
  handle(this, new Handler(onFulfilled, onRejected, res));
  return res;
};

function safeThen(self, onFulfilled, onRejected) {
  return new self.constructor(function (resolve, reject) {
    var res = new Promise(noop);
    res.then(resolve, reject);
    handle(self, new Handler(onFulfilled, onRejected, res));
  });
};
function handle(self, deferred) {
  while (self._81 === 3) {
    self = self._65;
  }
  if (Promise._10) {
    Promise._10(self);
  }
  if (self._81 === 0) {
    if (self._45 === 0) {
      self._45 = 1;
      self._54 = deferred;
      return;
    }
    if (self._45 === 1) {
      self._45 = 2;
      self._54 = [self._54, deferred];
      return;
    }
    self._54.push(deferred);
    return;
  }
  handleResolved(self, deferred);
}

function handleResolved(self, deferred) {
  asap(function() {
    var cb = self._81 === 1 ? deferred.onFulfilled : deferred.onRejected;
    if (cb === null) {
      if (self._81 === 1) {
        resolve(deferred.promise, self._65);
      } else {
        reject(deferred.promise, self._65);
      }
      return;
    }
    var ret = tryCallOne(cb, self._65);
    if (ret === IS_ERROR) {
      reject(deferred.promise, LAST_ERROR);
    } else {
      resolve(deferred.promise, ret);
    }
  });
}
function resolve(self, newValue) {
  // Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
  if (newValue === self) {
    return reject(
      self,
      new TypeError('A promise cannot be resolved with itself.')
    );
  }
  if (
    newValue &&
    (typeof newValue === 'object' || typeof newValue === 'function')
  ) {
    var then = getThen(newValue);
    if (then === IS_ERROR) {
      return reject(self, LAST_ERROR);
    }
    if (
      then === self.then &&
      newValue instanceof Promise
    ) {
      self._81 = 3;
      self._65 = newValue;
      finale(self);
      return;
    } else if (typeof then === 'function') {
      doResolve(then.bind(newValue), self);
      return;
    }
  }
  self._81 = 1;
  self._65 = newValue;
  finale(self);
}

function reject(self, newValue) {
  self._81 = 2;
  self._65 = newValue;
  if (Promise._97) {
    Promise._97(self, newValue);
  }
  finale(self);
}
function finale(self) {
  if (self._45 === 1) {
    handle(self, self._54);
    self._54 = null;
  }
  if (self._45 === 2) {
    for (var i = 0; i < self._54.length; i++) {
      handle(self, self._54[i]);
    }
    self._54 = null;
  }
}

function Handler(onFulfilled, onRejected, promise){
  this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
  this.onRejected = typeof onRejected === 'function' ? onRejected : null;
  this.promise = promise;
}

/**
 * Take a potentially misbehaving resolver function and make sure
 * onFulfilled and onRejected are only called once.
 *
 * Makes no guarantees about asynchrony.
 */
function doResolve(fn, promise) {
  var done = false;
  var res = tryCallTwo(fn, function (value) {
    if (done) return;
    done = true;
    resolve(promise, value);
  }, function (reason) {
    if (done) return;
    done = true;
    reject(promise, reason);
  })
  if (!done && res === IS_ERROR) {
    done = true;
    reject(promise, LAST_ERROR);
  }
}

},{"asap/raw":2}],48:[function(require,module,exports){
'use strict';

var Promise = require('./core.js');

module.exports = Promise;
Promise.prototype.done = function (onFulfilled, onRejected) {
  var self = arguments.length ? this.then.apply(this, arguments) : this;
  self.then(null, function (err) {
    setTimeout(function () {
      throw err;
    }, 0);
  });
};

},{"./core.js":47}],49:[function(require,module,exports){
'use strict';

//This file contains the ES6 extensions to the core Promises/A+ API

var Promise = require('./core.js');

module.exports = Promise;

/* Static Functions */

var TRUE = valuePromise(true);
var FALSE = valuePromise(false);
var NULL = valuePromise(null);
var UNDEFINED = valuePromise(undefined);
var ZERO = valuePromise(0);
var EMPTYSTRING = valuePromise('');

function valuePromise(value) {
  var p = new Promise(Promise._61);
  p._81 = 1;
  p._65 = value;
  return p;
}
Promise.resolve = function (value) {
  if (value instanceof Promise) return value;

  if (value === null) return NULL;
  if (value === undefined) return UNDEFINED;
  if (value === true) return TRUE;
  if (value === false) return FALSE;
  if (value === 0) return ZERO;
  if (value === '') return EMPTYSTRING;

  if (typeof value === 'object' || typeof value === 'function') {
    try {
      var then = value.then;
      if (typeof then === 'function') {
        return new Promise(then.bind(value));
      }
    } catch (ex) {
      return new Promise(function (resolve, reject) {
        reject(ex);
      });
    }
  }
  return valuePromise(value);
};

Promise.all = function (arr) {
  var args = Array.prototype.slice.call(arr);

  return new Promise(function (resolve, reject) {
    if (args.length === 0) return resolve([]);
    var remaining = args.length;
    function res(i, val) {
      if (val && (typeof val === 'object' || typeof val === 'function')) {
        if (val instanceof Promise && val.then === Promise.prototype.then) {
          while (val._81 === 3) {
            val = val._65;
          }
          if (val._81 === 1) return res(i, val._65);
          if (val._81 === 2) reject(val._65);
          val.then(function (val) {
            res(i, val);
          }, reject);
          return;
        } else {
          var then = val.then;
          if (typeof then === 'function') {
            var p = new Promise(then.bind(val));
            p.then(function (val) {
              res(i, val);
            }, reject);
            return;
          }
        }
      }
      args[i] = val;
      if (--remaining === 0) {
        resolve(args);
      }
    }
    for (var i = 0; i < args.length; i++) {
      res(i, args[i]);
    }
  });
};

Promise.reject = function (value) {
  return new Promise(function (resolve, reject) {
    reject(value);
  });
};

Promise.race = function (values) {
  return new Promise(function (resolve, reject) {
    values.forEach(function(value){
      Promise.resolve(value).then(resolve, reject);
    });
  });
};

/* Prototype Methods */

Promise.prototype['catch'] = function (onRejected) {
  return this.then(null, onRejected);
};

},{"./core.js":47}],50:[function(require,module,exports){
'use strict';

var Promise = require('./core.js');

module.exports = Promise;
Promise.prototype['finally'] = function (f) {
  return this.then(function (value) {
    return Promise.resolve(f()).then(function () {
      return value;
    });
  }, function (err) {
    return Promise.resolve(f()).then(function () {
      throw err;
    });
  });
};

},{"./core.js":47}],51:[function(require,module,exports){
'use strict';

module.exports = require('./core.js');
require('./done.js');
require('./finally.js');
require('./es6-extensions.js');
require('./node-extensions.js');
require('./synchronous.js');

},{"./core.js":47,"./done.js":48,"./es6-extensions.js":49,"./finally.js":50,"./node-extensions.js":52,"./synchronous.js":53}],52:[function(require,module,exports){
'use strict';

// This file contains then/promise specific extensions that are only useful
// for node.js interop

var Promise = require('./core.js');
var asap = require('asap');

module.exports = Promise;

/* Static Functions */

Promise.denodeify = function (fn, argumentCount) {
  if (
    typeof argumentCount === 'number' && argumentCount !== Infinity
  ) {
    return denodeifyWithCount(fn, argumentCount);
  } else {
    return denodeifyWithoutCount(fn);
  }
}

var callbackFn = (
  'function (err, res) {' +
  'if (err) { rj(err); } else { rs(res); }' +
  '}'
);
function denodeifyWithCount(fn, argumentCount) {
  var args = [];
  for (var i = 0; i < argumentCount; i++) {
    args.push('a' + i);
  }
  var body = [
    'return function (' + args.join(',') + ') {',
    'var self = this;',
    'return new Promise(function (rs, rj) {',
    'var res = fn.call(',
    ['self'].concat(args).concat([callbackFn]).join(','),
    ');',
    'if (res &&',
    '(typeof res === "object" || typeof res === "function") &&',
    'typeof res.then === "function"',
    ') {rs(res);}',
    '});',
    '};'
  ].join('');
  return Function(['Promise', 'fn'], body)(Promise, fn);
}
function denodeifyWithoutCount(fn) {
  var fnLength = Math.max(fn.length - 1, 3);
  var args = [];
  for (var i = 0; i < fnLength; i++) {
    args.push('a' + i);
  }
  var body = [
    'return function (' + args.join(',') + ') {',
    'var self = this;',
    'var args;',
    'var argLength = arguments.length;',
    'if (arguments.length > ' + fnLength + ') {',
    'args = new Array(arguments.length + 1);',
    'for (var i = 0; i < arguments.length; i++) {',
    'args[i] = arguments[i];',
    '}',
    '}',
    'return new Promise(function (rs, rj) {',
    'var cb = ' + callbackFn + ';',
    'var res;',
    'switch (argLength) {',
    args.concat(['extra']).map(function (_, index) {
      return (
        'case ' + (index) + ':' +
        'res = fn.call(' + ['self'].concat(args.slice(0, index)).concat('cb').join(',') + ');' +
        'break;'
      );
    }).join(''),
    'default:',
    'args[argLength] = cb;',
    'res = fn.apply(self, args);',
    '}',
    
    'if (res &&',
    '(typeof res === "object" || typeof res === "function") &&',
    'typeof res.then === "function"',
    ') {rs(res);}',
    '});',
    '};'
  ].join('');

  return Function(
    ['Promise', 'fn'],
    body
  )(Promise, fn);
}

Promise.nodeify = function (fn) {
  return function () {
    var args = Array.prototype.slice.call(arguments);
    var callback =
      typeof args[args.length - 1] === 'function' ? args.pop() : null;
    var ctx = this;
    try {
      return fn.apply(this, arguments).nodeify(callback, ctx);
    } catch (ex) {
      if (callback === null || typeof callback == 'undefined') {
        return new Promise(function (resolve, reject) {
          reject(ex);
        });
      } else {
        asap(function () {
          callback.call(ctx, ex);
        })
      }
    }
  }
}

Promise.prototype.nodeify = function (callback, ctx) {
  if (typeof callback != 'function') return this;

  this.then(function (value) {
    asap(function () {
      callback.call(ctx, null, value);
    });
  }, function (err) {
    asap(function () {
      callback.call(ctx, err);
    });
  });
}

},{"./core.js":47,"asap":1}],53:[function(require,module,exports){
'use strict';

var Promise = require('./core.js');

module.exports = Promise;
Promise.enableSynchronous = function () {
  Promise.prototype.isPending = function() {
    return this.getState() == 0;
  };

  Promise.prototype.isFulfilled = function() {
    return this.getState() == 1;
  };

  Promise.prototype.isRejected = function() {
    return this.getState() == 2;
  };

  Promise.prototype.getValue = function () {
    if (this._81 === 3) {
      return this._65.getValue();
    }

    if (!this.isFulfilled()) {
      throw new Error('Cannot get a value of an unfulfilled promise.');
    }

    return this._65;
  };

  Promise.prototype.getReason = function () {
    if (this._81 === 3) {
      return this._65.getReason();
    }

    if (!this.isRejected()) {
      throw new Error('Cannot get a rejection reason of a non-rejected promise.');
    }

    return this._65;
  };

  Promise.prototype.getState = function () {
    if (this._81 === 3) {
      return this._65.getState();
    }
    if (this._81 === -1 || this._81 === -2) {
      return 0;
    }

    return this._81;
  };
};

Promise.disableSynchronous = function() {
  Promise.prototype.isPending = undefined;
  Promise.prototype.isFulfilled = undefined;
  Promise.prototype.isRejected = undefined;
  Promise.prototype.getValue = undefined;
  Promise.prototype.getReason = undefined;
  Promise.prototype.getState = undefined;
};

},{"./core.js":47}],"aggregated_link.js":[function(require,module,exports){
'use strict';

var Immutable = null;

function aggregatedLink(link, nodeGui) {
    return {
        selected:      link.selected,
        loop:          link.loop,
        type:          link.type,
        coefficient:   link.coefficient,
        timelag:       link.timelag,
        bidirectional: link.bidirectional,
        debugNode:     nodeGui[link.node1].selected,
        x1:            nodeGui[link.node1].x,
        y1:            nodeGui[link.node1].y,
        x2:            nodeGui[link.node2].x,
        y2:            nodeGui[link.node2].y,
        width:         parseFloat(link.width),
        fromRadius:    parseFloat(nodeGui[link.node1].radius),
        targetRadius:  parseFloat(nodeGui[link.node2].radius)
    };
};

module.exports = aggregatedLink;
},{}],"algorithms/algorithms.js":[function(require,module,exports){
'use strict';

module.exports = {
    sort: require('./sort.js')
};
},{"./sort.js":"algorithms/sort.js"}],"algorithms/package.json":[function(require,module,exports){
module.exports={
    "name": "algorithms",
    "main": "./algorithms.js"
}
},{}],"algorithms/sort.js":[function(require,module,exports){
'use strict';

function swap(arr, i, j) {
    var t  = arr[j];
    arr[j] = arr[i];
    arr[i] = t;
}

function quicksort(arr, low, high) {
    if(low < high) {
        var p = partition(arr, low, high);
        quicksort(arr, low,   p - 1);
        quicksort(arr, p + 1, high);
    }
}

function partition(arr, low, high) {
    var pivot = arr[high],
        i     = low;
    for(var j = low; j < high; j++) {
        if(arr[j] <= pivot) {
            swap(arr, i, j);
            i += 1;
        }
    }

    swap(arr, i, high);
    return i;
}

function partitionCallback(arr, low, high, cb) {
    var pivot = arr[high],
        i     = low;
    for(var j = low; j < high; j++) {
        if(cb(arr[j], pivot) <= 0) {
            swap(arr, i, j);
            i += 1;
        }
    }

    swap(arr, i, high);
    return i;
}

function quicksortCallback(arr, low, high, cb) {
    if(low < high) {
        var p = partitionCallback(arr, low, high, cb);
        quicksortCallback(arr, low,   p - 1, cb);
        quicksortCallback(arr, p + 1, high, cb);
    }
}

function quicksortArray(arr, cb) {
    if(cb && typeof cb === 'function') {
        return quicksortCallback(arr, 0, arr.length - 1, cb);
    }

    quicksort(arr, 0, arr.length - 1);
}

function sortedGetInsertIndex(arr, value) {
    if(value >= arr[arr.length - 1]) {
        return arr.length;
    } else if(value <= arr[0]) {
        return 0;        
    }

    var start  = 0;
    var length = arr.length;

    while(length >= start) {
        var t = parseInt((start + length) / 2);
        if(arr[t] === value) {
            return t;
        } else if(arr[t] < value) {
            length = t - 1;
        } else {
            start  = t + 1;
        }
    }

    return -1;
}



module.exports = {
    quicksort:            quicksort,
    quicksortArray:       quicksortArray,
    sortedGetInsertIndex: sortedGetInsertIndex
};
},{}],"async_middleware.js":[function(require,module,exports){
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
        var sumX = 0,
            sumY = 0;

        var parent = canvas.offsetParent;
        while(parent) {
            if(parent.offsetLeft) {
                sumX += parent.offsetLeft;
            }

            if(parent.offsetTop) {
                sumY += parent.offsetTop;
            }

            parent = parent.offsetParent;
        }

        sumX += canvas.offsetLeft;
        sumY += canvas.offsetTop;

        var x = pos.x - sumX + (canvas.panX || 0);
        var y = pos.y - sumY + (canvas.panY || 0);

		return {x: x, y: y};
	},

	canvasToMouse: function(pos, canvas) {
        var sumX = 0,
            sumY = 0;

        var parent = canvas.offsetParent;
        while(parent) {
            if(parent.offsetLeft) {
                sumX += parent.offsetLeft;
            }

            if(parent.offsetTop) {
                sumY += parent.offsetTop;
            }

            parent = parent.offsetParent;
        }

        sumX += canvas.offsetLeft;
        sumY += canvas.offsetTop;

        var x = pos.x + sumX - (canvas.panX || 0);
        var y = pos.y + sumY - (canvas.panY || 0);

		return {x: x, y: y};
	}
};

},{}],"canvas/canvas.js":[function(require,module,exports){
'use strict';

module.exports = function(container, canvas) {
    canvas.width  = container.offsetWidth;
    canvas.height = ((container.offsetHeight-20) * 0.50);

    var timer = null;

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
},{"./object-helper.js":"object-helper.js"}],"curry.js":[function(require,module,exports){
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

        /*this.span           = document.createElement('span');
        this.span.className = 'glyphicon glyphicon-remove';*/

        //this.killButton.appendChild(this.span);

        this.title.appendChild(this.killButton);
        this.title.appendChild(this.clear);
        
        this.container.appendChild(this.title);
        this.container.appendChild(this.body);

        this.killCallback = function() {
            that.destroyWindow();
        };

        this.killButton.addEventListener('click', this.killCallback);

        var lastX  = 0,
            lastY  = 0;

        this.initializeMove = function(pos) {
            lastX = pos.clientX;
            lastY = pos.clientY;

            document.body.addEventListener('mousemove', moveCallback);
            document.body.addEventListener('mouseup',   that.deactivateMove);
        };

        this.deactivateMove = function() {
            document.body.removeEventListener('mousemove', moveCallback);
            document.body.removeEventListener('mouseup',   that.deactivateMove);
        };

        var moveCallback = function(pos) {
            var newX = pos.clientX - lastX,
                newY = pos.clientY - lastY;

            lastX = pos.clientX;
            lastY = pos.clientY;

            that.x = that.x + newX;
            that.y = that.y  + newY;

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

module.exports = function drawChange(ctx, x, y, radius, value) {
    ctx.fillStyle = valueColors.neutral;
    if(value > 0) {
        ctx.fillStyle = valueColors.positive;
    } else if(value < 0) {
        ctx.fillStyle = valueColors.negative;
    } else if(isNaN(value)) {
        return;
    }
    
    ctx.textBaseline = 'top';
    ctx.font         = '22px Monospace';

    var valueString = value + '%';

    var charLength = radius / valueString.length;
    var height     = charLength / 0.6;

    ctx.font = height + 'px Monospace';
    var textData = ctx.measureText(valueString);

    ctx.fillText(valueString, x - textData.width / 2, (y + 4) - (height / 2));
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
    
    console.log('Linegraph drawn.');
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

        arrowLength    = 25,

        startX         = x1 + Math.cos(angle) * (fromRadius),
        startY         = y1 + Math.sin(angle) * (fromRadius),
        
        arrowEndX      = x1 + Math.cos(angle) * (distance - (targetRadius + halfLineWidth)),
        arrowEndY      = y1 + Math.sin(angle) * (distance - (targetRadius + halfLineWidth)),

        arrowMiddleX   = startX + Math.cos(angle) * ((distance - fromRadius - targetRadius) / 2),
        arrowMiddleY   = startY + Math.sin(angle) * ((distance - fromRadius - targetRadius) / 2),
        
        arrowStartX    = x1 + Math.cos(angle) * (distance - (targetRadius + arrowLength)),
        arrowStartY    = y1 + Math.sin(angle) * (distance - (targetRadius + arrowLength)),
        
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

    if(line.bidirectional) {
        var bidirectionalArrowEndX    = startX + Math.cos(angle) * (halfLineWidth),
            bidirectionalArrowEndY    = startY + Math.sin(angle) * (halfLineWidth),

            startX                    = startX + Math.cos(angle) * arrowLength,
            startY                    = startY + Math.sin(angle) * arrowLength,

            bidirectionalLeftAnchorX  = startX + Math.cos(leftAngle) * anchorDistance,
            bidirectionalLeftAnchorY  = startY + Math.sin(leftAngle) * anchorDistance,

            bidirectionalRightAnchorX = startX + Math.cos(rightAngle) * anchorDistance,
            bidirectionalRightAnchorY = startY + Math.sin(rightAngle) * anchorDistance;

        ctx.moveTo(startX, startY);
        ctx.lineTo(bidirectionalLeftAnchorX, bidirectionalLeftAnchorY);
        ctx.lineTo(bidirectionalArrowEndX, bidirectionalArrowEndY);
        ctx.lineTo(bidirectionalRightAnchorX, bidirectionalRightAnchorY);
        ctx.lineTo(startX, startY);
    }

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

    if(map.linegraph && map.color) {
        ctx.strokeStyle = map.color;
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

var images = {};
var PLACEHOLDER_PATH = 'img/not-found.png';

function drawScaledImage(ctx, image, x, y, w, h) {
    if(w > image.width || h > image.h) {
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

function drawPicture(ctx, imagePath, map, refresh) {
    refresh = refresh || drawPicture;
    
    var img = null;
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
            images[imagePath] = map.url + '/' + placeholder;
        }
    } else {
        img = new Image();   // Create new img element

        images[imagePath] = img;
        img.src = map.url + '/' + imagePath; // Set source path
        img.isLoading = true;
        img.nodesWaiting = [
            map
        ];
        
        img.onload = function() {
            img.isLoading = false;
            
            img.nodesWaiting.forEach(function(_map) {
                drawImage(ctx, img, _map);
            });

            img.nodesWaiting = undefined;
        };
        
        img.onerror = function(error) {
            images[imagePath] = placeholder;
            if(!placeholder.src) {
                placeholder.src = map.url + '/' + PLACEHOLDER_PATH;
                placeholder.isLoading = true;
                placeholder.nodesWaiting = [
                    map
                ];

                placeholder.onload = function() {
                    placeholder.nodesWaiting.forEach(function(_map) {
                        drawImage(ctx, placeholder, _map);
                    });

                    placeholder.isLoading = false;

                    delete placeholder.nodesWaiting;
                };
            } else if(placeholder.isLoading) {
                placeholder.nodesWaiting.push(map);
            } else {
                drawImage(ctx, placeholder, map)
            }
        };
    }
}

module.exports = drawPicture;

},{}],"graphics/draw_text.js":[function(require,module,exports){
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

module.exports = function drawTimeTable(ctx, gui, map) {
    var data = map.steps;

    var size   = 24,
        startY = ((gui.y - size / 2) - ((size * objectHelper.size.call(data)) / 2)),

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

    var valueX   = gui.x - gui.radius - longestValue - 8,
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

function icon(map) {
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
		//x: map.x + (map.iconXOffset || 0) - map.radius * 0.707,
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

            /*model.refresh = true;
            model.propagate();*/
            model.emit('refresh');
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

        model.emit('refresh');
    },

    onUp: function(canvas, model) {

    }
};

},{"../canvas/arithmetics.js":"canvas/arithmetics.js","../structures/create_link":"structures/create_link.js","./../collisions.js":"collisions.js","./../linker.js":"linker.js"}],"input/hotkey_v.js":[function(require,module,exports){
'use strict';

module.exports = {
    keyCode: 86,
    global:  true,
    onDown:  function(canvas, model, evt) {
        if(model.static.modifiers.indexOf(18) === -1) {
            return;
        }
        
        evt.preventDefault();
    },

    onUp: function(canvas, model, evt) {
        if(model.static.modifiers.indexOf(18) === -1) {
            return;
        }

        model.emit('invertSidebar');
        evt.preventDefault();
    }
};

},{}],"input/hotkey_y.js":[function(require,module,exports){
'use strict';

var SHIFT = 16,
    CTRL  = 17,
    ALT   = 18,
    ALTGR = 225;

module.exports = {
    keyCode: 89,
    onDown:  function(canvas, model, evt) {
        if(model.static.modifiers.indexOf(CTRL) === -1) {
            return;
        }

        model.redo();
    },

    onUp: function(canvas, model, evt) {

    }
};

},{}],"input/hotkey_z.js":[function(require,module,exports){
'use strict';

var SHIFT = 16,
    CTRL  = 17,
    ALT   = 18,
    ALTGR = 225;

module.exports = {
    keyCode: 90,
    onDown:  function(canvas, model, evt) {
        if(model.static.modifiers.indexOf(CTRL) === -1) {
            return;
        }

        model.undo();
    },

    onUp: function(canvas, model, evt) {

    }
};

},{}],"input/mleft_down.js":[function(require,module,exports){
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

    if(data.resetUI) {
        loadedModel.emit('resetUI');
    }

    if(data.refreshLinegraph) {
        loadedModel.emit('refreshLinegraph');
    }

    loadedModel.emit('select');

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

    collidedNodes = objectHelper.slice.call(collidedNodes, -1);
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

    //loadedModel.refresh = true;
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

    //loadedModel.refresh = true;
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
        x: (node.linkerX || node.x + node.radius * 0.9),
        y: (node.linkerY || node.y + node.radius * 0.9),
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

function inflateModel(container, exportUnder, userFilter, projectFilter) {
    if(!isElement(container)) {
        throw new Error('Not an element given to inflateModel');
    }

    container.className = 'mb-container';

    var curry        = require('./curry.js'),
        strictCurry  = require('./strict_curry.js'),
        Immutable    = null,
        canvas       = require('./canvas'),
        linker       = require('./linker.js'),
        generateId   = require('./generate_id.js');

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

    if(typeof exportUnder === 'string' && typeof userFilter === 'string' && projectFilter === undefined) {
        projectFilter = userFilter;
        userFilter    = exportUnder;
        exportUnder   = undefined;
    }

    if(typeof projectFilter !== 'string' || typeof userFilter !== 'string') {
        throw new Error('Need to initialize inflateModel with a user and project id.');
    }

    var configObject = {
        protocol:      protocol,
        hostname:      hostname,
        port:          parseInt(port),
        userFilter:    userFilter,
        projectFilter: projectFilter,
        url:           protocol + '://' + hostname + portString
    };

    var objectHelper = require('./object-helper.js');

    /*var menuHeader       = document.createElement('div'),
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

    sidebar.appendChild(sidebarContainer);*/

    var leftMain           = document.createElement('div'),
        notificationBarDiv = document.createElement('div'),
        mainCanvasC        = document.createElement('canvas'),
        linegraphCanvasC   = document.createElement('canvas');

    notificationBarDiv.style.left = (maxWidth - 200) + 'px';

    leftMain.className            = 'left main';
    leftMain.style.position       = 'relative';

    notificationBarDiv.className  = 'mb-notification-bar';
    mainCanvasC.className         = 'main-canvas';
    linegraphCanvasC.className    = 'linegraph';

    var NewUI   = require('./new_ui');
    var Colors  = NewUI.Colors,
        sidebar = new NewUI.Sidebar(200);

    sidebar.appendTo(leftMain);
    leftMain.appendChild(notificationBarDiv);
    leftMain.appendChild(mainCanvasC);
    leftMain.appendChild(linegraphCanvasC);

    /*container.appendChild(menuHeader);
    container.appendChild(sidebar);*/
    container.appendChild(leftMain);

    var mainCanvas       = canvas(container, mainCanvasC),
        linegraphCanvas  = canvas(container, linegraphCanvasC);

    /*var mainCanvas       = canvas(document.getElementById('canvas'),    refresh);
    var linegraphCanvas  = canvas(document.getElementById('linegraph'), refresh);*/

    var colorValues      = require('./graphics/value_colors.js'),
        modelLayer       = require('./model_layer.js'),
        menuBuilder      = require('./menu_builder'),
        notification     = require('./notification_bar'),
        network          = require('./network'),
        informationTree  = require('./information_tree'),
        UI               = require('./ui');

    //notificationBar.setContainer(notificationBarDiv);
    
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

    loadedModel.static        = {};
    loadedModel.static.width  = container.offsetWidth;
    loadedModel.static.height = container.offsetHeight;

    var timer = null;
    window.addEventListener('resize', function() {
        if (timer !== null) {
            clearTimeout(timer);
        }

        timer = setTimeout(function() {
            mainCanvas.width            = container.offsetWidth;
            linegraphCanvas.width       = container.offsetWidth;
            /*mainCanvas.height           = container.offsetHeight;
            linegraphCanvas.height      = container.offsetHeight;*/

            loadedModel.static.width  = container.offsetWidth;
            loadedModel.static.height = container.offsetHeight;

            //sidebar.style['max-height'] = (container.offsetHeight - 44) + 'px';

            refresh();
        }, 500);
    });

    if(!window.sense4us[container.getAttribute('id')]) {
        window.sense4us[container.getAttribute('id')] = {};
    }

    if(!window.sense4us.models) {
        window.sense4us.models = {
            unsorted: []
        };
    }

    if(exportUnder && typeof exportUnder === 'string' && exportUnder !== 'unsorted') {
        window.sense4us.models[exportUnder] = loadedModel;
    } else {
        if(exportUnder === 'unsorted') {
            console.warn('Can\'t add a model with id unsorted.');
        }
        window.sense4us.models.unsorted.push(loadedModel);
    }

    loadedModel.CONFIG = configObject;

    var settings      = require('./settings');

    window.Immutable  = Immutable;
    window.collisions = require('./collisions.js');

    var context       = mainCanvas.getContext('2d');

    var mouseEventEmitter = require('./mechanics/mouse_event_emitter.js');

    mouseEventEmitter(mainCanvas, loadedModel);

    container.addEventListener('mousedown', function(ev) {
        window.sense4us.lastTarget = ev.target;
    });
    
    var keyboardHandler = require('./mechanics/keyboard_handler.js'),
        hotkeyE         = require('./input/hotkey_e.js'),
        hotkeyZ         = require('./input/hotkey_z.js'),
        hotkeyY         = require('./input/hotkey_y.js'),
        hotkeyV         = require('./input/hotkey_v.js'),
        hotkeyESC       = require('./input/hotkey_esc.js');

    keyboardHandler(document.body, mainCanvas, loadedModel, [hotkeyE, hotkeyZ, hotkeyY, hotkeyESC]);

    var zoom = 1;
    function MouseWheelHandler(e) {
        var mouse_canvas_x = e.x - mainCanvas.offsetLeft;
        var mouse_canvas_y = e.y - mainCanvas.offsetTop;
        var scaleX = loadedModel.settings.scaleX || 1;
        var scaleY = loadedModel.settings.scaleY || 1;
        var mouse_stage_x = mouse_canvas_x / scaleX - (loadedModel.settings.offsetX || 0) / scaleX;
        var mouse_stage_y = mouse_canvas_y / scaleY - (loadedModel.settings.offsetY || 0) / scaleY;

        if (Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail))) > 0) {
            zoom = 1.05;
        } else {
            zoom = 1/1.05;
        }
        
        scaleX = scaleY *= zoom;

        var mouse_stage_new_x = mouse_canvas_x / scaleX - (loadedModel.settings.offsetX || 0) / scaleX;
        var mouse_stage_new_y = mouse_canvas_y / scaleY - (loadedModel.settings.offsetY || 0) / scaleY;

        var zoom_effect_x = (mouse_stage_new_x - mouse_stage_x) * scaleX;
        var zoom_effect_y = (mouse_stage_new_y - mouse_stage_y) * scaleY;
        
        loadedModel.settings.offsetX = ((loadedModel.settings.offsetX || 0) + zoom_effect_x);
        loadedModel.settings.offsetY = ((loadedModel.settings.offsetY || 0) + zoom_effect_y);

        loadedModel.settings.scaleX = scaleX;
        loadedModel.settings.scaleY = scaleY;
    }

    var aggregatedLink   = require('./aggregated_link.js');
    var refreshNamespace = require('./refresh');

    var asyncMiddleware  = require('./async_middleware');

    var lastShow;
    function showLineGraph(ctx, canvas, loadedModel, selectedMenu, next) {
        var show = loadedModel.settings.linegraph;

        if(show && lastShow !== show) {
            mainCanvas.height      = Math.ceil(((container.offsetHeight-20) * 0.5));
            linegraphCanvas.height = Math.floor(((container.offsetHeight-20) * 0.5));

            console.log('Shown again.');
            if(lastShow !== show) {
                linegraphRefresh();
            }
        } else if(!show) {
            mainCanvas.height      = container.offsetHeight;
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

    var modelling = require('./settings/modelling.js');
    function setupIconGroups(sidebar, modelling) {
        var menuItem = new NewUI.MenuItem(300);
        menuItem.child.clicks = [];
        NewUI.Button.prototype.click.call(menuItem.child, function(evt) {
            if(!evt.target.groupOwner) {
                return;
            }

            var button = evt.target.groupOwner;
            button.constructor(loadedModel, {
                name: button.name,
                role: button.role.toUpperCase()
            }, {
                avatar: button.nodeImageSrc
            });
        });

        modelling.forEach(function(nodeGroup) {
            var group = menuItem.addIconGroup(nodeGroup.header);
            nodeGroup.images.forEach(function(image) {
                var button                   = group.addIcon(configObject.url + '/' + image.src);

                button.root.groupOwner       = button;
                button.image.root.groupOwner = button;

                button.image.root.style['border-radius'] = '50%';

                button.name                  = image.header;
                button.role                  = nodeGroup.header;
                button.constructor           = nodeGroup.callback;
                button.nodeImageSrc          = image.src;
            });
        });

        sidebar.addItem(menuItem);

        return menuItem;
    }

    var _ = setupIconGroups(sidebar, modelling);
    _.setLabel('Modelling');

    function setupSimulate(sidebar, simulate) {
        var menuItem = new NewUI.MenuItem(300);
        var items    = {};

        simulate.forEach(function(row) {
            switch(row.type) {
                case 'BUTTON':
                    var button = menuItem.addButton(row.header, function() {
                        row.callback(loadedModel)
                    });

                    if(row.id) {
                        items[row.id] = button;
                    }
                    break;
                case 'CHECKBOX':
                    var checkbox = menuItem.addCheckbox(row.header);

                    checkbox.onCheck(function() {
                        row.onCheck(loadedModel);
                    });

                    checkbox.onUncheck(function() {
                        row.onUncheck(loadedModel);
                    });

                    if(row.id) {
                        items[row.id] = button;
                    }
                    break; 
                case 'DROPDOWN':
                    var dropdown = menuItem.addDropdown(row.header, row.values);

                    dropdown.defaultValue(function() {
                        return row.defaultValue(loadedModel, row.values);
                    });

                    dropdown.onChange(function() {
                        row.onChange(loadedModel, dropdown.getValue());
                    });

                    if(row.id) {
                        items[row.id] = dropdown;
                    }
                    break;
                case 'SLIDER':
                    var range = row.range(loadedModel);
                    var slider = menuItem.addSlider(row.header, range[0], range[1]);

                    slider.defaultValue(function() {
                        var range = row.range(loadedModel);
                        slider.setMin(range[0]);
                        slider.setMax(range[1]);

                        return row.defaultValue(loadedModel);
                    });

                    if(row.onSlide) {
                        slider.onInput(function() {
                            row.onSlide(loadedModel, slider.getValue());
                        });
                    }

                    slider.onChange(function() {
                        row.onChange(loadedModel, slider.getValue());
                    });

                    if(row.id) {
                        items[row.id] = slider;
                    }
                    break;

                case 'INPUT':
                    var input = menuItem.addInput(row.header);
                    input.defaultValue(function() {
                        return row.defaultValue(loadedModel);
                    });

                    input.onChange(function() {
                        var value = input.getValue();
                        if(row.id === 'iterations') {
                            items.timestep.setMax(value);
                        }

                        row.onChange(loadedModel, value);
                    });

                    if(row.id) {
                        items[row.id] = input;
                    }
                    break;
            }
        });

        sidebar.addItem(menuItem);
        return menuItem;
    }

    var _simulate = require('./settings/simulate.js');
    var __ = setupSimulate(sidebar, _simulate);
    __.setLabel('Simulate');

    var newButton  = sidebar.addButton('file', function() {
        loadedModel.emit('storeModel');
        loadedModel.emit([loadedModel.id, loadedModel.syncId], 'preNewModel');
        loadedModel.emit('newModel');
    });

    var saveButton = sidebar.addButton('floppy-disk', function() {
        loadedModel.emit([loadedModel.id, loadedModel.syncId], 'preSaveModel');
        loadedModel.emit([loadedModel.id, loadedModel.syncId], 'saveModel');
    });

    var deleteButton = sidebar.addButton('trash', function() {
        loadedModel.emit({
            description: 'Do you really want to delete this model?',
            buttons: [
                {
                    background: Colors.warningRed,
                    callback: function(popup) {
                        loadedModel.emit([loadedModel.id, loadedModel.syncId], 'deleteModel');
                        popup.destroy();
                    },
                    label: 'Confirm'
                },

                {
                    callback: function(popup) {
                        popup.destroy();
                    },
                    label: 'Cancel'
                }
            ]
        }, 'popup');
    });

    var printLoadedModel = sidebar.addButton('alert', function() {
        console.log(loadedModel);
    });

    var Button = NewUI.Button;
    function setupLoadModel(sidebar) {
        var menuItem = new NewUI.MenuItem(300);
        menuItem.setLabel('Load model');

        menuItem.child.clicks = [];
        Button.prototype.click.call(menuItem.child, function(evt) {
            var button      = evt.target.modelButton;
            var deleteModel = evt.target.deleteModel;

            if(button) {
                loadedModel.loadModel(button.syncId || button.id);
                return;
            }

            if(deleteModel) {
                loadedModel.deleteModel(deleteModel.syncId || deleteModel.id);
                return;
            }
        });

        var buttons = [];
        var createButton = function(iterator) {
            var button;
            if(iterator < buttons.length) {
                button = buttons[iterator];
            } else {
                button = menuItem.addButton();
                button.root.modelButton = button;
                buttons.push(button);

                button.label.root.modelButton = button;

                /*var trashButton = new NewUI.Button();
                button.appendChild(trashButton);

                var trashIcon = new NewUI.Element('span');
                trashButton.appendChild(trashIcon);
                trashIcon.root.className = 'glyphicon glyphicon-trash';
                trashButton.root.style['margin-right'] = '16px';

                button.label.root.style.display = 'inline-block';
                trashButton.root.style.float  = 'right';

                var clearTrash = new NewUI.Element('div');
                clearTrash.root.style.clear = 'both';

                button.appendChild(clearTrash);
                trashButton.root.deleteModel = button;
                trashIcon.root.deleteModel = button;
                trashButton.setWidth(20);
                trashButton.setHeight(20);*/
            }

            return button;
        }

        var lastActiveModelButton = false;
        menuItem.refresh = function() {
            loadedModel.getAllModels().then(function(models) {
                var iterator = 0;
                var initialSize = buttons.length;
                models = models.map(function(model, index, arr) {
                    return arr[arr.length - (index + 1)];
                });

                models.forEach(function(model) {
                    if(savedModels.synced[model.id] && savedModels.local[savedModels.synced[model.id].id]) {
                        return;
                    }

                    var button = createButton(iterator);

                    if(savedModels.synced[model.id]) {
                        button.setLabel(savedModels.synced[model.id].settings.name);
                    } else {
                        button.setLabel(model.name);
                    }

                    button.syncId = model.id;
                    button.id     = model.id;

                    if(loadedModel.syncId === model.id) {
                        if(lastActiveModelButton) {
                            lastActiveModelButton.setBackground(Colors.buttonBackground);
                        }

                        button.setBackground(Colors.buttonCheckedBackground);
                        lastActiveModelButton = button;
                    }

                    iterator++;
                });

                objectHelper.forEach.call(
                    savedModels.local,
                    function(model) {
                        var button = createButton(iterator);

                        button.setLabel(model.settings.name);
                        button.syncId = model.syncId || false;
                        button.id     = model.id;

                        if(loadedModel.id === model.id) {
                            if(lastActiveModelButton) {
                                lastActiveModelButton.setBackground(Colors.buttonBackground);
                            }
                            
                            button.setBackground(Colors.buttonCheckedBackground);
                            lastActiveModelButton = button;
                        }

                        iterator++;
                    }
                );

                var localSaved = objectHelper.size.call(savedModels.local);
                if(models.length + localSaved < buttons.length) {
                    var removedButtons = buttons.splice(models.length + localSaved, buttons.length - models.length);
                    removedButtons.forEach(function(button) {
                        button.destroy();
                    });
                }
            }).catch(function(error) {
                console.error(error);
            });
        };

        menuItem.refresh();

        sidebar.addItem(menuItem);
        return menuItem;
    }

    setupLoadModel(sidebar);

    function Scenario(syncId) {
        this.id                = loadedModel.generateId();
        this.syncId            = syncId;

        this.name              = 'New scenario';
        this.data              = {};

        this.measurement       = 'Week';
        this.measurementAmount = 1;
        this.maxIterations     = 4;
        this.timeStepN         = 0;
    }

    var algorithms = require('./algorithms');
    var sort = algorithms.sort;

    function setupScenarioWindow(sidebar) {
        var menuItem = new NewUI.MenuItem(340);
        menuItem.setLabel('Scenario Editor');

        var scenarios = [];
        objectHelper.forEach.call(loadedModel.scenarios, function(scenario) {
            scenarios.push({value: scenario.id, label: scenario.name});
        });

        var onNew = function(done) {
            var newScenario = new Scenario();
            newScenario.data = objectHelper.copy.call(loadedModel.loadedScenario.data);
            loadedModel.scenarios[newScenario.id] = newScenario;

            done(newScenario.name, newScenario.id);
        };

        var onEdit = function(id, header) {
            var scenario = loadedModel.scenarios[id];
            if(!scenario) {
                return;
            }

            scenario.name = header;
        };

        var onDelete = function(id) {
            if(!loadedModel.scenarios[id]) {
                return;
            }

            delete loadedModel.scenarios[id];
        };

        var onChange = function(id, header) {
            loadedModel.loadedScenario = loadedModel.scenarios[id];

            objectHelper.forEach.call(origins, function(item) {
                item.foldable.destroy();
            });

            origins = {};
            menuItem.refresh();

            loadedModel.emit('refresh');
        };

        var editableDropdown = menuItem.addEditableDropdown('Scenario', scenarios, onNew, onEdit, onDelete, onChange);

        menuItem.addLabel('Output Nodes');

        // Map of references to nodes and foldables. Key being node.id
        var origins         = {};
        var rowLookup       = {};
        var timeStepChanged = function(previousStep, step, value, node) {
            if(!loadedModel.loadedScenario) {
                return;
            }

            var timetable = loadedModel.loadedScenario.data[node.id];
            if(!timetable) {
                loadedModel.loadedScenario.data[node.id] = {
                    id:       loadedModel.generateId(),
                    scenario: loadedModel.loadedScenario,
                    node:     node,
                    steps:    {}
                };

                timetable = loadedModel.loadedScenario.data[node.id];
                timetable.steps[step] = value;
                return;
            }

            // If there's already a step on this key, leave everything as is.
            if(timetable.steps[step] !== undefined) {
                // Returning true restores the value to previous accepted change.
                return true;
            }

            // Get the foldable with all timerows.
            var foldable = origins[node.id].foldable;

            // Set the step and row lookup and delete the old step in the data object.
            timetable.steps[step]    = value;
            rowLookup[node.id][step] = rowLookup[node.id][previousStep];

            delete timetable.steps[previousStep];
            delete rowLookup[node.id][previousStep];

            // Get the indexes after data update.
            var a = Object.keys(rowLookup[node.id]);
            // And the current row index.
            var i = a.indexOf(step);

            // If the row index is in the list, insert it before the next element.
            // If it's on the edge, append it to the end.
            if(i + 1 < a.length) {
                foldable.child.root.insertBefore(rowLookup[node.id][a[i]].root, rowLookup[node.id][a[i + 1]].root);
            } else {
                foldable.child.root.appendChild(rowLookup[node.id][a[i]].root);
            }

            // Redraw new data.
            loadedModel.emit('refresh');
        };

        var timeValueChanged = function(step, value, node) {
            if(!loadedModel.loadedScenario) {
                return;
            }

            var timetable = loadedModel.loadedScenario.data[node.id];
            if(!timetable) {
                loadedModel.loadedScenario.data[node.id] = {
                    id:       loadedModel.generateId(),
                    /*scenario: loadedModel.loadedScenario,
                    node:     node,*/
                    steps:    {}
                };

                timetable = loadedModel.loadedScenario.data[node.id];
            }

            timetable.steps[step] = value;

            loadedModel.emit('refresh');
        };

        var rowDeleted = function(step, value, node) {
            if(!loadedModel.loadedScenario) {
                return;
            }

            var timetable = loadedModel.loadedScenario.data[node.id];
            if(!timetable) {
                return;
            }

            delete timetable.steps[step];

            loadedModel.emit('refresh');
        };

        var addStepCallback = function(evt) {
            var node     = evt.target.node     || evt.target.parentElement.node;
            var foldable = evt.target.foldable || evt.target.parentElement.foldable;
            if(!node || !foldable) {
                return;
            }

            var timetable = loadedModel.loadedScenario.data[node.id];
            if(!timetable) {
                var row = foldable.addTimeRow(0, 0, node, timeStepChanged, timeValueChanged, rowDeleted);
                loadedModel.loadedScenario.data[node.id] = {
                    id:        loadedModel.generateId(),
                    /*scenario:  loadedModel.loadedScenario,
                    node:      node,*/
                    steps:     {'0': 0}
                };

                rowLookup[node.id]['0'] = row;
            } else {
                var lastStep = parseInt(objectHelper.lastKey.call(timetable.steps));
                if(isNaN(lastStep)) {
                    lastStep = -1;
                }

                lastStep += 1;
                var row = foldable.addTimeRow(lastStep, 0, node, timeStepChanged, timeValueChanged, rowDeleted);

                timetable.steps[lastStep]    = 0;
                rowLookup[node.id][lastStep] = row;
            }

            loadedModel.emit('refresh');
        };

        // Not used, should probably comment it out but too lazy.
        var baselineCallback = function(evt) {
            console.log(evt);
        };

        menuItem.refresh = function() {
            // Loop all nodes.
            objectHelper.forEach.call(loadedModel.nodeData, function(node) {
                // Check if the node is of origin type and doesn't already own a button.
                if(node.type === 'origin' && !origins[node.id]) {
                    // Create the folded item for this origin node.
                    var originFoldable    = menuItem.addFoldable(node.name);
                    var addStep           = originFoldable.addButton('Add Step', addStepCallback);
                    //var baseline          = originFoldable.addInput('Baseline',  baselineCallback);

                    addStep.root.node     = node;
                    addStep.root.foldable = originFoldable;

                    // Save a reference to each origin node owning a button.
                    origins[node.id] = {
                        node:     node,
                        foldable: originFoldable,
                        addStep:  addStep
                    };

                    if(!rowLookup[node.id]) {
                        rowLookup[node.id] = {};
                    }

                    if(!loadedModel.loadedScenario.data[node.id] || !loadedModel.loadedScenario.data[node.id].steps) {
                        return;
                    }

                    objectHelper.forEach.call(loadedModel.loadedScenario.data[node.id].steps, function(value, step) {
                        var row = originFoldable.addTimeRow(step, value, node, timeStepChanged, timeValueChanged, rowDeleted);
                        rowLookup[node.id][step] = row;
                    });
                }
            });
        };

        loadedModel.addListener('dataModified', function(value, property, obj) {
            if(origins[obj.id]) {
                origins[obj.id].foldable.setLabel(value);
            }
        });

        // Listen to the deletedNode event to make sure we delete buttons related to a node.
        loadedModel.addListener('deletedNode', function(a, b) {
            if(!origins[a.id]) {
                return;
            }

            origins[a.id].foldable.destroy();
            delete origins[a.id];
        });

        // Listen to the newNode event to add 

        // Listen to modelLoaded event to make sure we delete
        // all items related to nodes in the previous models
        loadedModel.addListener('modelLoaded', function(id, syncId, prevId, prevSyncId) {
            if((syncId === false && id === prevId) || (syncId !== false && syncId === prevSyncId)) {
                return;
            }

            objectHelper.forEach.call(origins, function(item) {
                item.foldable.destroy();
            });

            var scenarios = [];
            objectHelper.forEach.call(loadedModel.scenarios, function(scenario) {
                scenarios.push({value: scenario.id, label: scenario.name});
            });

            editableDropdown.replaceValues(scenarios);

            rowLookup = {};
            origins   = {};
            menuItem.refresh();

            loadedModel.emit('refresh');
        });

        sidebar.addItem(menuItem);
        return menuItem;
    }

    setupScenarioWindow(sidebar);

    loadedModel.addListener('invertSidebar', function() {
        sidebar.invert();
    });

    require('./model/listeners/popup.js')(container, loadedModel);
    require('./model/listeners/notification.js')(notificationBarDiv, loadedModel);
    require('./model/listeners/mouse_down.js')(loadedModel);
    require('./model/listeners/mouse_move.js')(loadedModel);
    require('./model/listeners/mouse_up.js')(loadedModel);
    require('./model/listeners/delete.js')(loadedModel);

    loadedModel.addListener('resetUI', function() {
        sidebar.foldable.menuItems.forEach(function(menuItem) {
            menuItem.refresh();
        });
    });

    loadedModel.addListener('settings', refresh);
    /**
     * @description Renders a new frame for the canvas.
     * @event refresh
     * @memberof module:model/propagationEvents
     */
    loadedModel.addListener('refresh',  refresh);

    //var sidebarManager = new UI.SidebarManager(sidebarContainer);

    /*loadedModel.addListener('sidebar', function() {
        sidebarManager.addSidebar(loadedModel.sidebar, loadedModel);
    });*/

    var ScenarioEditor = require('./scenario').ScenarioEditor;

    /**
     * @description A new window should be created.
     * @event newWindow
     * @memberof module:model/propagationEvents
     *
     * @param {string} option - Option key
     */
    loadedModel.addListener('newWindow', function(option) {
        switch(option.toUpperCase()) {
            case 'SCENARIO':
                loadedModel.floatingWindows.forEach(function(floatingWindow) {
                    floatingWindow.destroyWindow();
                });
                new ScenarioEditor(loadedModel, container.offsetLeft + 208, container.offsetTop + 28);
                break;
        }
    });

    /*sidebarManager.setEnvironment(loadedModel.environment);
    sidebarManager.setLoadedModel(loadedModel);
    sidebarManager.setSelectedMenu(loadedModel.settings);

    var menu = new UI.Menu(upperMenu, settings.menu);
    menu.createMenu(loadedModel, savedModels);*/

    require('./model/listeners/selected.js') (sidebar, loadedModel);
    //require('./model/listeners/selected.js')    (sidebarManager, loadedModel);
    //require('./model/listeners/reset_ui.js')    (sidebarManager, menu, savedModels, loadedModel);


    require('./model/listeners/store_model.js') (savedModels, loadedModel);
    require('./model/listeners/load_model.js')  (savedModels, loadedModel);
    require('./model/listeners/new_model.js')   (savedModels, loadedModel);
    require('./model/listeners/delete_model.js')(savedModels, loadedModel);
    require('./model/listeners/save_model.js')  (savedModels, loadedModel);

    var localId = loadedModel.id;
    loadedModel.emit('storeModel');
    loadedModel.emit([localId, false], 'loadModel');

    require('./model/listeners/settings.js')(loadedModel);
    loadedModel.addListener('settings', function() {
        if(loadedModel.settings.linegraph) {
            linegraphRefresh();
        }
    });

    loadedModel.addListener('refreshLinegraph', function() {
        if(loadedModel.settings.linegraph) {
            console.log('Refreshing linegraph.');
            linegraphRefresh();
        }
    });

    loadedModel.emit(null, 'refresh', 'resetUI', 'settings', 'sidebar');
    loadedModel.emit('Initialized', 'notification');

    var Chart = require('chart.js');
    var drawLineGraph = require('./graphics/draw_line_graph.js');
    function _linegraphRefresh() {
        var lctx = linegraphCanvas.getContext('2d');

        var labels   = [];
        for(var i = 0; i <= loadedModel.loadedScenario.maxIterations; i++) {
            labels.push(''+i);
        }

        var selectedNodes = objectHelper.filter.call(
            loadedModel.nodeGui,
            function(node) {
                return node.linegraph;
            }
        );

        var nodeData = loadedModel.nodeData;
        var nodeGui  = loadedModel.nodeGui;
        var datasets = Object.keys(selectedNodes).map(function(key) {
            var nodegui = nodeGui[key];
            var node    = nodeData[key];

            return {
                label:            node.name,
                data:             node.simulateChange,
                fill:             false,
                lineTension:      0.1,
                backgroundColor:  nodegui.color,
                pointBorderColor: nodegui.color,
                borderColor:      nodegui.color
            };
        });

        Chart.Line(lctx, {
            data: {
                labels:   labels,
                datasets: datasets
            },

            options: {
                scales: {
                    yAxes: [{
                        ticks: {
                            beginAtZero: true
                        }
                    }]
                }
            }
        });
         
        return;
        /*lctx.clearRect(
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

        var nodeData   = loadedModel.nodeData;
        var lineValues = objectHelper.map.call(
            selectedNodes,
            function(nodegui) {
                var node = nodeData[nodegui.id];
                return {
                    name:   node.name,
                    values: node.simulateChange,
                    color:  nodegui.color
                }
            }
        );

        console.log('Linegraph cleared.');

        drawLineGraph(lctx, 20, 20, linegraphCanvas.width - 40, linegraphCanvas.height - 30, lineValues);*/
    }

    function refresh() {
        window.requestAnimationFrame(_refresh);
    }

    function linegraphRefresh() {
        window.requestAnimationFrame(_linegraphRefresh);
    }

    linegraphRefresh();

    sidebar.foldButton.root.click();

    return loadedModel;
}

window.sense4us              = window.sense4us || {};
window.sense4us.lastTarget   = false;
window.sense4us.inflateModel = inflateModel;
window.sense4us.inflateTool  = inflateModel;
window.sense4us.NewUI        = require('./new_ui');

},{"./aggregated_link.js":"aggregated_link.js","./algorithms":"algorithms/algorithms.js","./async_middleware":"async_middleware.js","./canvas":"canvas/canvas.js","./collisions.js":"collisions.js","./curry.js":"curry.js","./generate_id.js":"generate_id.js","./graphics/draw_line_graph.js":"graphics/draw_line_graph.js","./graphics/value_colors.js":"graphics/value_colors.js","./information_tree":"information_tree/information_tree.js","./input/hotkey_e.js":"input/hotkey_e.js","./input/hotkey_esc.js":"input/hotkey_esc.js","./input/hotkey_v.js":"input/hotkey_v.js","./input/hotkey_y.js":"input/hotkey_y.js","./input/hotkey_z.js":"input/hotkey_z.js","./linker.js":"linker.js","./mechanics/keyboard_handler.js":"mechanics/keyboard_handler.js","./mechanics/mouse_event_emitter.js":"mechanics/mouse_event_emitter.js","./menu_builder":"menu_builder/menu_builder.js","./model/listeners/delete.js":"model/listeners/delete.js","./model/listeners/delete_model.js":"model/listeners/delete_model.js","./model/listeners/load_model.js":"model/listeners/load_model.js","./model/listeners/mouse_down.js":"model/listeners/mouse_down.js","./model/listeners/mouse_move.js":"model/listeners/mouse_move.js","./model/listeners/mouse_up.js":"model/listeners/mouse_up.js","./model/listeners/new_model.js":"model/listeners/new_model.js","./model/listeners/notification.js":"model/listeners/notification.js","./model/listeners/popup.js":"model/listeners/popup.js","./model/listeners/save_model.js":"model/listeners/save_model.js","./model/listeners/selected.js":"model/listeners/selected.js","./model/listeners/settings.js":"model/listeners/settings.js","./model/listeners/store_model.js":"model/listeners/store_model.js","./model_layer.js":"model_layer.js","./network":"network/network.js","./new_ui":"new_ui/new_ui.js","./notification_bar":"notification_bar/notification_bar.js","./object-helper.js":"object-helper.js","./refresh":"refresh.js","./scenario":"scenario/scenario_index.js","./settings":"settings/settings.js","./settings/modelling.js":"settings/modelling.js","./settings/simulate.js":"settings/simulate.js","./strict_curry.js":"strict_curry.js","./ui":"ui/ui.js","chart.js":3}],"mechanics/drag_handler.js":[function(require,module,exports){
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
		//loadedModel.propagate();

		if (result) {
			if (updateCallback) {
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
    var globalTable = {};
    hotkeys.forEach(function(hotkey) {
        if(!lookupTable[hotkey.keyCode]) {
            lookupTable[hotkey.keyCode] = [];
        }

        lookupTable[hotkey.keyCode].push(hotkey);

        if(hotkey.global === true) {
            if(!globalTable[hotkey.keyCode]) {
                globalTable[hotkey.keyCode] = [];
            }

            globalTable[hotkey.keyCode].push(hotkey);
        }
    });

    var SHIFT = 16,
        CTRL  = 17,
        ALT   = 18,
        ALTGR = 225;

    if(!loadedModel.static.modifiers) {
        loadedModel.static.modifiers = [];
    }

    container.addEventListener('keydown', function(evt) {
        /*if(loadedModel.static.modifiers.indexOf(ALT) !== -1) {
            console.log(evt.keyCode);
        }*/

        switch(evt.keyCode) {
            case CTRL:
                loadedModel.static.modifiers.push(CTRL);
                break;
            case ALT:
                loadedModel.static.modifiers.push(ALT);
                break;
            case ALTGR:
                loadedModel.static.modifiers.push(ALTGR);
                break;
            case SHIFT:
                loadedModel.static.modifiers.push(SHIFT);
                break;
        }

        if(window.sense4us.lastTarget !== canvas) {
            if(globalTable[evt.keyCode]) {
                globalTable[evt.keyCode].forEach(function(hotkey) {
                    if(!hotkey.onDown || typeof hotkey.onDown !== 'function') {
                        return;
                    }

                    hotkey.onDown(canvas, loadedModel, evt);
                });
            }

            return true;
        }

        /**
         * @description A key was pressed with canvas active.
         * @event keyDown
         * @memberof module:model/statusEvents
         *
         * @param {integer} keyCode - Character keycode.
         * @example tool.addListener('keyDown', function(key) {
         *     console.log('Key', key, 'pressed.');
         * });
         */
        loadedModel.emit(evt.keyCode, 'keyDown');

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
        switch(evt.keyCode) {
            case CTRL:
                var index = loadedModel.static.modifiers.indexOf(CTRL);
                loadedModel.static.modifiers.splice(index, 1);
                break;
            case ALT:
                var index = loadedModel.static.modifiers.indexOf(ALT);
                loadedModel.static.modifiers.splice(index, 1);
                break;
            case ALTGR:
                var index = loadedModel.static.modifiers.indexOf(ALTGR);
                loadedModel.static.modifiers.splice(index, 1);
                break;
            case SHIFT:
                var index = loadedModel.static.modifiers.indexOf(SHIFT);
                loadedModel.static.modifiers.splice(index, 1);
                break;
        }

        if(window.sense4us.lastTarget !== canvas) {
            if(globalTable[evt.keyCode]) {
                globalTable[evt.keyCode].forEach(function(hotkey) {
                    if(!hotkey.onUp || typeof hotkey.onUp !== 'function') {
                        return;
                    }

                    hotkey.onUp(canvas, loadedModel, evt);
                });
            }

            return true;
        }

        /**
         * @description A key was released with canvas active.
         * @event keyUp
         * @memberof module:model/statusEvents
         *
         * @param {integer} keyCode - Character keycode.
         * @example tool.addListener('keyUp', function(key) {
         *     console.log('Key', key, 'released.');
         * });
         */
        loadedModel.emit(evt.keyCode, 'keyUp');

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

},{}],"mechanics/mouse_event_emitter.js":[function(require,module,exports){
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
        active     = true;

        startPos   = arithmetics.mouseToCanvas({x: event.pageX, y: event.pageY}, canvas);
        lastPos    = {x: startPos.x, y: startPos.y};

        loadedModel.didDrag = false;

        /**
         * @description Mouse pressed down on canvas.
         * @event mouseDown
         * @memberof module:model/statusEvents
         *
         * @param {element} canvas - Canvas element
         * @param {integer} button - Mouse button
         *
         * @param {object} startPos - Start position
         * @param {object} startPos.x - X
         * @param {object} startPos.y - Y

         * @param {object} lastPos - Previous position
         * @param {object} lastPos.x - X
         * @param {object} lastPos.y - Y
         *
         * @param {function} mouseMove - Callback for mouse movement
         * @param {function} mouseUp - Callback for mouse up
         * @example tool.addListener('mouseDown', function(canvas, button, startPos, lastPos, mouseMove, mouseUp) {
         *     console.log('Mouse button', button, 'pressed down.');
         * });
         */
        loadedModel.emit([canvas, button, startPos, lastPos, mouseMove, mouseUp], 'mouseDown');
    };

    canvas.addEventListener('mousedown', mouseDown);

    var mouseMove = function(event) {
        var button = event.button;

        active = true;

        endPos = arithmetics.mouseToCanvas({x: event.pageX, y: event.pageY}, canvas);

        deltaPos.x = lastPos.x - endPos.x;
        deltaPos.y = lastPos.y - endPos.y;

        /*startPos.x = endPos.x;
        startPos.y = endPos.y;*/

        loadedModel.didDrag = true;

        lastPos = {x: endPos.x, y: endPos.y};

        /**
         * @description While mouse button pressed down on and move on canvas.
         * @event mouseMove
         * @memberof module:model/statusEvents
         *
         * @param {element} canvas - Canvas element
         * @param {integer} button - Mouse button
         *
         * @param {object} startPos - Start position
         * @param {object} startPos.x - X
         * @param {object} startPos.y - Y

         * @param {object} lastPos - Previous position
         * @param {object} lastPos.x - X
         * @param {object} lastPos.y - Y
         
         * @param {object} endPos - Current position
         * @param {object} endPos.x - X
         * @param {object} endPos.y - Y

         * @param {object} delta - Delta
         * @param {object} delta.x - X
         * @param {object} delta.y - Y
         
         * @example tool.addListener('mouseMove', function(canvas, button, startPos, lastPos, endPos, delta) {
         *     console.log('Mouse moved', delta.x, delta.y, '.');
         * });
         */
        loadedModel.emit([canvas, button, startPos, lastPos, endPos, deltaPos], 'mouseMove');
    };

    var mouseUp = function(event) {
        var button = event.button;

        active = false;

        endPos = arithmetics.mouseToCanvas({x: event.pageX, y: event.pageY}, canvas);

        window.removeEventListener('mousemove', mouseMove);
        window.removeEventListener('mouseup',   mouseUp);

        /**
         * @description Mouse released.
         * @event mouseUp
         * @memberof module:model/statusEvents
         *
         * @param {element} canvas - Canvas element
         * @param {integer} button - Mouse button
         
         * @param {object} endPos - Current position
         * @param {object} endPos.x - X
         * @param {object} endPos.y - Y
         
         * @example tool.addListener('mouseUp', function(canvas, button, endPos) {
         *     console.log('Mouse released at', endPos.x, endPos.y);
         * });
         */
        loadedModel.emit([canvas, button, endPos], 'mouseUp');
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
        event = event || 'change';
        
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
        input.type  = 'text';
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

		if (pos + 1 === callbacks.length || data.done === true) {
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
},{}],"model/listeners/delete.js":[function(require,module,exports){
'use strict';

function addDeleteSelectedListeners(loadedModel) {
    /**
     * @description Delete node by given id.
     * @event deleteNode
     * @memberof module:model/propagationEvents
     *
     * @param {string} id - The node to delete.
     * @example tool.emit('deleteNode', '15');
     */
    loadedModel.addListener('deleteNode', function(id) {
        loadedModel.selected = false;
        var selectedNodeData = loadedModel.nodeData[id];
        var selectedNodeGui  = loadedModel.nodeGui[id];

        delete loadedModel.nodeData[selectedNodeData.id];
        /**
         * @description NodeData was deleted.
         * @event deletedNodeData
         * @memberof module:model/statusEvents
         *
         * @param {object} nodeData - The deleted nodeData object.
         * @example tool.addListener('deletedNodeData', function(data) {
         *     console.log('Node data with id:', data.id, 'was deleted');
         * })
         */
        loadedModel.emit(selectedNodeData, 'deletedNodeData');

        if(selectedNodeGui.links) {
            selectedNodeGui.links.forEach(function(link, key) {
                var linkObject = loadedModel.links[link];

                var upstream   = loadedModel.nodeGui[linkObject.node1];
                var downstream = loadedModel.nodeGui[linkObject.node2];

                var index = upstream.links.indexOf(linkObject.id);
                if(index !== -1 && upstream.id !== selectedNodeGui.id) {
                    upstream.links.splice(index, 1);
                }

                index = downstream.links.indexOf(linkObject.id);
                if(index !== -1 && downstream.id !== selectedNodeGui.id) {
                    downstream.links.splice(index, 1);
                }

                delete loadedModel.links[link];
                loadedModel.emit(linkObject, 'deletedLink');
            });
        }

        selectedNodeGui.links = [];

        delete loadedModel.nodeGui[selectedNodeGui.id];
        /**
         * @description Renders a new frame for the canvas.
         * @event deletedNodeGui
         * @memberof module:model/statusEvents
         *
         * @param {object} nodeGui - The deleted nodeGui object.
         * @example tool.addListener('deletedNodeGui', function(data) {
         *     console.log('Node gui with id:', data.id, 'was deleted');
         * })
         */
        loadedModel.emit(selectedNodeGui, 'deletedNodeGui');
        loadedModel.emit([selectedNodeData, selectedNodeGui], 'deletedNode');
    });

    /**
     * @description Delete link by given id.
     * @event deleteLink
     * @memberof module:model/propagationEvents
     *
     * @param {string} id - The link to delete.
     * @example tool.emit('deleteLink', '15');
     */
    loadedModel.addListener('deleteLink', function(id) {
        loadedModel.selected = false;
        var selectedData = loadedModel.links[id];

        var upstream   = loadedModel.nodeGui[selectedData.node1];
        var downstream = loadedModel.nodeGui[selectedData.node2];

        var index = upstream.links.indexOf(selectedData.id);
        if(index !== -1) {
            upstream.links.splice(index, 1);
        }

        var index = downstream.links.indexOf(selectedData.id);
        if(index !== -1) {
            downstream.links.splice(index, 1);
        }

        delete loadedModel.links[selectedData.id];
        /**
         * @description Link was deleted.
         * @event deletedLink
         * @memberof module:model/statusEvents
         *
         * @param {object} link - The deleted link object.
         * @example tool.addListener('deletedLink', function(link) {
         *     console.log('Link with id:', link.id, 'was deleted');
         * })
         */
        loadedModel.emit(selectedData, 'deletedLink');
    });

    /**
     * @description Delete selected item.
     * @event deleteSelected
     * @memberof module:model/propagationEvents
     *
     * @example tool.emit('deleteSelected');
     */
    loadedModel.addListener('deleteSelected', function() {
        var selectedData = loadedModel.selected;

        if(selectedData.objectId === 'nodeData' || selectedData.objectId === 'nodeGui') {
            var historyData = {
                action: 'deleteNode',
                data: {
                    data:  loadedModel.nodeData[selectedData.id],
                    gui:   loadedModel.nodeGui[selectedData.id],
                    links: []
                }
            };

            console.log(loadedModel.nodeGui[selectedData.id]);

            historyData.data.gui.links.forEach(function(link) {
                historyData.data.links.push(loadedModel.links[link]);
            });

            loadedModel.history.push(historyData);

            loadedModel.emit(selectedData.id, 'deleteNode');
        } else if(selectedData.objectId === 'link') {
            loadedModel.history.push({
                action: 'deleteLink',
                data: {
                    link: selectedData
                }
            });

            loadedModel.emit(selectedData.id, 'deleteLink');
        }

        loadedModel.revertedHistory = [];

        loadedModel.selected = false;
        loadedModel.emit(null, 'refresh', 'resetUI', 'select');
    });
}

module.exports = addDeleteSelectedListeners;

},{}],"model/listeners/delete_model.js":[function(require,module,exports){
'use strict';

var modelLayer   = require('./../../model_layer.js'),
    objectHelper = require('./../../object-helper.js');

function addDeleteModelListeners(savedModels, loadedModel) {
    /**
     * @description A model was deleted.
     * @event modelDeleted
     * @memberof module:model/statusEvents
     *
     * @param {integer} id - The local model id that was deleted.
     * @param {integer} syncId - The synchronized model id that was deleted.
     * @example tool.addListener('modelDeleted', function(id, syncId) {
     *     console.log('Model with id:', id, syncId, 'deleted.');
     * });
     */

    /**
     * @description Delete a model, either local or remote.
     * @event deleteModel
     * @memberof module:model/propagationEvents
     *
     * @param {integer} id - Local id
     * @param {integer} syncId - Synchronized id
     */
    loadedModel.addListener('deleteModel', function(id, syncId) {
        modelLayer.deleteModel(
                loadedModel.CONFIG.url,
                loadedModel.CONFIG.userFilter,
                loadedModel.CONFIG.projectFilter,
                syncId || id,
                savedModels,
                function(message) {
            if(loadedModel.id === id || loadedModel.syncId === syncId) {
                var firstLocal = objectHelper.first.call(savedModels.local);
                if(firstLocal && (firstLocal.id === loadedModel.id || firstLocal.syncId === loadedModel.syncId)) {
                    delete savedModels.local[firstLocal.id];
                    firstLocal = undefined;
                }

                if(firstLocal === undefined) {
                    loadedModel.emit('newModel');
                    //firstLocal = modelLayer.newModel();
                    //savedModels.local[firstLocal.id] = firstLocal;
                } else {
                    objectHelper.forEach.call(
                        firstLocal,
                        function(value, key) {
                            loadedModel[key] = value;
                        }
                    );
                }
            }

            loadedModel.emit(message || 'Deleted local model: ' + id, 'notification');
            loadedModel.emit([id, syncId], 'modelDeleted');
            loadedModel.emit(null, 'refresh', 'resetUI');
        });
    });
}

module.exports = addDeleteModelListeners;

},{"./../../model_layer.js":"model_layer.js","./../../object-helper.js":"object-helper.js"}],"model/listeners/delete_selected.js":[function(require,module,exports){
'use strict';

function addDeleteSelectedListeners(loadedModel) {
    loadedModel.addListener('deleteSelected', function() {
        var selectedData = loadedModel.selected;

        if(selectedData.objectId === 'nodeData' || selectedData.objectId === 'nodeGui') {
            var selectedNodeData = loadedModel.nodeData[selectedData.id];
            var selectedNodeGui  = loadedModel.nodeGui[selectedData.id];

            delete loadedModel.nodeData[selectedNodeData.id];
            loadedModel.emit(selectedNodeData, 'deletedNodeData');

            if(selectedNodeGui.links) {
                selectedNodeGui.links.forEach(function(link, key) {
                    var linkObject = loadedModel.links[link];

                    var upstream   = loadedModel.nodeGui[linkObject.node1];
                    var downstream = loadedModel.nodeGui[linkObject.node2];

                    var index = upstream.links.indexOf(linkObject.id);
                    if(index !== -1 && upstream.id !== selectedNodeGui.id) {
                        upstream.links.splice(index, 1);
                    }

                    index = downstream.links.indexOf(linkObject.id);
                    if(index !== -1 && downstream.id !== selectedNodeGui.id) {
                        downstream.links.splice(index, 1);
                    }

                    delete loadedModel.links[link];
                    loadedModel.emit(linkObject, 'deletedLink');
                });
            }

            delete loadedModel.nodeGui[selectedNodeGui.id];
            loadedModel.emit(selectedNodeGui, 'deletedNodeGui');
        } else if(selectedData.objectId === 'link') {
            var upstream   = loadedModel.nodeGui[selectedData.node1];
            var downstream = loadedModel.nodeGui[selectedData.node2];

            var index = upstream.links.indexOf(selectedData.id);
            if(index !== -1) {
                upstream.links.splice(index, 1);
            }

            var index = downstream.links.indexOf(selectedData.id);
            if(index !== -1) {
                downstream.links.splice(index, 1);
            }

            delete loadedModel.links[selectedData.id];
            loadedModel.emit(selectedData, 'deletedLink');
        }

        loadedModel.selected = false;
        loadedModel.emit(null, 'refresh', 'resetUI', 'select');
    });
}

module.exports = addDeleteSelectedListeners;

},{}],"model/listeners/load_model.js":[function(require,module,exports){
'use strict';

var modelLayer   = require('./../../model_layer.js');
var objectHelper = require('./../../object-helper.js');

function addLoadModelListeners(savedModels, loadedModel) {
    /**
     * @module model/statusEvents
     */

    /**
     * @description A model with the given id should be loaded.
     * @event loadModel
     * @memberof module:model/propagationEvents
     *
     * @param {integer} id - New model id.
     */

    /**
     * @description Once a model has been replaced, either from a local source or a remote source.
     * @event modelLoaded
     *
     * @param {integer} id - New model id.
     * @example tool.addListener('modelLoaded', function(id, syncId) {
     *     console.log('Model got replaced by:', id, syncId);
     * });
     */
    loadedModel.addListener('loadModel', function(option, syncId) {
        option = syncId || option;
        var previousId     = loadedModel.id;
        var previousSyncId = loadedModel.syncId;

        if(savedModels.local[option] === undefined) {
            if(typeof savedModels.synced[option] === 'string' || savedModels.synced[option] === undefined) {
                modelLayer.loadSyncModel(
                        loadedModel.CONFIG.url,
                        loadedModel.CONFIG.userFilter,
                        loadedModel.CONFIG.projectFilter,
                        option,
                        function(newState) {
                    if(typeof newState === 'number') {
                        loadedModel.syncId = newState;
                        loadedModel.id     = newState;

                        loadedModel.emit(
                            {
                                delay: 10000,
                                message: 'Model with id ' + modelId + ' is corrupt. Its id is loaded and may be deleted from running \'Delete current\'. Otherwise, contact sysadmin.'
                            },
                            'notification'
                        );

                        loadedModel.emit(null, 'refresh', 'resetUI');
                        return;
                    } else if(newState instanceof Error) {
                        loadedModel.emit(newState, 'notification');
                        loadedModel.emit([option, option], 'errorLoadingModel');
                        return;
                    }

                    loadedModel.nodeGui  = {};
                    loadedModel.nodeData = {};

                    newState.selected = false;
                    loadedModel.floatingWindows.forEach(function(floatingWindow) {
                        floatingWindow.destroyWindow();

                        if(floatingWindow.hide) {
                            floatingWindow.hide();
                        }
                    });

                    savedModels.synced[option] = newState;
                    objectHelper.forEach.call(
                        newState,
                        function(value, key) {
                            loadedModel[key] = value;
                        }
                    );

                    objectHelper.forEach.call(loadedModel.scenarios, function(scenario) {
                        objectHelper.forEach.call(scenario.data, function(timeTable) {
                            timeTable.onChange = function() {
                                loadedModel.emit(null, 'refresh', 'resetUI');
                            };
                        });
                    });

                    loadedModel.emit([loadedModel.id, loadedModel.syncId, previousId, previousSyncId], 'modelLoaded');
                    loadedModel.emit(null, 'refresh', 'resetUI');
                });
            }  else {
                loadedModel.nodeGui  = {};
                loadedModel.nodeData = {};

                var savedModel = savedModels.synced[option];

                if(loadedModel.id !== savedModel.id && loadedModel.syncId !== savedModel.syncId) {
                    savedModel.selected = false;
                    loadedModel.floatingWindows.forEach(function(floatingWindow) {
                        floatingWindow.destroyWindow();

                        if(floatingWindow.hide) {
                            floatingWindow.hide();
                        }
                    });
                }

                objectHelper.forEach.call(
                    savedModel,
                    function(value, key) {
                        loadedModel[key] = value;
                    }
                );

                loadedModel.emit([loadedModel.id, loadedModel.syncId, previousId, previousSyncId], 'modelLoaded');
                loadedModel.emit(null, 'refresh', 'resetUI');
            }
        } else {
            loadedModel.nodeGui  = {};
            loadedModel.nodeData = {};
            
            var savedModel = savedModels.local[option];
            if(loadedModel.id !== savedModel.id && loadedModel.syncId !== savedModel.syncId) {
                savedModel.selected = false;
                loadedModel.floatingWindows.forEach(function(floatingWindow) {
                    floatingWindow.destroyWindow();

                    if(floatingWindow.hide) {
                        floatingWindow.hide();
                    }
                });
            }

            objectHelper.forEach.call(
                savedModel,
                function(value, key) {
                    loadedModel[key] = value;
                }
            );

            loadedModel.emit([loadedModel.id, loadedModel.syncId, previousId, previousSyncId], 'modelLoaded');
            loadedModel.emit(null, 'refresh', 'resetUI');
        }
    });

    loadedModel.addListener('errorLoadingModel', function() {
        if(objectHelper.size.call(savedModels.local) === 0) {
            return loadedModel.emit('newModel');
        }

        loadedModel.emit(objectHelper.first.call(savedModels.local).id, 'loadModel');
    });
}

module.exports = addLoadModelListeners;

},{"./../../model_layer.js":"model_layer.js","./../../object-helper.js":"object-helper.js"}],"model/listeners/mouse_down.js":[function(require,module,exports){
'use strict';

var mleftDrag     = require('./../../input/mleft_drag.js'),
    mrightDrag    = require('./../../input/mright_drag.js');

var mouseMiddlewares = [
    mleftDrag,
    mrightDrag
];

function addMouseDownListener(loadedModel) {
    loadedModel.addListener('mouseDown', function(canvas, button, startPos, lastPos, mouseMove, mouseUp) {
        var middlewares = mouseMiddlewares.filter(function(input) {
            return input.button === button;
        });

        var activateMouseMove = false,
            activateMouseUp   = false;

        middlewares.forEach(function(middleware) {
            var startCallback  = middleware.mouseDown,
                updateCallback = middleware.mouseMove,
                endCallback    = middleware.mouseUp,
                missCallback   = middleware.miss;

            var result = startCallback(canvas, loadedModel, startPos);
            if (result) {
                if(updateCallback) {
                    activateMouseMove = true;
                }

                if (endCallback) {
                    activateMouseUp = true;
                }
            } else if (missCallback) {
                missCallback(canvas, loadedModel, startPos);
            }
        });

        if(activateMouseMove) {
            window.addEventListener('mousemove', mouseMove);
        }

        if(activateMouseUp) {
            window.addEventListener('mouseup', mouseUp);
        }

        this.emit('refresh');
    });

}

module.exports = addMouseDownListener;

},{"./../../input/mleft_drag.js":"input/mleft_drag.js","./../../input/mright_drag.js":"input/mright_drag.js"}],"model/listeners/mouse_move.js":[function(require,module,exports){
'use strict';

var mleftDrag     = require('./../../input/mleft_drag.js'),
    mrightDrag    = require('./../../input/mright_drag.js');

var mouseMiddlewares = [
    mleftDrag,
    mrightDrag
];

function addMouseMoveListener(loadedModel) {
    loadedModel.addListener('mouseMove', function(canvas, button, startPos, lastPos, endPos, deltaPos) {
        var middlewares = mouseMiddlewares.filter(function(input) {
            return input.button === button;
        });

        middlewares.forEach(function(middleware) {
            middleware.mouseMove(canvas, loadedModel, endPos, deltaPos);
        });

        this.emit('refresh');
    });
}

module.exports = addMouseMoveListener;

},{"./../../input/mleft_drag.js":"input/mleft_drag.js","./../../input/mright_drag.js":"input/mright_drag.js"}],"model/listeners/mouse_up.js":[function(require,module,exports){
'use strict';

var mleftDrag     = require('./../../input/mleft_drag.js'),
    mrightDrag    = require('./../../input/mright_drag.js');

var mouseMiddlewares = [
    mleftDrag,
    mrightDrag
];

function addMouseUpListener(loadedModel) {
    loadedModel.addListener('mouseUp', function(canvas, button, endPos) {
        var middlewares = mouseMiddlewares.filter(function(input) {
            return input.button === button;
        });

        middlewares.forEach(function(middleware) {
            middleware.mouseUp(canvas, loadedModel, endPos);
        });

        this.emit('refresh');
    });
}

module.exports = addMouseUpListener;

},{"./../../input/mleft_drag.js":"input/mleft_drag.js","./../../input/mright_drag.js":"input/mright_drag.js"}],"model/listeners/new_model.js":[function(require,module,exports){
'use strict';

var modelLayer   = require('./../../model_layer.js'),
    objectHelper = require('./../../object-helper.js');

function addNewModelListeners(savedModels, loadedModel) {
    /**
     * @description Load and replace the current model with a new local model.
     * @event newModel
     * @memberof module:model/propagationEvents
     */   
    loadedModel.addListener('newModel', function() {
        var m = modelLayer.newModel();
        objectHelper.forEach.call(
            m,
            function(value, key) {
                loadedModel[key] = value;
            }
        );

        savedModels.local[loadedModel.id] = m;

        loadedModel.emit([m.id, m.syncId], 'modelLoaded');
        loadedModel.emit(null, 'refresh', 'resetUI');
    });
}

module.exports = addNewModelListeners;

},{"./../../model_layer.js":"model_layer.js","./../../object-helper.js":"object-helper.js"}],"model/listeners/node_modified.js":[function(require,module,exports){

},{}],"model/listeners/notification.js":[function(require,module,exports){
'use strict';

var notification = require('./../../notification_bar');

function addDefaultNotificationListeners(container, loadedModel) {
    /**
     * @module model/propagationEvents
     */

    /**
     * @description Send a notification.
     * @event notification
     *
     * @param {string} message - Message to display in the notification tray.
     */
    loadedModel.addListener('notification', function(message) {
        var delay = 4000;
        if(typeof message === 'object') {
            delay   = message.delay;
            message = message.message;
        }

        notification.notify(container, message);
    });
};

module.exports = addDefaultNotificationListeners;

},{"./../../notification_bar":"notification_bar/notification_bar.js"}],"model/listeners/popup.js":[function(require,module,exports){
'use strict';

var newUI = require('./../../new_ui');

var Element = newUI.Element,
    Button  = newUI.Button;

function createPopup(config) {
    if(!config || typeof config !== 'object') {
        return false;
    }

    if((!config.description || typeof config.description !== 'string')
    && (!config.buttons || !config.buttons.forEach)) {
        return false;
    }

    var container = new Element('div');

    container.root.style.display  = 'flex';

    container.root.style.position = 'absolute';
    container.root.style.top      = '0px';
    container.root.style.left     = '0px';

    container.root.style['z-index'] = '4';

    container.setWidth('100%');
    container.setHeight('100%');

    container.setBackground('rgba(0,0,0,0.5)');

    var popup = new Element('div');

    popup.setBackground('#fafafa');
    popup.setWidth('300px');

    popup.root.style.display           = 'flex';
    popup.root.style['align-items']    = 'stretch';
    popup.root.style['flex-direction'] = 'column';

    popup.root.style.margin = 'auto';

    container.appendChild(popup);

    var content         = new Element('div');
    var buttonContainer = new Element('div');

    if(config.description) {
        content.setLabel(config.description);
        content.root.style.padding       = '14px';
        content.root.style.margin        = 'auto';
        content.root.style['text-align'] = 'center';
    }

    content.root.style.display                   = 'flex';
    buttonContainer.root.style.display           = 'flex';
    buttonContainer.root.style['align-items']    = 'stretch';
    buttonContainer.root.style['flex-direction'] = 'row';

    if(typeof config.buttons === 'function') {
        config.buttons = [config.buttons];
    }

    config.buttons.forEach(function(buttonData) {
        if(!buttonData.callback) {
            return;
        }

        if(!buttonData.label) {
            buttonData.label = '';
        }

        var button = new Button();
        button.setLabel(buttonData.label)
        button.click(function() {
            buttonData.callback(container);
        });

        if(buttonData.background) {
            button.setBackground(buttonData.background);
        }

        button.root.style.display      = 'flex';
        button.label.root.style.margin = 'auto';

        button.root.style.padding      = '14px';

        button.root.style['flex-grow'] = '1';

        buttonContainer.appendChild(button);
    });

    popup.appendChild(content);
    popup.appendChild(buttonContainer);

    return container;
}

module.exports = function(container, loadedModel) {
    container.style.position = 'relative';
    loadedModel.addListener('popup', function(config) {
        var popup = createPopup(config);

        // Given config was iinvalid and no popup should be created.
        if(popup === false) {
            console.error(config, 'given to popup event.');
            return;
        }

        container.insertBefore(popup.root, container.firstChild);
    });
};
},{"./../../new_ui":"new_ui/new_ui.js"}],"model/listeners/reset_ui.js":[function(require,module,exports){
'use strict';

function addResetUIListeners(sidebarManager, menu, savedModels, loadedModel) {
    /**
     * @description Redraw the UI.
     * @event resetUI
     * @memberof module:model/propagationEvents
     * @fires module:model/statusEvents.selected
     */
    loadedModel.addListener('resetUI', function() {
        sidebarManager.setEnvironment(loadedModel.environment);
        sidebarManager.addSidebar(loadedModel.sidebar, loadedModel);
        menu.resetMenu(loadedModel, savedModels);

        loadedModel.floatingWindows.forEach(function(floatingWindow) {
            floatingWindow.refresh();
        });

        loadedModel.emit('select');
    });
}

module.exports = addResetUIListeners;

},{}],"model/listeners/save_model.js":[function(require,module,exports){
'use strict';

var modelLayer   = require('./../../model_layer.js'),
    objectHelper = require('./../../object-helper.js');

function addSaveModelListeners(savedModels, loadedModel) {
    /**
     * @description A model with given id was saved under given synchronized id.
     * @event modelSaved
     * @memberof module:model/statusEvents
     *
     * @param {integer} id - Local id
     * @param {integer} syncId - Synchronized id
     * @example tool.addListener('modelSaved', function(id, syncId) {
     *     console.log('Model with id:', id, syncId, 'was saved or updated.');
     * });
     */
     
    /**
     * @description Save a model matching either synchronized id or local id.
     * @event saveModel
     * @memberof module:model/propagationEvents
     *
     * @param {integer} id - Local id
     * @param {integer} syncId - Synchronized id
     */
    loadedModel.addListener('saveModel', function(id, syncId) {
        var m = savedModels.synced[syncId] || savedModels.local[id];
        if(!m || typeof m === 'string') {
            loadedModel.emit('Model was not stored in correct location. Saving failed.', 'notification');
            throw new Error('Couldn\'t save model.');
        }

        modelLayer.saveModel(
                loadedModel.CONFIG.url,
                loadedModel.CONFIG.userFilter,
                loadedModel.CONFIG.projectFilter,
                m,
                function() {

            savedModels.synced[m.syncId] = m;
            //delete savedModels.local[m.id];
            if(id === loadedModel.id) {
                loadedModel.syncId = m.syncId;
            }

            loadedModel.emit([m.id, m.syncId, m], 'modelSaved');
        });
    });

    loadedModel.addListener('modelSaved', function(id, syncId) {
        var m = savedModels.synced[syncId] || savedModels.local[id];
        if(!m || typeof m === 'string') {
            loadedModel.emit('Model was not stored in correct location. Saving probably finished, but wut.', 'notification');
            throw new Error('Model data corrupted.');
        }

        /*objectHelper.forEach.call(m, function(value, key) {
            loadedModel[key] = value;
        });*/

        loadedModel.emit('Model \'' + m.settings.name + '\' saved.', 'notification');
    });
}

module.exports = addSaveModelListeners;

},{"./../../model_layer.js":"model_layer.js","./../../object-helper.js":"object-helper.js"}],"model/listeners/selected.js":[function(require,module,exports){
'use strict';

var objectHelper = require('./../../object-helper.js'),
    NewUI        = require('./../../new_ui');

var Colors = NewUI.Colors;

var modelling    = require('./../../settings/modelling.js');
var roles        = {};

modelling.forEach(function(group) {
    group.header = group.header.toUpperCase();
    if(!roles[group.header]) {
        roles[group.header] = [];
    }

    roles[group.header] = roles[group.header].concat(group.images);
});

var linkModellingFilter = [
    {property: 'type',        type: 'dropdown', values: ['halfchannel', 'fullchannel']},

    {property: 'threshold',   type: 'input', check: function(value) {
        var match = value.match(/^-?\d+\.?\d*$/);
        if(match === null) {
            return false;
        }

        return true;
    }, set: function(value){return parseFloat(value);}}, 

    {property: 'coefficient', type: 'input', check: function(value) {
        var match = value.match(/^-?\d+\.?\d*$/);
        if(match === null) {
            return false;
        }
        
        return true;
    }, set: function(value){return parseFloat(value);}},

    {property: 'timelag',     type: 'input', check: function(value) {
        var match = value.match(/^\d+$/);
        if(match === null) {
            return false;
        }

        return true;
    }, set: function(value){return parseInt(value);}},

    //{property: 'bidirectional', type: 'checkbox'},

    {property: 'bidirectionalTimelag', type: 'input', check: function(value) {
        var match = value.match(/^\d+$/);
        if(match === null) {
            return false;
        }

        return true;
    }, set: function(value) {
        return parseInt(value);
    }, showCondition: function(link) {
        console.log(link);
        return link.bidirectional;
    }}
],
    dataModellingFilter = [
    {property: 'name',        type: 'input', check: function() {
        return true;
    }},
    {property: 'description', type: 'input', check: function() {
        return true;
    }},
    {property: 'baseline',    type: 'input', check: function(value) {
        var match = value.match(/^-?\d+$/);
        if(match === null) {
            return false;
        }

        return true;
    }, set: function(value) {
        return parseFloat(value);
    }}
],
    guiModellingFilter  = [
    {property: 'color',         type: 'input', check: function(value) {
        var match = value.match(/^#[0-9a-fA-F]{3}$|^#[0-9a-fA-F]{6}$/);
        return match !== null;
    }},
    {property: 'avatar',        type: 'iconGroup', groups: roles}
];

function getInput(loadedModel, menuItem, inputs, iterator) {
    var input;
    if(iterator < inputs.length) {
        input = inputs[iterator];
    } else {
        input = menuItem.addInput();
        inputs.push(input);

        input.defaultValue(function() {
            if(!input.changeProperty) {
                return '';
            }

            return input.changeObject[input.changeProperty];
        });

        input.onChange(function() {
            var value = input.getValue();
            if(!input.changeCheck(value)) {
                input.setValue(input.changeObject[input.changeProperty]);
                return;
            }

            if(input.setObjectValue) {
               input.changeObject[input.changeProperty] = input.setObjectValue.call(input, value);
            } else {
               input.changeObject[input.changeProperty] = value;
            }

            loadedModel.floatingWindows.forEach(function(floatingWindow) {
                floatingWindow.refresh();
            });

            loadedModel.emit([value, input.changeProperty, input.changeObject], 'dataModified');
            loadedModel.emit('refresh');
        });
    }

    return input;
}

function getButton(loadedModel, menuItem, buttons, iterator) {
    var button;
    if(iterator < buttons.length) {
        button = buttons[iterator];
        button.removeEvents();
    } else {
        button = menuItem.addButton();
        buttons.push(button);
    }

    return button;
}

function getDropdown(loadedModel, menuItem, dropdowns, iterator) {
    var dropdown;
    if(iterator < dropdowns.length) {
        dropdown = dropdowns[iterator];
    } else {
        dropdown = menuItem.addDropdown();
        dropdowns.push(dropdown);

        dropdown.defaultValue(function() {
            if(!dropdown.changeProperty) {
                return '';
            }

            return dropdown.changeObject[dropdown.changeProperty];
        });

        dropdown.onChange(function() {
            var value = dropdown.getValue();

            dropdown.changeObject[dropdown.changeProperty] = value;

            loadedModel.emit([value, dropdown.changeProperty, dropdown.changeObject], 'dataModified');
            loadedModel.emit('refresh');
        });
    }

    return dropdown;
}

function getCheckbox(loadedModel, menuItem, checkboxes, iterator) {
    var checkbox;
    if(iterator < checkboxes.length) {
        checkbox = checkboxes[iterator];
    } else {
        checkbox = menuItem.addCheckbox();
        checkboxes.push(checkbox);

        checkbox.onCheck(function() {
            if(checkbox.setObjectValue) {
                var v = checkbox.setObjectValue(true);
                checkbox.changeObject[checkbox.changeProperty] = v;
                loadedModel.emit([v, dropdown.changeProperty, dropdown.changeObject], 'dataModified');
            } else {
                checkbox.changeObject[checkbox.changeProperty] = true;
                loadedModel.emit([true, dropdown.changeProperty, dropdown.changeObject], 'dataModified');
            }

        });

        checkbox.onUncheck(function() {
            if(checkbox.setObjectValue) {
                var v = checkbox.setObjectValue(false);
                checkbox.changeObject[checkbox.changeProperty] = v;
                loadedModel.emit([v, dropdown.changeProperty, dropdown.changeObject], 'dataModified');
            } else {
                checkbox.changeObject[checkbox.changeProperty] = false;
                loadedModel.emit([false, dropdown.changeProperty, dropdown.changeObject], 'dataModified');
            }

        });
    }

    return checkbox;
}

function getSliders(loadedModel, menuItem, sliders, iterator) {

}

function getIconGroup(loadedModel, menuItem, iconGroups, iterator) {
    var iconGroup;
    if(iterator < iconGroups.length) {
        iconGroup = iconGroups[iterator];

        iconGroup.invalidate();
    } else {
        iconGroup = menuItem.addIconGroup();
        iconGroups.push(iconGroup);

        iconGroup.clicks = [];
        NewUI.Button.prototype.click.call(iconGroup, function(evt) {
            var clickedIcon = evt.target.clickedIcon;
            if(!clickedIcon) {
                return;
            }

            if(iconGroup.changeObject) {
                if(iconGroup.lastActive) {
                    var lastRoot = iconGroup.lastActive.image.root;
                    lastRoot.style.border = 'none';
                }

                iconGroup.lastActive = clickedIcon;
                clickedIcon.image.root.style.border = '4px solid ' + Colors.activeAvatar;

                iconGroup.changeObject[iconGroup.changeProperty] = clickedIcon.currentImage.src;
                loadedModel.emit('refresh');
            }
        });
    }

    return iconGroup;
}

function hideEverything(inputs, buttons, dropdowns, checkboxes, sliders, iconGroups) {
    inputs.forEach(function(input) {
        input.hide();
    });

    buttons.forEach(function(button) {
        button.buttonContainer.hide();
    });

    dropdowns.forEach(function(dropdown) {
        dropdown.hide();
    });

    checkboxes.forEach(function(checkbox) {
        checkbox.hide();
    });

    sliders.forEach(function(slider) {
        slider.hide();
    });

    iconGroups.forEach(function(iconGroup) {
        iconGroup.hide();
    });
}

function setupInput(loadedModel, menuItem, inputs, iteration, row, item) {
    var input = getInput(loadedModel, menuItem, inputs, iteration);

    input.changeProperty = row.property;
    input.changeObject   = item;
    input.changeCheck    = row.check;
    
    input.setObjectValue = false;
    if(row.set) {
        input.setObjectValue = row.set;
    }

    input.setLabel(row.property);
    input.refresh();

    if(row.showCondition && !row.showCondition(item)) {
        input.hide();
    } else {
        input.show();
    }

    return input;
}

function setupIconGroup(loadedModel, menuItem, iconGroups, iteration, row, data, gui) {
    var iconGroup = getIconGroup(loadedModel, menuItem, iconGroups, iteration);

    iconGroup.changeProperty = row.property;
    iconGroup.changeObject   = gui;

    iconGroup.setLabel(row.property);

    var iconIterator = 0;
    if(row.groups[data.role]) {
        row.groups[data.role].forEach(function(img) {
            var btn = iconGroup.reuseIcon(loadedModel.CONFIG.url + '/' + img.src, iconIterator);
            btn.root.clickedIcon       = btn;
            btn.image.root.clickedIcon = btn;

            btn.currentImage = img;

            btn.image.root.style.border = 'none';
            btn.image.root.style['border-radius'] = '50%';

            if(gui[row.property] === img.src) {
                btn.image.root.style.border = '4px solid ' + Colors.activeAvatar;
                iconGroup.lastActive = btn;
            }

            iconIterator++;
        });
    }

    if(row.showCondition && !row.showCondition(item)) {
        iconGroup.hide();
    } else {
        iconGroup.show();
    }

    return iconGroup;
}

function setupDropdown(loadedModel, menuItem, dropdowns, iteration, row, item) {
    var dropdown = getDropdown(loadedModel, menuItem, dropdowns, iteration);

    dropdown.changeProperty = row.property;
    dropdown.changeObject   = item;

    dropdown.setLabel(row.property);
    dropdown.replaceValues(row.values);
    dropdown.refresh();

    if(row.showCondition && !row.showCondition(item)) {
        dropdown.hide();
    } else {
        dropdown.show();
    }

    return dropdown;
}

function setupCheckbox(loadedModel, menuItem, checkboxes, iteration, row, item) {
    var checkbox = getCheckbox(loadedModel, menuItem, checkboxes, iteration);

    checkbox.changeProperty = row.property;
    checkbox.changeObject   = item;

    if(item[row.property]) {
        checkbox.check();
    } else {
        checkbox.uncheck();
    }

    checkbox.setLabel(row.property);
    checkbox.refresh();

    if(row.showCondition && !row.showCondition(item)) {
        checkbox.hide();
    } else {
        checkbox.show();
    }

    return checkbox;
}

function showNodeMenu(loadedModel, menuItem, inputs, buttons, dropdowns, checkboxes, sliders, iconGroups, nodeData, nodeGui) {
    var inputIterator     = 0,
        buttonIterator    = 0,
        dropdownIterator  = 0,
        checkboxIterator  = 0,
        iconGroupIterator = 0,
        sliderIterator    = 0;

    hideEverything(inputs, buttons, dropdowns, checkboxes, sliders, iconGroups);

    var deleteButton = getButton(loadedModel, menuItem, buttons, buttonIterator);
    deleteButton.setLabel('Delete selected');
    deleteButton.click(function() {
        loadedModel.emit('deleteSelected');
    });

    deleteButton.buttonContainer.show();

    var showConditions = [];
    dataModellingFilter.forEach(function(row) {
        switch(row.type.toUpperCase()) {
            case 'INPUT':
                var input = setupInput(loadedModel, menuItem, inputs, inputIterator, row, nodeData);
                if(row.showCondition) {
                    showConditions.push({
                        element:  input,
                        callback: row.showCondition
                    });
                }

                inputIterator++;
                break;
        }
    });

    guiModellingFilter.forEach(function(row) {
        switch(row.type.toUpperCase()) {
            case 'INPUT':
                var input = setupInput(loadedModel, menuItem, inputs, inputIterator, row, nodeGui);
                if(row.showCondition) {
                    showConditions.push({
                        element:  input,
                        callback: row.showCondition
                    });
                }

                inputIterator++;
                break;
            case 'ICONGROUP':
                var iconGroup = setupIconGroup(loadedModel, menuItem, iconGroups, iconGroupIterator, row, nodeData, nodeGui);
                if(row.showCondition) {
                    showConditions.push({
                        element:  input,
                        callback: row.showCondition
                    });
                }

                iconGroupIterator++;
                break;
        }
    });

    return showConditions;
}

function showLinkMenu(loadedModel, menuItem, inputs, buttons, dropdowns, checkboxes, sliders, iconGroups, link) {
    var inputIterator     = 0,
        buttonIterator    = 0,
        dropdownIterator  = 0,
        checkboxIterator  = 0,
        iconGroupIterator = 0,
        sliderIterator    = 0;

    hideEverything(inputs, buttons, dropdowns, checkboxes, sliders, iconGroups);

    var deleteButton = getButton(loadedModel, menuItem, buttons, buttonIterator);
    deleteButton.setLabel('Delete selected');
    deleteButton.click(function() {
        loadedModel.emit('deleteSelected');
    });

    deleteButton.buttonContainer.show();

    var showConditions = [];
    linkModellingFilter.forEach(function(row) {
        switch(row.type.toUpperCase()) {
            case 'INPUT':
                var input = setupInput(loadedModel, menuItem, inputs, inputIterator, row, link);
                if(row.showCondition) {
                    showConditions.push({
                        element:  input,
                        callback: row.showCondition
                    });
                }

                inputIterator++;
                break;
            case 'DROPDOWN':
                var dropdown = setupDropdown(loadedModel, menuItem, dropdowns, dropdownIterator, row, link);
                if(row.showCondition) {
                    showConditions.push({
                        element:  dropdown,
                        callback: row.showCondition
                    });
                }

                dropdownIterator++;
                break;
            case 'CHECKBOX':
                var checkbox = setupCheckbox(loadedModel, menuItem, checkboxes, checkboxIterator, row, link);
                if(row.showCondition) {
                    showConditions.push({
                        element:  dropdown,
                        callback: row.showCondition
                    });
                }

                checkboxIterator++;
                break;
        }
    });

    return showConditions;
}

function setupSelectedMenu(sidebar, loadedModel) {
    var menuItem = new NewUI.MenuItem(300);

    menuItem.setLabel('Selected');
    menuItem.root.style.display = 'none';

    var inputs     = [],
        buttons    = [],
        dropdowns  = [],
        checkboxes = [],
        sliders    = [],
        iconGroups = [];

    var previousSelected = false;
    var showConditions   = null;
    menuItem.refresh = function() {
        if(previousSelected === loadedModel.selected) {
            if(showConditions && showConditions.length > 0) {
                showConditions.forEach(function(condition) {
                    if(condition.callback(previousSelected)) {
                        condition.element.show();
                    } else {
                        condition.element.hide();
                    }
                });
            }
            return;
        }

        if(loadedModel.selected === false) {
            return loadedModel.emit('deselect');
        }

        showConditions   = null;
        previousSelected = loadedModel.selected;
        var selected     = loadedModel.selected;
        if(!selected || !selected.objectId) {
            hideEverything(inputs, buttons, dropdowns, checkboxes, sliders, iconGroups);
            return;
        }

        if(selected.objectId === 'nodeGui' || selected.objectId === 'nodeData') {
            var nodeData = loadedModel.nodeData[selected.id],
                nodeGui  = loadedModel.nodeGui[selected.id];

            if(!nodeData || !nodeGui) {
                return loadedModel.emit('deselect');
            }

            showNodeMenu(loadedModel, menuItem, inputs, buttons, dropdowns, checkboxes, sliders, iconGroups, nodeData, nodeGui);
        } else if(selected.objectId === 'link') {
            var link = loadedModel.links[selected.id];
            if(!link) {
                return loadedModel.emit('deselect');
            }

            showConditions = showLinkMenu(loadedModel, menuItem, inputs, buttons, dropdowns, checkboxes, sliders, iconGroups, link);
        }
    };

    menuItem.refresh();

    sidebar.addItem(menuItem);

    var sidebarParent = sidebar.root.parentElement;
    sidebarParent.insertBefore(menuItem.child.root, sidebar.root.nextSibling);

    menuItem.child.root.style.right = '0';
    menuItem.child.root.style.top   = '0';
    menuItem.child.setHeight('100%');
    menuItem.child.root.style['max-height'] = '100%';

    return menuItem;
}

function setupSettingsMenu(sidebar, loadedModel) {
    var menuItem = new NewUI.MenuItem(300);

    menuItem.setLabel('Settings');

    var name = menuItem.addInput('Name');
    name.defaultValue(function() {
        return loadedModel.settings.name;
    });

    name.onChange(function() {
        loadedModel.settings.name = name.getValue();
        loadedModel.emit('resetUI');
    });

    sidebar.addItem(menuItem);
    return menuItem;
}

function addSelectedListeners(sidebar, loadedModel) {
    var selectedMenu = setupSelectedMenu(sidebar, loadedModel);
    var settingsMenu = setupSettingsMenu(sidebar, loadedModel);

    /**
     * @description Deselect all selected nodes.
     * @event deselect
     * @memberof module:model/propagationEvents
     */
    loadedModel.addListener('deselect', function() {
        objectHelper.forEach.call(this.nodeGui, function(gui, id) {
            gui.selected = false;
        });

        selectedMenu.child.fold();

        /**
         * @description Item was deselected by any means.
         * @event deselected
         * @memberof module:model/statusEvents
         *
         * @example tool.addListener('deselected', function() {
         *     console.log('Nothing is selected.');
         * });
         */
        loadedModel.emit('deselected');
    });

    loadedModel.addListener('selectableObjectUpdated', function() {
        selectedMenu.refresh();
    });

    var previousSelected = false;
    /**
     * @description Select a new item under model.selected;
     * @event select
     * @memberof module:model/propagationEvents
     */
    loadedModel.addListener('select', function() {
        if(previousSelected !== loadedModel.selected) {
            selectedMenu.refresh();
            previousSelected = loadedModel.selected;
            if(loadedModel.selected === false) {
                loadedModel.emit('deselect');
            } else {
                selectedMenu.child.unfold();

                /**
                 * @description Item was selected.
                 * @event selected
                 * @memberof module:model/statusEvents
                 *
                 * @param {object} selected - The currently selected object.
                 * @example tool.addListener('selected', function(object) {
                 *     if(object.objectId !== 'nodeData' && object.objectId !== 'nodeGui') {
                 *         return console.log('Not a node.');
                 *     }
                 *     
                 *     var nodeData = this.nodeData[this.selected.id];
                 *     var nodeGui  = this.nodeGui[this.selected.id];
                 *     console.log('Node selected', nodeData, nodeGui);
                 * });
                 */
                loadedModel.emit(this.selected, 'selected');
            }
        }
    });
}

module.exports = addSelectedListeners;

},{"./../../new_ui":"new_ui/new_ui.js","./../../object-helper.js":"object-helper.js","./../../settings/modelling.js":"settings/modelling.js"}],"model/listeners/settings.js":[function(require,module,exports){
'use strict';

function addSettingsListeners(loadedModel) {
}

module.exports = addSettingsListeners;

},{}],"model/listeners/store_model.js":[function(require,module,exports){
'use strict';

var modelLayer   = require('./../../model_layer.js'),
    objectHelper = require('./../../object-helper.js');

function addStoreModelListeners(savedModels, loadedModel) {
    /**
     * @description A new model should be stored and moved away from the currently loaded one.
     * @event storeModel
     * @memberof module:model/propagationEvents
     */
    loadedModel.addListener('storeModel', function() {
        var m;
        if(loadedModel.synced === true) {
            m = modelLayer.moveModel(loadedModel);
            savedModels.synced[loadedModel.syncId] = m;
            if(savedModels.local[m.id]) {
                savedModels.local[m.id] = m;
            }
        } else {
            m = modelLayer.moveModel(loadedModel);
            savedModels.local[loadedModel.id] = m;
        }
    });
}

module.exports = addStoreModelListeners;

},{"./../../model_layer.js":"model_layer.js","./../../object-helper.js":"object-helper.js"}],"model_layer.js":[function(require,module,exports){
'use strict';

/**
 * Model layer for model related helper methods.
 * @module model
 */

var network         = require('./network'),
    Immutable       = null,
    breakout        = require('./breakout.js'),
    Scenario        = require('./scenario').Scenario,
    TimeTable       = require('./structures/timetable.js'),
    menuBuilder     = require('./menu_builder'),
    Promise         = require('promise');

var createNode = require('./structures/create_node.js'),
    createLink = require('./structures/create_link.js');

var objectHelper = require('./object-helper');
    
var settings = require('./settings');

// Used to generate a local and incremential ID to avoid collisions for models.
var generateId = -1;

// Not used anymore, I think.
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

/**
 * @description Model constructor
 * @see {@link model/Model}
 * @class
 *
 * @param {integer} id - Model id, should probably be unique.
 * @param {object} data - Data to override keys on construction.
 */ 

function Model(id, data) {
    /** @member {object} */
    this.changed     = {};
    /** @member {object} */
    this.timestamps  = {};

    /** @member {integer} */
    this.id          = id;
    /** @member {integer} */
    this.syncId      = false;
    /** @member {boolean} */
    this.saved       = false;
    /** @member {boolean} */
    this.synced      = false;

    /** @member {integer} */
    this.nextId      = 0;
    /** @member {object} */
    this.nodeData    = {};
    /** @member {object} */
    this.nodeGui     = {};
    /** @member {object} */
    this.links       = {};

    /** @member {array} */
    this.history         = [];
    /** @member {array} */
    this.revertedHistory = [];

    /** @member {object} */
    this.selected        = false;
    /** @member {string} */
    this.environment     = 'modelling';
    /** @member {object} */
    this.sidebar         = settings.sidebar;
    /** @member {array} */
    this.floatingWindows = [];

    /** @member {object} */
    this.settings = {
        name:          'New Model',
        //maxIterations: 4,
        offsetX:       0,
        offsetY:       0,
        zoom:          1,
        linegraph:     false,
        objectId:      'modelSettings',
        id:            0

        //timeStepT:     'Week',
        //timeStepN:     0
    };

    /** @member {object} */
    this.scenarios      = {};
    var __ = new Scenario(this);
    this.scenarios[__.id] = __;

    /** @member {object} */
    this.loadedScenario = __;

    if(data) {
        Object.keys(data).forEach(function(key) {
            this[key] = data[key];
        }, this);
    }

    /** @member {string} */
    this.objectId = 'model';
}

function getAllModels(callback) {
    var userFilter    = this.CONFIG.userFilter,
        projectFilter = this.CONFIG.projectFilter,
        url           = this.CONFIG.url;

    return new Promise(function(fulfill, reject) {
        network(url, '/models/' + userFilter + '/' + projectFilter + '/all', function(response, error) {
            if(error || response.status !== 200) {
                return reject(error, response);
            }

            fulfill(response.response);
        });
    });
}

/** @module model/api */


Model.prototype = {
    /**
     * @description Push a state of history onto the stack for undo/redo.
     * @name pushHistory
     * @function
     *
     * @param {object} state - A struct of history state.
     * @param {string} state.action - History action.
     * @param {object} state.data - Data relevant to undo and redo history.
     */
    pushHistory: function(data) {
        if(!data.action) {
            return;
        }

        this.history.push(data);
        this.revertedHistory = [];
    },

    /**
     * @description Undo the last action of the selected model.
     * @name undo
     * @function
     */
    undo: function() {
        if(this.history.length === 0) {
            return;
        }

        var lastAction = this.history.splice(this.history.length - 1, 1)[0];
        this.revertedHistory.push(lastAction);

        switch(lastAction.action.toUpperCase()) {
            case 'NEWNODE':
                var data = lastAction.data;
                this.emit(data.data.id, 'deleteNode');
                break;
            case 'NEWLINK':
                var link = lastAction.data.link;
                this.emit(link.id, 'deleteLink');
                break;

            case 'DELETENODE':
                var data = lastAction.data;
                this.nodeData[data.data.id] = data.data;
                this.nodeGui[data.gui.id]   = data.gui;

                data.links.forEach(function(l) {
                    this.nodeGui[l.node1].links.push(l.id);
                    this.nodeGui[l.node2].links.push(l.id);

                    this.links[l.id] = l;
                }, this);

                break;

            case 'DELETELINK':
                var link = lastAction.data.link;
                this.links[link.id] = link;

                this.nodeGui[link.node1].links.push(link.id);
                this.nodeGui[link.node2].links.push(link.id);
                break;
        }

        /**
         * @description Latest action in the history chain was undone.
         * @event undone
         * @memberof module:model/statusEvents
         * @example tool.addListener('undone', function() {
         *     console.log('History state undone.');
         * });
         */
        this.emit('undone');

        this.selected = false;
        this.emit(null, 'select', 'refresh', 'resetUI');
    },

    /**
     * @description Create a node with the given name
     * @name deleteSelected
     * @function
     */
    deleteSelected: function() {
        this.emit('deleteSelected');
        
        this.selected = false;
        this.emit(null, 'select', 'refresh', 'resetUI');
    },

    /**
     * @description Delete a node under the given id.
     * @name deleteNode 
     * @function
     *
     * @param {string} nodeId - The node id to delete.
     */
    deleteNode: function(id) {
        this.emit(id, 'deleteNode');
        
        this.selected = false;
        this.emit(null, 'select', 'refresh', 'resetUI');
    },

    /**
     * @description Delete a link under the given id.
     * @name deleteLink
     * @function
     *
     * @param {string} linkId - The link id to delete.
     */
    deleteLink: function(id) {
        this.emit(id, 'deleteLink');
        
        this.selected = false;
        this.emit(null, 'select', 'refresh', 'resetUI');
    },

    /**
     * @description Create a node with the given name
     * @name createNode
     * @function
     *
     * @param {string} name - Name the node should inherit. 
     * @param {string} type - Node type. 
     * @param {string} prototypeId - Prototype id.
     */
    createNode: function(name, type, role, prototypeId) {
        if(    typeof name !== 'string'
            || typeof type !== 'string'
            || typeof role !== 'string') {
            throw new Error('Couldn\'t create node since information is lacking. Requires strings: name, type, role.');
        }

        createNode(this, {
            name:        name,
            prototypeId: prototypeId,
            role:        role.toUpperCase()
        }, {}, type || 'template');
    },

    /**
     * @description Create a node with the given structure.
     * @name createNodeByStructure
     * @function
     *
     * @param {object} nodeData - nodeData structure. 
     * @param {object} nodeGui - nodeGui structure. 
     */
    createNodeByStructure: function(data, gui) {
        gui.selected = false;
        createNode(this, data, gui);
    },

    /**
     * @description Redo the last undone action of the selected model.
     * @name redo
     * @function
     */
    redo: function() {
        if(this.revertedHistory.length === 0) {
            return;
        }

        var lastAction = this.revertedHistory.splice(this.revertedHistory.length - 1, 1)[0];
        this.history.push(lastAction);

        switch(lastAction.action.toUpperCase()) {
            case 'NEWNODE':
                var data                    = lastAction.data;
                this.nodeData[data.data.id] = data.data;
                this.nodeGui[data.gui.id]   = data.gui;
                break;
            case 'NEWLINK':
                var link            = lastAction.data.link;
                this.links[link.id] = link;

                this.nodeGui[link.node1].links.push(link.id);
                this.nodeGui[link.node2].links.push(link.id);
                break;

            case 'DELETENODE':
                var data = lastAction.data;
                this.emit(data.data.id, 'deleteNode');
                break;

            case 'DELETELINK':
                var link = lastAction.data.link;
                this.emit(link.id, 'deleteLink');
                break;
        }

        /**
         * @description Latest action in the history chain was redone.
         * @event redone
         * @memberof module:model/statusEvents
         * @example tool.addListener('redone', function() {
         *     console.log('History state redone.');
         * });
         */
        this.emit('redone');

        this.selected = false;
        this.emit(null, 'select', 'refresh', 'resetUI');
    },

    /**
     * @description Emit an event through the model
     * @name emit
     * @function
     *
     * @param {data|array} data - Data to be sent with the event. If it's an array, it will be applied to the listener.
     * @param {string} varargs - The rest of the parameters are treated as event identifiers.
     * @example emit([1,2,3], 'event1', 'event2', 'event3')
     */
    emit: function() {
        if(!this.listeners) {
            console.log('No listeners?');
            return;
        }

        var data;
        var events = [];

        if(arguments.length !== 1) {
            data = arguments[0];
            for(var i = 1; i < arguments.length; i++) {
                var ev = arguments[i];
                if(typeof ev !== 'string') {
                    throw new Error('Listener id must be a string.');
                }

                events.push(ev);
            }
        } else {
            events = [arguments[0]];
        }

        if(!data || !data.forEach) {
            data = [data];
        }

        events.forEach(function(ev) { 
            if(this.listeners[ev]) {
                this.listeners[ev].forEach(function(listener) {
                    listener.apply(this, data.concat([ev]));
                }, this);
            }
        }, this);
    },

    /**
     * @description Select the first node matchind id or string. Can't query both at the same time.
     * @name selectNode
     * @function
     *
     * @param {integer} id - Node id.
     * @param {string} name - Node name.
     * @fires module:model~Model#refresh
     * @fires module:model~Model#resetUI
     * @fires module:model~Model#selected
     */
    selectNode: function(id, name) {
        if(id !== undefined && name !== undefined) {
            throw new Error('Can\'t select a node from id and name at the same time.');
        }

        if(id !== undefined && this.nodeData[id] !== undefined) {
            this.emit('deselect');
            var n                     = this.nodeData[id];
            this.nodeGui[id].selected = true;
            this.selected             = n;

            this.emit(null, 'refresh', 'resetUI', 'select');
            return;
        }

        objectHelper.forEach.call(this.nodeData, function(n) {
            if(n.name === name) {
                this.emit('deselect');
                this.nodeGui[n.id].selected = true;
                this.selected               = n;

                this.emit(null, 'refresh', 'resetUI', 'select');
                return false;
            }
        }, this);
    },

    /**
     * @description Helper method to select node by prototype id.
     * @name selectNodeByPrototypeId
     * @function
     *
     * @param {string} prototypeId - Prototype id.
     */
    selectNodeByPrototypeId: function(prototypeId) {
        if(typeof prototypeId !== 'string') {
            throw new Error('Prototype id given is not of string type.');
        }

        objectHelper.forEach.call(this.nodeData, function(n) {
            if(n.prototypeId === prototypeId) {
                this.emit('deselect');
                this.nodeGui[n.id].selected = true;
                this.selected               = n;

                this.emit(null, 'refresh', 'resetUI', 'select');
                return false;
            }
        }, this);
    },

    /**
     * @description Helper method to select node by id.
     * @name selectNodeById
     * @function
     *
     * @param {integer} id - Node id.
     * @fires module:model~Model#refresh
     * @fires module:model~Model#resetUI
     * @fires module:model~Model#selected
     */
    selectNodeById: function(id) {
        this.selectNode(id, undefined);
    },

    /**
     * @description Helper method to select node by name.
     * @name selectNodeByName
     * @function
     *
     * @param {string} name - Node name.
     * @fires module:model~Model#refresh
     * @fires module:model~Model#resetUI
     * @fires module:model~Model#selected
     */
    selectNodeByName: function(name) {
        this.selectNode(undefined, name);
    },

    /**
     * @description Fetches all the models available for given user filter and project filter.
     * @name getAllModels
     * @function
     * @returns {promise}
     */
    getAllModels: getAllModels,

    /**
     * @description Load a model by given id.
     * @name loadModel
     * @function
     *
     * @param {integer} id - Model id.
     * @returns {promise}
     * @fires module:model~Model#modelLoaded
     * @fires module:model~Model#errorLoadingModel
     */
    loadModel: function(id) {
        var that = this;

        var currentId     = id,
            currentSyncId = id;
        if(typeof id !== 'number' || isNaN(parseInt(id))) {
            currentId     = this.id;
            currentSyncId = this.syncId;
        }

        return new Promise(function(fulfill, reject) {
            if(id === undefined || id === null || isNaN(parseInt(id))) {
                reject(new Error('Id must be a valid number.'));
            }

            var cb = function(_id, _syncId, ev) {
                if(_id !== currentId && _syncId !== currentSyncId) {
                    return;
                }

                that.removeListener('modelLoaded',       cb);
                that.removeListener('errorLoadingModel', cb);

                if(ev === 'errorLoadingModel') {
                    return reject();
                }

                fulfill();
            };

            that.addListener('modelLoaded',       cb);
            that.addListener('errorLoadingModel', cb);

            that.emit('storeModel');
            /*if(typeof id === 'string' || typeof id === 'number') {
                console.log('Trying to load:', id);
                that.emit([id, id], 'preLoadModel');
                that.emit([id, id], 'loadModel');
                return;
            }*/

            that.emit([currentId, currentSyncId], 'preLoadModel');
            that.emit([currentId, currentSyncId], 'loadModel');
        });
    },

    /**
     * @description Save a model by given id.
     * @name saveModel
     * @function
     *
     * @param {integer} [id] - Model id. If the id is omitted, the currently loaded model is saved.
     * @returns {promise}
     */
    saveModel: function(id) {
        var that = this;

        var currentId     = id,
            currentSyncId = id;
        if(typeof id !== 'number' || isNaN(parseInt(id))) {
            id            = false;
            currentId     = this.id;
            currentSyncId = this.syncId;
        }

        return new Promise(function(fulfill, reject) {
            var cb = function(_id, _syncId, ev) {
                if(_id !== currentId && _syncId !== currentSyncId) {
                    return;
                }

                if(ev === 'errorSavingModel') {
                    return reject(_id);
                }

                fulfill(_syncId);
            };

            that.addListener('modelSaved', cb);
            if(id && (typeof id === 'string' || typeof id === 'integer')) {
                that.emit([id, id], 'preSaveModel');
                that.emit([id, id], 'saveModel');
                return;
            } 

            that.emit('storeModel');
            if(!id) {
                // If the current model is being saved, make sure to load it again after store.
                // Storing a model will remove it from the currently loaded position.
                that.emit([currentId, currentSyncId], 'loadModel');
            }
            
            that.emit([currentId, currentSyncId], 'preSaveModel');
            that.emit([currentId, currentSyncId], 'saveModel');
        }).then(function(){
            that.emit('refresh', 'resetUI');
        }).catch(function(err) {
            console.error(err);
        });
    },

    /**
     * @description Delete a model by given id.
     * @name deleteModel
     * @function
     *
     * @param {integer} [id] - Model id. If the id is omitted, the currently loaded model is deleted.
     * @returns {promise}
     */
    deleteModel: function(id) {
        var that = this;

        var currentId     = id || this.id,
            currentSyncId = id || this.syncId;

        return new Promise(function(fulfill, reject) {
            if(id === undefined || id === null || isNaN(parseInt(id))) {
                reject(new Error('Id must be a valid number.'));
            }

            var cb = function(_id, _syncId, ev) {
                if(_id !== currentId && _syncId !== currentSyncId) {
                    return;
                }

                that.removeListener('modelDeleted', cb);
                if(ev === 'errorDeletingModel') {
                    return reject(id);
                }

                fulfill(id);
            };

            that.addListener('modelDeleted', cb);
            if(id && (typeof id === 'string' || typeof id === 'number')) {
                that.emit([id, id], 'deleteModel');
                return;
            } 

            that.emit('storeModel');
            that.emit([that.id, that.syncId], 'deleteModel');
        });
    },

    /**
     * @description Generate and return the next id.
     * @name generateId
     * @function
     *
     * @returns {integer}
     */
    generateId: function() {
        this.nextId++;

        return this.nextId;
    },

    addListener: function(key, listener) {
        if(!this.listeners) {
            this.listeners = {};
        }

        if(!this.listeners[key]) {
            this.listeners[key] = [];
        }

        this.listeners[key].push(listener);
    },

    removeListener: function(key, listener) {
        if(!this.listeners[key]) {
            return;
        }

        var index = this.listeners[key].indexOf(listener);
        if(index === -1) {
            console.log('Didn\'t find listener.');
            return;
        }

        this.listeners[key].splice(index, 1);
    },

    removeListeners: function(key) {
        this.listeners[key] = [];
    },

    /*addListener: function(key, listener) {
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
    },*/

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
        objectHelper.forEach.call(this.scenarios, function(scenario) {
            var scenarioData = {
                id:                scenario.id,
                syncId:            scenario.syncId,
                name:              scenario.name,
                maxIterations:     scenario.maxIterations,
                measurement:       scenario.measurement,
                measurementAmount: scenario.measurementAmount,
                timeStepN:         scenario.timeStepN
            };

            scenarioData.tables = objectHelper.map.call(scenario.data, function(table) {
                return {
                    id:        table.id,
                    syncId:    table.syncId,
                    timetable: table.steps
                };
            });

            scenarios.push(scenarioData);
        });

        return scenarios;
    }
};

/*definePropagations(Model.prototype, [
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
]);*/

module.exports = {
    newModel: function(data) {
        generateId++;
        return new Model(generateId, data);
    },

    moveModel: function(model) {
        var newModel = this.newModel();

        newModel.CONFIG          = model.CONFIG;
        newModel.id              = model.id;
        newModel.environment     = model.environment;
        newModel.sidebar         = model.sidebar;
        newModel.floatingWindows = model.floatingWindows;
        newModel.saved           = model.saved;
        newModel.synced          = model.synced;
        newModel.syncId          = model.syncId;
        newModel.nextId          = model.nextId;
        
        // Saving and reloading the current model would fuck up the sidebar
        // if this property existed, since it would overwrite the currently selected value.
        delete newModel.selected;
        newModel.nodeData        = model.nodeData;
        newModel.nodeGui         = model.nodeGui;
        newModel.links           = model.links;
        newModel.settings        = model.settings;
        newModel.treeSettings    = model.treeSettings;
        newModel.loadedScenario  = model.loadedScenario;
        newModel.scenarios       = model.scenarios;
        newModel.listeners       = model.listeners;
        newModel.static          = model.static;
        newModel.history         = model.history;

        /*model.floatingWindows.forEach(function(floatingWindow) {
            floatingWindow.destroyWindow();

            if(floatingWindow.hide) {
                floatingWindow.hide();
            }
        });*/

        //model.floatingWindows = [];
        model.nodeData        = {};
        model.nodeGui         = {};
        model.links           = {};
        model.treeSettings    = {};
        var _                 = new Scenario(model);
        model.scenarios       = {};
        model.scenarios[_.id] = _;
        model.loadedScenario  = _;
        model.settings        = {};

        model.history         = [];

        return newModel;
    },

    getAllModels: function(loadedModel){return getAllModels.call(loadedModel);},

    saveModel: function(url, userFilter, projectFilter, loadedModel, onDone) {
        var data = {
            modelId:   loadedModel.syncId,
            settings:  loadedModel.settings,
            nodes:     breakout.nodes(loadedModel),
            links:     breakout.links(loadedModel),
            scenarios: loadedModel.scenariosToJson()
        };

        console.log(data);

        network(url, '/models/' + userFilter + '/' + projectFilter +'/save', data, function(response, err) {
            if (err) {
                console.error(err.stack);
                loadedModel.emit('Couldn\'t save model: ' + err.message, 'notification');
                return;
            }

            if(response.status !== 200) {
                loadedModel.emit('Couldn\'t save model: ' + (response.errors || 'null'), 'notification');
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
                    try {
                        loadedModel.nodeData[node.id].syncId = node.syncId;
                        loadedModel.nodeGui[node.id].syncId  = node.syncId;

                        nodeLookup[node.syncId] = loadedModel.nodeData[node.id];
                    } catch(err) {
                        // Node deleted locally before synchronization was made.
                    }
                });

                links.forEach(function(link) {
                    try {
                        loadedModel.links[link.id].syncId = link.syncId;
                    } catch(err) {
                        // Link deleted locally before synchronization was made.
                    }
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

                /*if(response.response.message) {
                    loadedModel.emit(response.response.message, 'notification');
                } else {
                    loadedModel.emit('Model['+loadedModel.settings.name+'] saved.', 'notification');
                }*/

            } catch(e) {
                console.error(e);
                throw e;
            }

            onDone();
        });
    },

    deleteModel: function(url, userFilter, projectFilter, modelId, savedModels, callback) {
        var that = this;
        if(savedModels.local[modelId] === undefined) {
            network(url, '/models/' + userFilter + '/' + projectFilter + '/' + modelId, {}, function(response, err) {
                if(err) {
                    console.error(response);
                    console.error(err);
                    return;
                }

                //delete savedModels.local[loadedModel.id];
                delete savedModels.synced[modelId];

                callback(response.response.message);
            }, 'DELETE');
        } else {
            delete savedModels.local[modelId];
            callback();
        }
    },
    
    loadSyncModel: function(url, userFilter, projectFilter, modelId, callback) {
        var that = this;
        network(url, '/models/' + userFilter + '/' + projectFilter + '/bundle/' + modelId, function(response, error) {
            if (error) {
                console.error(response);
                console.error(error);
                return;
            }

            if(response.status !== 200) {
                if(!response.response) {
                    response.response = {};
                }
                callback(new Error(response.response.message || 'Error loading model'));
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

            var highestId = 0;

            newState.scenarios = {};
                    /*name:          'New Model',
                    maxIterations: 4,
                    offsetX:       0,
                    offsetY:       0,
                    zoom:          1,
                    linegraph:     false,

                    timeStepT:     'Week',
                    timeStepN:     0*/
            /*newState.settings = {
                name:          settings.name,
                offsetX:       settings.pan_offset_x,
                offsetY:       settings.pan_offset_y,
                zoom:          settings.zoom
            };*/

            newState.settings.name    = settings.name;
            newState.settings.offsetX = settings.pan_offset_x;
            newState.settings.offsetY = settings.pan_offset_y;
            newState.settings.zoom    = settings.zoom;

            nodes.forEach(function(node) {
                newState.nodeData[node.id] = {
                    id:             node.id,
                    syncId:         node.id,
                    name:           node.name,
                    description:    node.description,
                    type:           node.type,
                    prototypeId:    node.prototype_id,
                    role:           node.role,
                    simulateChange: 0,

                    objectId:       'nodeData'
                };

                newState.nodeGui[node.id]  = {
                    id:         node.id,
                    syncId:     node.id,
                    radius:     node.radius,
                    x:          node.x,
                    y:          node.y,
                    avatar:     node.avatar,
                    color:      node.color,
                    links:      [],

                    objectId:   'nodeGui'
                };

                if(highestId < node.id) {
                    highestId = node.id;
                }
            });

            links.forEach(function(link) {
                if(!link.downstream || !link.upstream) {
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
                    width:       8,

                    bidirectional:        link.bidirectional         || false,
                    bidirectionalTimelag: link.bidirectional_timelag || 1,

                    objectId:    'link'
                };

                newState.nodeGui[link.downstream].links.push(link.id);
                newState.nodeGui[link.upstream].links.push(link.id);

                if(highestId < link.id) {
                    highestId = link.id;
                }
            });

            scenarios.forEach(function(scenario, index) {
                var newScenario = {
                    id:                 scenario.id,
                    syncId:             scenario.id,
                    name:               scenario.name,
                    maxIterations:      scenario.max_iterations,
                    timeStepN:          scenario.timestep_n,
                    measurement:        scenario.measurement,
                    measurementAmount:  scenario.measurement_amount,
                    data:               {}
                };//new Scenario(newState);

                newState.scenarios[newScenario.id] = newScenario;

                if(index === 0) {
                    newState.loadedScenario = newState.scenarios[scenario.id];
                }

                if(highestId < scenario.id) {
                    highestId = scenario.id;
                }
            });

            /*
            ** table: {id, node: id, scenario: id}
            ** step: {id, step: key, timetable: id, value: float}
            */

            var timetableLookup = {};
            console.log(timetables, timesteps);
            timetables.forEach(function(timetable) {
                var node = newState.nodeData[timetable.node];
                var timetableStructure = {
                    id:       timetable.id,
                    syncId:   timetable.id,
                    /*scenario: timetable.scenario,
                    node:     timetable.node,*/
                    steps:    {}
                };

                newState.scenarios[timetable.scenario].data[node.id] = timetableStructure;
                timetableLookup[timetableStructure.id] = timetableStructure;

                return;

                var node = newState.nodeData[timetable.node];
                var newTimetable = new TimeTable(node, function() {
                    newState.emit(null, 'refresh', 'resetUI');
                    //newState.refresh = true;
                    //newState.resetUI = true;
                    //newState.propagate();
                });

                timetableLookup[timetable.id] = newTimetable;

                newState.scenarios[timetable.scenario].data[node.id] = newTimetable;
            });

            timesteps.forEach(function(timestep) {
                if(!timetableLookup[timestep.timetable]) {
                    console.log(timestep, 'didn\'t have a timetable?');
                    return;
                }

                var steps = timetableLookup[timestep.timetable].steps;
                steps[timestep.step] = timestep.value;

                return;

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

            newState.nextId = ++highestId;

            callback(newState);
        });
    }
};

},{"./breakout.js":"breakout.js","./menu_builder":"menu_builder/menu_builder.js","./network":"network/network.js","./object-helper":"object-helper.js","./scenario":"scenario/scenario_index.js","./settings":"settings/settings.js","./structures/create_link.js":"structures/create_link.js","./structures/create_node.js":"structures/create_node.js","./structures/timetable.js":"structures/timetable.js","promise":46}],"mouse_handling/handle_down.js":[function(require,module,exports){
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
                offsetX:   data.pos.x - (node.x || 0),
                offsetY:   data.pos.y - (node.y || 0),
                clicked:   true
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
                    offsetX:  data.pos.x - (link.x || 0),
                    offsetY:  data.pos.y - (link.y || 0),
                    clicked:  true
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
                offsetX: data.pos.x - (node.x || 0),
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
    data.settings.offsetX = (data.settings.offsetX || 0) - data.deltaPos.x;
    data.settings.offsetY = (data.settings.offsetY || 0) - data.deltaPos.y;
    
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
    deselect,
    stopLinking,
    stopMovingIcon,
    select
]);

function generateHexColor() {
    var n = Math.round(Math.random() * 255).toString(16); 
    if(n.length === 1) {
        n = '0' + n;
    }
    
    return n;
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
            return node.selected === true && !node.clicked && !node.linking
        }
    );

    selectedNodes = objectHelper.map.call(
        selectedNodes,
        function(node) {
            data.selected = false;
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
        selectedLinks,
        function(link) {
            data.selected = false;
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

            if(!data.didDrag) {
                node.linegraph  = data.linegraph ? !node.linegraph : false;
                data.refreshLinegraph = true;

                if(!node.color) {
                    node.color = generateColor();
                }
            }

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
                if(httpRequest.status === 0) {
                    throw new Error('Connection refused.');
                }

                var rt    = JSON.parse(httpRequest.responseText);
                rt.status = httpRequest.status;

                if(rt.status !== 200) {
                    console.error(rt);
                }

                try {
                    if(callback) {
                        callback(rt);
                    } else {
                        console.warn('No callback was sent with the query against ' + path);
                    }
                } catch(err) {
                    console.warn(httpRequest);
                    callback(rt, err);
                }
            } catch(err) {
                console.warn(httpRequest);
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
},{}],"new_ui/lib/button.js":[function(require,module,exports){
'use strict';

var Element = require('./element.js');

function Button() {
    Element.call(this, 'div');

    this.root.style.cursor = 'pointer';
    this.label = new Element('div');

    this.appendChild(this.label);

    this.clicks = [];
}

Button.prototype = {
    setLabel: function(label) {
        this.label.setLabel(label);
    },

    simulateClick: function() {
        this.clicks.forEach(function(click) {
            click();
        });
    },

    click: function(callback) {
        if(!callback || typeof callback !== 'function') {
            return;
        }
        
        this.clicks.push(callback);
        this.root.addEventListener('click', callback);
    },

    removeClick: function(callback) {
        var index = this.clicks.indexOf(callback);
        this.clicks.splice(index, 1);

        this.root.removeEventListener('click', callback);
    },

    removeEvents: function() {
        this.clicks.forEach(function(callback) {
            this.root.removeEventListener('click', callback);
        }, this);

        this.clicks = [];
    },

    replaceClick: function(callback, newCallback) {
        var index = this.clicks.indexOf(callback);
        if(index !== -1) {
            this.root.removeEventListener('click', this.clicks[index]);
            this.clicks[index] = newCallback;
        } else {
            this.clicks.push(newCallback);
        }

        this.root.addEventListener('click', newCallback);
    },

    __proto__: Element.prototype
};

module.exports = Button;
},{"./element.js":"new_ui/lib/element.js"}],"new_ui/lib/checkbox.js":[function(require,module,exports){
'use strict';

var Input  = require('./input.js'),
    Colors = require('./colors.js'),
    Button = require('./button.js');

function Checkbox() {
    Button.call(this);

    this.checked = false;

    this.uncheck;
    this.check;

    var that = this;
    this.click(function() {
        if(that.checked) {
            that.uncheck();
        } else {
            that.check();
        }

        that.checked = !that.checked;
    });
}

Checkbox.prototype = {
    setBackground: function(background) {
        this.nonHighlightBackground = background;
        Input.prototype.setBackground.call(this, background);
    },

    onUncheck: function(callback) {
        var that = this;
        that.uncheck = function() {
            Input.prototype.setBackground.call(that, that.nonHighlightBackground);
            callback();
        };
    },

    onCheck: function(callback) {
        var that = this;
        that.check = function() {
            Input.prototype.setBackground.call(that, Colors.buttonCheckedBackground);
            callback();
        };
    },

    removeEvents: function() {
        Button.prototype.removeEvents.call(this);
    },
    __proto__: Button.prototype
};

module.exports = Checkbox;
},{"./button.js":"new_ui/lib/button.js","./colors.js":"new_ui/lib/colors.js","./input.js":"new_ui/lib/input.js"}],"new_ui/lib/colors.js":[function(require,module,exports){
'use strict';

var lightBlack                  = '#303040',
    lightPink                   = '#f7b8dd',
    lightPurple                 = '#c7b7f7',
    palePurple                  = '#AA6EEB',
    darkPurple                  = '#b197ba',
    darkerPurple                = '#A3779D',
    lightBlue                   = '#b7caf7',
    paleBlue                    = '#7C6CE6',
    blue                        = '#3643A3',
    darkTeal                    = '#446A96',
    darkerTeal                  = '#395585',
    darkererTeal                = '#314973',
    darkerererTeal              = '#2A3D66',
    tealFont                    = '#D7F1F7',
    almostBlue                  = '#3F2191',
    warningRed                  = '#E61953',
    lightOrange                 = '#D99B4A',
    darkOrange                  = '#CF743C',
    darkDarkOrange              = '#572211',
    lightGreen                  = '#63E07C',
    darkerLightGreen            = '#27AB5E',

    white                       = '#fafafa';

var sidebarBackground           = darkerTeal,

    sidebarFoldButtonSize       = '30px',
    sidebarFoldButtonFontSize   = '14px',
    sidebarFoldButtonFontColor  = tealFont,
    sidebarFoldButtonBackground = darkTeal,
    sidebarFoldButtonPaddingtop = 5,

    menuButtonHeight            = 30,
    menuButtonIconSize          = '1.2em',
    menuButtonFontColor         = tealFont,
    menuButtonBackground        = darkTeal,
    menuButtonPaddingTop        = 5,

    menuItemFontSize            = '12px',
    menuItemFontColor           = tealFont,
    menuItemBackground          = darkerTeal,
    menuItemActiveBackground    = darkererTeal,

    itemFontSize                = '12px',
    itemFontColor               = tealFont,
    itemBackground              = darkererTeal,

    inputBackground             = darkerererTeal,
    inputFontColor              = tealFont;

var buttonBackground            = inputBackground,
    buttonFontColor             = inputFontColor,
    buttonCheckedBackground     = darkOrange,//lightOrange,
    activeAvatar                = lightOrange;

module.exports = {
    lightBlack:                   lightBlack,
    lightPink:                    lightPink,
    lightPurple:                  lightPurple,
    palePurple:                   palePurple,
    darkPurple:                   darkPurple,
    darkerPurple:                 darkerPurple,
    lightBlue:                    lightBlue,
    paleBlue:                     paleBlue,
    blue:                         blue,
    darkTeal:                     darkTeal,
    darkerTeal:                   darkerTeal,
    darkererTeal:                 darkererTeal,
    darkerererTeal:               darkerererTeal,
    tealFont:                     tealFont,
    almostBlue:                   almostBlue,
    lightOrange:                  lightOrange,
    warningRed:                   warningRed,
    lightGreen:                   lightGreen,
    darkOrange:                   darkOrange,
    darkerLightGreen:             darkerLightGreen,
    darkDarkOrange:               darkDarkOrange,

    white:                        white,

    sidebarBackground:            sidebarBackground,

    sidebarFoldButtonSize:        sidebarFoldButtonSize,
    sidebarFoldButtonFontSize:    sidebarFoldButtonFontSize,
    sidebarFoldButtonFontColor:   sidebarFoldButtonFontColor,
    sidebarFoldButtonBackground:  sidebarFoldButtonBackground,
    sidebarFoldButtonPaddingtop:  sidebarFoldButtonPaddingtop,

    menuButtonHeight:             menuButtonHeight,
    menuButtonIconSize:           menuButtonIconSize,
    menuButtonFontColor:          menuButtonFontColor,
    menuButtonBackground:         menuButtonBackground,
    menuButtonPaddingTop:         menuButtonPaddingTop,

    menuItemFontSize:             menuItemFontSize,
    menuItemFontColor:            menuItemFontColor,
    menuItemBackground:           menuItemBackground,
    menuItemActiveBackground:     menuItemActiveBackground,

    itemFontSize:                 itemFontSize,
    itemFontColor:                itemFontColor,
    itemBackground:               itemBackground,

    inputBackground:              inputBackground,
    inputFontColor:               inputFontColor,

    buttonBackground:             inputBackground,
    buttonFontColor:              inputFontColor,
    buttonCheckedBackground:      buttonCheckedBackground,
    activeAvatar:                 activeAvatar
};
},{}],"new_ui/lib/dropdown.js":[function(require,module,exports){
'use strict';

var Element = require('./element.js'),
    Colors  = require('./colors.js');

function Dropdown(values, callback) {
    Element.call(this, 'div');
    this.header = new Element('div');
    this.select = new Element('select');

    this.root.style.padding = '0px 8px';

    this.select.setWidth('100%');
    this.header.root.style['margin-bottom'] = '8px';
    this.header.root.style['font-weight']   = '700';

    this.select.root.style.padding = '4px 0px';
    this.select.setBackground(Colors.buttonBackground);
    this.select.root.style.color   = Colors.buttonFontColor;
    this.select.root.style.border  = 'none';

    this.rawValues = [];
    this.values    = [];

    if(values && values.forEach) {
        values.forEach(function(v) {
            if(typeof v === 'object') {
                if(!v.label || !v.value) {
                    console.error('Invalid value given to dropdown');
                    return;
                } 

                this.addValue(v.label, v.value);
                return;
            }

            this.addValue(v);
        }, this);
    }

    this.changes = [];
    if(callback && typeof callback === 'function') {
        this.onChange(callback);
    }

    this.appendChild(this.header);
    this.appendChild(this.select);
}

Dropdown.prototype = {
    refresh: function() {
        if(!this.updateValue) {
            return;
        }
        
        this.updateValue();
    },

    defaultValue: function(callback) {
        if(!callback && typeof callback !== 'function') {
            throw new Error('Trying to set callback which is not a function');
        }

        var that = this;
        this.updateValue = function() {
            that.setSelectedByValue(callback());
        };

        this.updateValue();
    },

    onChange: function(callback) {
        this.select.root.addEventListener('change', callback);
        this.changes.push(callback);
    },

    removeChange: function(callback) {
        var index = this.changes.indexOf(callback);
        if(index === -1) {
            return;
        }

        this.select.root.removeEventListener('change', callback);
        this.changes.splice(index, 1);
    },

    removeEvents: function() {
        this.changes.forEach(function(callback) {
            this.select.root.removeEventListener('change', callback);
        }, this);
    },

    setLabel: function(label) {
        Element.prototype.setLabel.call(this.header, label);
    },

    setSelectedByIndex: function(index) {
        if(this.values.length <= index) {
            return;
        }

        this.select.root.selectedIndex = index;
    },

    setSelectedByValue: function(value) {
        var index = this.rawValues.indexOf(value);
        if(index === -1) {
            return;
        }

        this.select.root.selectedIndex = index;
    },

    setValue: this.setSelectedByValue,

    getValue: function() {
        return this.select.root.value;
    },

    getValueAtIndex: function(index) {
        return this.values[index].root.value;
    },

    getCurrentLabel: function() {
        var index = this.getIndex();
        if(index < 0) {
            return '';
        }

        return this.values[index].getLabel();
    },

    getIndex: function() {
        return this.select.root.selectedIndex;
    },

    deleteCurrent: function() {
        var index = this.getIndex();
        if(index < 0) {
            return;
        }

        this.select.removeChild(this.values[index]);

        this.values.splice(index,    1);
        this.rawValues.splice(index, 1);

        if(index >= this.values.length) {
            index = this.values.length - 1;
        }

        if(index < 0) {
            return;
        }

        this.setSelectedByIndex(index);
    },

    addValue: function(header, value) {
        var option = new Element('option');
        this.values.push(option);

        option.setLabel(header);

        if(!value) {
            value = header;
        }

        option.root.value = value;
        this.rawValues.push(value);

        this.select.appendChild(option);
    },

    changeValue: function(value, index) {
        if(!this.values[index]) {
            return;
        }

        this.values[index].root.value = value;
        this.values[index].setLabel(value);
        this.rawValues[index] = value;
    },

    changeLabel: function(label, index) {
        if(!this.values[index]) {
            return;
        }

        this.values[index].setLabel(label);
    },

    replaceValues: function(values) {
        var selectedIndex = this.getIndex();
        while(this.select.root.firstChild) {
            this.select.root.removeChild(this.select.root.firstChild);
        }

        this.values    = [];
        this.rawValues = [];

        values.forEach(function(v) {
            if(typeof v === 'object') {
                if(!v.label || !v.value) {
                    console.error('Invalid value given to dropdown');
                    return;
                } 

                this.addValue(v.label, v.value);
                return;
            }

            this.addValue(v);
        }, this);

        if(selectedIndex >= this.values.length) {
            return;
        }

        this.setSelectedByIndex(selectedIndex);
    },

    __proto__: Element.prototype
};

module.exports = Dropdown;
},{"./colors.js":"new_ui/lib/colors.js","./element.js":"new_ui/lib/element.js"}],"new_ui/lib/element.js":[function(require,module,exports){
'use strict';

function Element(type) {
    this.root = document.createElement(type || 'div');
}

Element.prototype = {
    appendTo: function(container) {
        if(container instanceof Element) {
            return container.appendChild(this);
        }

        container.appendChild(this.root);
    },

    setLabel: function(label) {
        this.root.innerHTML = label;
    },

    getLabel: function() {
        return this.root.innerHTML;
    },

    appendChild: function(container) {
        if(!this.children) {
            this.children = [];
        }

        if(container instanceof Element) {
            this.children.push(container)
        }

        if(container.root) {
            return this.root.appendChild(container.root);
        }

        this.root.appendChild(container);
    },

    removeChild: function(child) {
        if(!this.children) {
            try {
                if(child.root) {
                    this.root.removeChild(child.root);
                } else {
                    this.root.removeChild(child)
                }
            } catch(err) {
                console.error(err);
            }

            return;
        }

        var index = this.children.indexOf(child);
        if(index === -1) {
            try {
                this.root.removeChild(child);
            } catch(err) {
                console.error(err);
            }

            return;
        }

        this.children.splice(index, 1);
        this.root.removeChild(child.root);
    },

    createFoldButton: function() {
        if(!this.buttons) {
            this.buttons = [];
        }

        var b = new FoldButton();
        this.buttons.push(b);

        return b;
    },

    createButton: function() {
        if(!this.buttons) {
            this.buttons = [];
        }

        var b = new Button();
        this.buttons.push(b);

        return b;
    },

    deleteAllButtons: function() {
        if(!this.buttons) {
            return;
        }

        this.buttons.forEach(function(button) {
            button.removeEventListener();
        });
    },

    setWidth: function(width) {
        if(typeof width === 'string') {
            this.root.style.width = width;
        } else if(typeof width === 'number') {
            this.root.style.width = width + 'px';
        }

        this.width = parseInt(width);
    },

    getWidth: function() {
        return this.root.offsetWidth || this.width || 0;
    },

    setHeight: function(height) {
        if(typeof height === 'string') {
            this.root.style.height = height;
        } else if(typeof height === 'number') {
            this.root.style.height = height + 'px';
            this.height = parseInt(height);
        }
    },

    getHeight: function() {
        return this.root.offsetHeight || this.height || 0;
    },

    setBackground: function(background) {
        this.root.style['background-color'] = background;
        this.background = background;
    },

    getBackground: function() {
        return this.background;
    },

    setLeft: function(left) {
        if(typeof left === 'string') {
            this.root.style.left = left;
        } else if(typeof left === 'number') {
            this.root.style.left = left + 'px';
        }

        this.left = parseInt(left);
    },

    getLeft: function() {
        return this.left || 0;
    },

    setTop: function(top) {
        if(typeof top === 'string') {
            this.root.style.top = top;
        } else if(typeof top === 'number') {
            this.root.style.top = top + 'px';
        }

        this.top = parseInt(top);
    },

    getTop: function() {
        return this.top || 0;
    },

    hide: function() {
        if(this.root.style.display !== 'none') {
            this.currentStyle = this.root.style.display;
        }

        this.root.style.display = 'none';
    },

    show: function() {
        this.root.style.display = this.currentStyle || 'block';
    },

    destroy: function() {
        if(this.removeEvents) {
            this.removeEvents();
        }

        if(this.children) {
            this.children.forEach(function(child) {
                child.destroy();
            });
        }

        if(this.root.parentElement) {
            this.root.parentElement.removeChild(this.root);
        }
    }
};

module.exports = Element;
},{}],"new_ui/lib/foldable.js":[function(require,module,exports){
'use strict';

var Element = require('./element.js'),
    Tween   = require('./tween.js');

var easeOutCirc = Tween.easeOutCirc;

function Foldable(width, positional) {
    if(!width) {
        throw new Error('Creating foldable without width.');
    }

    if(typeof width !== 'number') {
        throw new Error('Width given must be a number.');
    }

    this.root = document.createElement('div');

    if(positional) {
        this.setWidth(width);
    } else {
        this.setWidth(0);
    }

    this.folded        = true;
    this.foldableWidth = width;
    this.children      = [];
}

Foldable.prototype = {
    fold: function(onDone) {
        this.children.forEach(function(child) {
            if(child instanceof Foldable) {
                child.fold();
            }
        });

        if(this.currentTween) {
            this.currentTween.stop();
        }

        var currentWidth = this.getWidth();
        var destination  = currentWidth;

        var that = this;
        this.currentTween = easeOutCirc(destination, 250, function(width) {
            that.setWidth(currentWidth - width);
        }, onDone);

        this.folded      = true;
    },

    unfold: function(onDone) {
        this.children.forEach(function(child) {
            if(child instanceof Foldable) {
                if(child.wasUnfolded) {
                    child.unfold();
                }
            }
        });

        if(this.currentTween) {
            this.currentTween.stop();
        }

        var currentWidth = this.getWidth();
        var destination  = this.foldableWidth - currentWidth;

        var that = this;
        this.currentTween = easeOutCirc(destination, 250, function(width) {
            that.setWidth(currentWidth + width);
        }, onDone);

        this.folded = false;
    },

    positionalFold: function() {
        this.children.forEach(function(child) {
            if(child instanceof Foldable) {
                child.fold();
            }
        });

        if(this.currentTween) {
            this.currentTween.stop();
        }

        var currentLeft = this.getLeft();
        var destination = currentLeft;

        if(destination === 0) {
            this.folded = true;
            return;
        }

        var that = this;
        this.currentTween = easeOutCirc(destination, 250, function(left) {
            that.setLeft(currentLeft - left);
        });

        this.folded = true;
    },

    positionalUnfold: function() {
        this.children.forEach(function(child) {
            if(child instanceof Foldable) {
                child.unfold();
            }
        });

        if(this.currentTween) {
            this.currentTween.stop();
        }

        var currentLeft = this.getLeft();
        var destination = this.foldableWidth - currentLeft;

        var that = this;
        this.currentTween = easeOutCirc(destination, 250, function(left) {
            that.setLeft(currentLeft + left);
        });

        this.folded = false;
    },

    positionalInvert: function() {
        if(this.folded) {
            this.positionalUnfold();
        } else {
            this.positionalFold();
        }
    },

    invert: function(onDone) {
        if(this.folded) {
            this.unfold(onDone);
        } else {
            this.fold(onDone);
        }
    },

    __proto__: Element.prototype
};

module.exports = Foldable;
},{"./element.js":"new_ui/lib/element.js","./tween.js":"new_ui/lib/tween.js"}],"new_ui/lib/icon_group.js":[function(require,module,exports){
'use strict';

var Element = require('./element.js'),
    Colors  = require('./colors.js'),
    Button  = require('./button.js');

function IconGroup(label) {
    Element.call(this, 'div');
    this.groupLabel = new Element('div');
    this.groupLabel.setLabel(label);

    this.groupLabel.root.style.margin = '16px 0px';

    this.groupLabel.root.style['text-align'] = 'center';
    this.groupLabel.root.style['font-weight'] = '700';

    this.iconContainer = new Element('div');
    this.iconContainer.root.style['text-align'] = 'center';

    this.appendChild(this.groupLabel);
    this.appendChild(this.iconContainer);

    this.icons = [];
}

IconGroup.prototype = {
    invalidate: function() {
        this.icons.forEach(function(icon) {
            icon.hide();
        });
    },

    reuseIcon: function(img, iterator) {
        var imageButton;
        if(iterator < this.icons.length) {
            imageButton = this.icons[iterator];
            imageButton.show();

            if(img) {
                imageButton.image.root.src = img;
            }
        } else {
            imageButton = this.addIcon(img);
        }

        return imageButton;
    },

    addIcon: function(img) {
        var imageButton    = new Button();
        var imageContainer = new Element('div');

        imageButton.appendChild(imageContainer);

        var image = new Element('img');
        if(img) {
            image.root.src = img;
        } else {
            image.setBackground(Colors.buttonBackground);
        }

        imageContainer.appendChild(image);

        imageButton.setWidth(50);
        imageButton.setHeight(50);

        imageButton.root.style.display = 'inline-block';

        image.setWidth(50);
        image.setHeight(50);
        image.root.style.border = 'none';

        imageButton.root.style.margin = '6px 6px';
        imageButton.image = image;

        this.icons.push(imageButton);

        this.iconContainer.appendChild(imageButton);

        return imageButton;
    },

    setLabel: function(label) {
        this.groupLabel.setLabel(label);
    },

    __proto__: Element.prototype
}

module.exports = IconGroup;
},{"./button.js":"new_ui/lib/button.js","./colors.js":"new_ui/lib/colors.js","./element.js":"new_ui/lib/element.js"}],"new_ui/lib/input.js":[function(require,module,exports){
'use strict';

var Element = require('./element.js'),
    Colors  = require('./colors.js');

function Input() {
    this.changes = [];
    this.inputs  = [];

    Element.call(this);

    this.input    = new Element('input');
    this.label    = new Element('div');

    this.inputDiv = new Element('div');
    this.inputDiv.appendChild(this.input);

    this.input.setWidth('100%');
    this.input.setBackground(Colors.inputBackground);
    this.input.root.style.border           = 'none';
    this.input.root.style.color            = Colors.inputFontColor;
    this.input.root.style['text-align']    = 'center';
    this.label.root.style['margin-bottom'] = '8px';

    var that = this;
    this.onChange(function() {
        that.input.root.blur();
    });

    this.appendChild(this.label);
    this.appendChild(this.inputDiv);
}

Input.prototype = {
    refresh: function() {
        if(!this.updateValue) {
            return;
        }
        
        this.updateValue();
    },
    
    defaultValue: function(callback) {
        if(!callback && typeof callback !== 'function') {
            throw new Error('Trying to set callback which is not a function');
        }
        
        var that = this;
        this.updateValue = function() {
            that.setValue(callback());
        };

        this.updateValue();
    },

    setLabel: function(label) {
        this.label.root.innerHTML = label;
    },

    setValue: function(value) {
        this.input.root.value = value;
    },

    getValue: function() {
        return this.input.root.value;
    },

    onChange: function(callback) {
        this.changes.push(callback);
        this.input.root.addEventListener('change', callback);
    },

    onInput: function(callback) {
        this.inputs.push(callback);
        this.input.root.addEventListener('input', callback);
    },

    replaceChange: function(callback, newCallback) {
        var index = changes.indexOf(callback);
        this.input.root.removeEventListener('change', changes[index]);
        this.input.root.addEventListener('change', newCallback);

        changes[index] = newCallback;
    },

    replaceInput: function(callback, newCallback) {
        var index = inputs.indexOf(callback);
        this.input.root.removeEventListener('input', inputs[index]);
        this.input.root.addEventListener('input', newCallback);

        inputs[index] = newCallback;
    },

    removeEvents: function() {
        this.inputs.forEach(function(callback) {
            this.input.root.removeEventListener('input', callback);
        }, this);

        this.changes.forEach(function(callback) {
            this.input.root.removeEventListener('change', callback);
        }, this);
    },

    __proto__: Element.prototype
}

module.exports = Input;
},{"./colors.js":"new_ui/lib/colors.js","./element.js":"new_ui/lib/element.js"}],"new_ui/lib/menu.js":[function(require,module,exports){
'use strict';

var Element  = require('./element.js'),
    Foldable = require('./foldable.js'),
    Tween    = require('./tween.js'),
    Button   = require('./button.js'),
    Colors   = require('./colors.js');

var easeOutCirc = Tween.easeOutCirc;

function Menu(width) {
    this.menuItems = [];
    this.items     = [];
    this.buttons   = [];

    this.buttonHeight = Colors.menuButtonHeight;

    this.buttonLayer = new Element();
    this.buttonLayer.setHeight(this.buttonHeight);
    this.buttonLayer.root.style.color = Colors.menuButtonFontColor;
    this.buttonLayer.setBackground(Colors.menuButtonBackground);
    this.buttonLayer.root.style.padding = '0px 4px';

    this.menuLayer = new Element();
    this.itemLayer = new Element();

    this.menuLayer.root.style.position = 'relative';

    this.itemLayer.root.style.position = 'absolute';
    //this.itemLayer.setLeft(width);
    this.itemLayer.root.style.top      = '0';
    this.itemLayer.setHeight('100%');

    Foldable.call(this, width);

    this.appendChild(this.itemLayer);
    //this.appendChild(this.separator);
    this.appendChild(this.buttonLayer);
    this.appendChild(this.menuLayer);

    this.activeMenuItem;
    var that = this;

    this.clicks = [];
    Button.prototype.click.call(this, function(evt) {
        var menuItem = evt.target.owner || evt.target.parentOwner;
        if(!menuItem) {
            return;
        }

        if(menuItem === that.activeMenuItem) {
            that.activeMenuItem.child.invert(function() {
                menuItem.setBackground(Colors.menuItemBackground);
            });

            that.activeMenuItem = false;
            return;
        }

        if(menuItem.refresh) {
            menuItem.refresh();
        }

        if(that.activeMenuItem) {
            return that.activeMenuItem.child.invert(function() {
                that.activeMenuItem.setBackground(Colors.menuItemBackground);
                
                menuItem.setBackground(Colors.menuItemActiveBackground);
                menuItem.child.invert();

                that.activeMenuItem = menuItem;
            });
        }

        menuItem.setBackground(Colors.menuItemActiveBackground);
        menuItem.child.invert();

        that.activeMenuItem = menuItem;
    });
}

Menu.prototype = {
    addButton: function(button) {
        this.buttons.push(button);
        this.buttonLayer.appendChild(button);
    },

    addItem: function(item) {
        item.setWidth(this.getWidth());

        //item.setTop(this.menuItems.length * 35 + 20);

        this.menuLayer.appendChild(item);
        this.itemLayer.appendChild(item.child);

        this.menuItems.push(item);

        item.child.setTop(this.buttonHeight);

        this.items.push(item.child);
    },

    unfold: function() {
        if(this.activeMenuItem) {
            this.activeMenuItem.child.invert();
        }
        /*this.children.forEach(function(child) {
            if(child instanceof Foldable)
                child.fold();
        });*/

        if(this.currentTween) {
            this.currentTween.stop();
        }

        var currentWidth = this.getWidth(); 
        var destination  = this.foldableWidth - currentWidth;

        var that = this;
        this.currentTween = easeOutCirc(destination, 250, function(width) {
            /*that.menuItems.forEach(function(item) {
                item.setWidth(currentWidth + width);
                item.setLeft(currentWidth + width);
            });*/

            that.setWidth(currentWidth + width);
        });

        this.folded = false;
    },

    fold: function() {
        if(this.activeMenuItem) {
            this.activeMenuItem.child.invert();
        }
        /*this.children.forEach(function(child) {
            if(child instanceof Foldable)
                child.fold();
        });*/

        if(this.currentTween) {
            this.currentTween.stop();
        }

        var currentWidth = this.getWidth(); 
        var destination  = currentWidth;

        var that = this;
        this.currentTween = easeOutCirc(destination, 250, function(width) {
            /*that.menuItems.forEach(function(item) {
                item.setWidth(currentWidth - width);
                item.setLeft(currentWidth - width);
            });*/

            that.setWidth(currentWidth - width);
        });

        this.folded = true;
    },

    setWidth: function(width) {
        this.menuItems.forEach(function(item) {
            item.setWidth(width);
        });

        //this.separator.setWidth(width);
        Menu.prototype.__proto__.setWidth.call(this, width);
        this.itemLayer.setLeft(width);
    },

    __proto__: Foldable.prototype
}

module.exports = Menu;
},{"./button.js":"new_ui/lib/button.js","./colors.js":"new_ui/lib/colors.js","./element.js":"new_ui/lib/element.js","./foldable.js":"new_ui/lib/foldable.js","./tween.js":"new_ui/lib/tween.js"}],"new_ui/lib/menu_item.js":[function(require,module,exports){
'use strict';

var Foldable           = require('./foldable.js'),
    VerticalFoldable   = require('./v_foldable.js'),
    Promise            = require('promise'),
    Colors             = require('./colors.js'),
    Element            = require('./element.js'),
    Input              = require('./input.js'),
    Slider             = require('./slider.js'),
    IconGroup          = require('./icon_group.js'),
    Dropdown           = require('./dropdown.js'),
    Checkbox           = require('./checkbox.js'),
    Button             = require('./button.js');

function MenuItem(width, vertical) {
    if(vertical === true) {
        VerticalFoldable.call(this, width, true);
        this.child = new VerticalFoldable(width);
    } else {
        Foldable.call(this, width, true);
        this.child = new Foldable(width);
        this.child.root.style.position = 'absolute';
    }

    this.setBackground(Colors.menuItemBackground);

    this.maxWidth = width;

    this.root.style['text-align'] = 'center';
    this.root.style.color         = Colors.menuItemFontColor;
    this.root.style.padding       = '16px 0px';

    //this.root.style.margin        = '4px 0px';

    this.root.owner = this;

    this.root.style.cursor        = 'pointer';
    //this.root.style.position      = 'absolute';

    this.root.style.overflow      = 'hidden';

    this.child.setBackground(Colors.itemBackground);
    this.child.root.style.color = Colors.itemFontColor;

    this.child.root.style['overflow-x']  = 'hidden';
    this.child.root.style['overflow-y']  = 'auto';
    this.child.root.style['white-space'] = 'nowrap';
    this.child.root.style['font-size']   = Colors.itemFontSize;

    this.child.root.style['max-height']  = '80%';

    this.label = new Element();
    this.label.root.style['white-space'] = 'normal';
    this.label.root.parentOwner          = this;
    this.label.root.style['font-weight'] = '700';
    this.label.root.style['font-size']   = Colors.menuItemFontSize;

    this.appendChild(this.label);

    this.items = [];
}

function timeRowStepCheck(value) {
    return value.match(/^\d*$/) !== null;
}

function timeRowValueCheck(value) {
    return value.match(/^\d*\.?\d*$/) !== null;
}

MenuItem.prototype = {
    addSeparator: function(height) {
        var separator = new Element('div');

        separator.setHeight(height);

        this.child.appendChild(separator);

        this.items.push(separator);
        return separator;
    },

    addIconGroup: function(label) {
        var group = new IconGroup(label);

        this.child.appendChild(group);

        group.root.style['white-space'] = 'normal';
        group.setWidth(this.maxWidth);

        this.items.push(group);
        return group;
    },

    addCheckbox: function(label, onCheck, onUncheck) {
        if(typeof label === 'function' && typeof onCheck === 'function') {
            onUncheck = onCheck;
            onCheck   = label;
        }

        var button = new Checkbox();
        if(label) {
            button.setLabel(label);
        }

        if(onCheck && typeof onCheck === 'function') {
            button.onCheck(onCheck);
        }

        if(onUncheck && typeof onUncheck === 'function') {
            button.onUncheck(onUncheck);
        }

        var buttonContainer = new Element('div');
        buttonContainer.root.style['white-space'] = 'normal';
        buttonContainer.setWidth(this.maxWidth);
        buttonContainer.root.style.padding = '0px 8px';
        buttonContainer.root.style.margin  = '8px 0px';

        buttonContainer.appendChild(button);

        button.root.style.padding = '8px 0px';

        button.setBackground(Colors.buttonBackground);
        button.root.style.color = Colors.buttonFontColor;
        button.root.style['text-align'] = 'center';

        button.setWidth('100%');

        this.child.appendChild(buttonContainer);

        this.items.push(button);
        return button;
    },

    addFoldable: function(label) {
        var foldable = new MenuItem(this.maxWidth, true);
        foldable.child.wasUnfolded = false;
        var button = this.addButton(label, function() {
            if(foldable.child.wasUnfolded) {
                button.setBackground(Colors.buttonBackground);
            } else {
                button.setBackground(Colors.buttonCheckedBackground);
            }

            foldable.child.invert();
            foldable.child.wasUnfolded = !foldable.child.wasUnfolded;
        });

        foldable.destroy = function() {
            button.destroy();
            foldable.items.forEach(function(item) {
                item.destroy();
            });
            foldable.child.destroy();
        };

        foldable.setLabel = function(buttonLabel) {
            button.setLabel(buttonLabel);
        };

        this.items.push(foldable.child);
        this.child.appendChild(foldable.child);

        return foldable;
    },

    addEditableDropdown: function(label, values, newCallback, editCallback, deleteCallback, changeCallback) {
        var dropdown = new Dropdown(values, function() {
            changeCallback(dropdown.getValue(), dropdown.getCurrentLabel());
        });

        dropdown.setLabel(label);
        dropdown.header.root.style['text-align'] = 'center';

        dropdown.root.style['white-space'] = 'normal';
        dropdown.setWidth('100%');

        dropdown.select.root.style.padding = '4px 16px';
        dropdown.root.style.padding        = '0px';
        dropdown.root.style.margin         = '0px 4px';
        dropdown.root.style['margin-bottom'] = '4px';
        dropdown.root.style['text-align']  = 'left';
        dropdown.root.style.display        = 'block';

        var container = new Element('div');
        container.root.style['white-space'] = 'normal';
        container.setWidth(this.maxWidth);
        container.root.style.padding        = '0px 8px';
        container.root.style.margin         = '8px 0px';
        container.root.style['text-align']  = 'center';

        var input = new Input();
        input.label.root.style.display = 'none';

        input.root.style['white-space'] = 'normal';
        input.setWidth('100%');

        input.input.root.style.padding = '4px 16px';
        input.input.root.style['text-align'] = 'left';
        input.root.style.display = 'inline-block';
        input.currentStyle       = 'inline-block';
        input.root.style.margin  = '0px 4px';
        input.root.style['margin-bottom'] = '4px';
        input.setValue('Rock the microphone.');

        input.input.setBackground(Colors.darkDarkOrange);

        input.root.style.display = 'none';

        var createButton = function() {
            var button = new Button();
            button.root.style.display       = 'inline-block';
            button.root.style.padding       = '4px 4px';
            button.root.style['text-align'] = 'center';

            button.root.style.color = Colors.buttonFontColor;

            button.setWidth('30%');
            button.root.style.margin = '0px 4px';

            return button;
        };

        var editButton = createButton(); 
        editButton.setBackground(Colors.darkOrange);

        var deleteButton = createButton();
        deleteButton.setBackground(Colors.warningRed);

        var newButton    = createButton();
        newButton.setBackground(Colors.darkerLightGreen);

        newButton.click(function() {
            newCallback(function(header, value) {
                dropdown.addValue(header, value);
            });
        });

        var editMode = false;
        deleteButton.click(function() {
            var deletedValue = dropdown.getValue();
            dropdown.deleteCurrent();
            deleteCallback(deletedValue);

            if(editMode) {
                input.hide();
                dropdown.show();
                editIcon.root.className = 'glyphicon glyphicon-pencil';
            }

            changeCallback(dropdown.getValue(), dropdown.getCurrentLabel());
            if(dropdown.getIndex() === -1) {
                newButton.simulateClick();
            }
        });

        var editIcon = new Element('span');
        editIcon.root.className = 'glyphicon glyphicon-pencil';

        var newIcon = new Element('span');
        newIcon.root.className = 'glyphicon glyphicon-file';

        var deleteIcon = new Element('span');
        deleteIcon.root.className = 'glyphicon glyphicon-trash';

        editButton.click(function() {
            if(editMode) {
                input.hide();
                dropdown.show();
                editIcon.root.className = 'glyphicon glyphicon-pencil';
            } else {
                input.setValue(dropdown.getCurrentLabel());
                editIcon.root.className = 'glyphicon glyphicon-ok';

                input.show();
                dropdown.hide();
            }

            editMode = !editMode;
        });

        dropdown.replaceValues = function(values) {
            Dropdown.prototype.replaceValues.call(dropdown, values);

            var value = dropdown.getValue();
            input.setValue(value);
        };

        input.onChange(function(evt) {
            var value = input.getValue(),
                index = dropdown.getIndex();

            dropdown.changeLabel(value, index);
            editCallback(dropdown.getValueAtIndex(index), value);
        });

        editButton.appendChild(editIcon);
        newButton.appendChild(newIcon);
        deleteButton.appendChild(deleteIcon);

        container.appendChild(dropdown.header);
        container.appendChild(dropdown);
        container.appendChild(input);
        container.appendChild(newButton);
        container.appendChild(editButton);
        container.appendChild(deleteButton);

        this.child.appendChild(container);

        this.items.push(dropdown);

        return dropdown;
    },

    addTimeRow: function(step, value, node, stepCallback, valueCallback, rowDeleted) {
        var createInput = function(width, defaultValue) {
            var input = new Input();

            input.root.style['white-space'] = 'normal';
            input.setWidth(width);

            input.input.root.style.padding = '4px 16px';
            input.root.style['text-align'] = 'center';
            input.root.style.display = 'inline-block';
            input.root.style.margin  = '0px 4px';
            input.setValue(defaultValue);

            return input;
        };

        var stepInput = createInput('20%', step);
        stepInput.previousValue = step;
        stepInput.lastValue = step;
        stepInput.onInput(function() {
            if(!timeRowStepCheck(stepInput.getValue())) {
                stepInput.setValue(stepInput.previousValue);
                return;
            }

            stepInput.previousValue = stepInput.getValue();
        });

        stepInput.onChange(function() {
            var r = stepCallback(stepInput.lastValue, stepInput.previousValue, valueInput.previousValue, node);

            // Give the callback an opportunity to restore the value to
            // its previous value.
            if(r instanceof Promise) {
                r.then(function(shouldResetStep) {
                    if(!shouldResetStep) {
                        return;
                    }

                    stepInput.previousValue = stepInput.lastValue;
                    stepInput.setValue(stepInput.lastValue);
                });
            } else if(r === true) {
                stepInput.previousValue = stepInput.lastValue;
                stepInput.setValue(stepInput.lastValue);
            } else {
                stepInput.lastValue = stepInput.previousValue;
            }
        });

        var valueInput = createInput('55%', value);
        valueInput.previousValue = value;
        valueInput.onInput(function() {
            if(!timeRowValueCheck(valueInput.getValue())) {
                valueInput.setValue(valueInput.previousValue);
                return;
            }

            valueInput.previousValue = valueInput.getValue();
        });

        valueInput.onChange(function() {
            valueCallback(stepInput.previousValue, valueInput.previousValue, node);
        });

        var deleteButton = new Button();
        deleteButton.root.style.display       = 'inline-block';
        deleteButton.root.style.padding       = '4px 4px';
        deleteButton.root.style['text-align'] = 'center';

        deleteButton.setBackground(Colors.warningRed);
        deleteButton.root.style.color = Colors.buttonFontColor;

        deleteButton.setWidth('15%');
        deleteButton.root.style.margin = '0px 4px';

        var listIcon = new Element('span');
        listIcon.root.className = 'glyphicon glyphicon-trash';

        deleteButton.appendChild(listIcon);

        var buttonContainer = new Element('div');
        buttonContainer.root.style['white-space'] = 'normal';
        buttonContainer.setWidth(this.maxWidth);
        buttonContainer.root.style.padding = '0px 8px';
        buttonContainer.root.style.margin  = '8px 0px';

        buttonContainer.appendChild(stepInput);
        buttonContainer.appendChild(valueInput);
        buttonContainer.appendChild(deleteButton);

        buttonContainer.stepInput  = stepInput;
        buttonContainer.valueInput = valueInput;

        this.child.appendChild(buttonContainer);

        var that = this;
        deleteButton.click(function() {
            buttonContainer.destroy();
            that.items.splice(buttonContainer.deleteFrom, 3);

            rowDeleted(stepInput.previousValue, valueInput.previousValue, node);
        });

        buttonContainer.deleteFrom = this.items.length;

        this.items.push(stepInput);
        this.items.push(valueInput);
        this.items.push(deleteButton);

        return buttonContainer;
    },

    addButton: function(label, callback) {
        if(typeof label === 'function') {
            callback = label;
            label    = false;
        }

        var button = new Button();
        if(label) {
            button.setLabel(label);
        }

        if(callback && typeof callback === 'function') {
            button.click(callback);
        }

        var buttonContainer = new Element('div');
        buttonContainer.root.style['white-space'] = 'normal';
        buttonContainer.setWidth(this.maxWidth);
        buttonContainer.root.style.padding = '0px 8px';
        buttonContainer.root.style.margin  = '8px 0px';

        buttonContainer.appendChild(button);

        button.root.style.padding = '8px 0px';

        button.setBackground(Colors.buttonBackground);
        button.root.style.color = Colors.buttonFontColor;
        button.root.style['text-align'] = 'center';

        button.setWidth('100%');

        this.child.appendChild(buttonContainer);
        button.buttonContainer = buttonContainer;

        this.items.push(button);

        return button;
    },

    addDropdown: function(label, values, callback) {
        var dropdown = new Dropdown(values, callback);
        dropdown.setLabel(label);


        dropdown.root.style['white-space'] = 'normal';
        dropdown.setWidth(this.maxWidth);

        dropdown.root.style.padding        = '16px 16px';
        dropdown.root.style['text-align']  = 'center';

        this.child.appendChild(dropdown);

        this.items.push(dropdown);
        return dropdown;
    },

    addInput: function(label) {
        var input = new Input();

        if(label) {
            input.setLabel(label);
        }

        input.root.style['white-space'] = 'normal';
        input.setWidth(this.maxWidth);

        input.root.style.padding = '16px 16px';
        input.root.style['text-align'] = 'center';

        this.child.appendChild(input);

        this.items.push(input);
        return input;
    },

    addSlider: function(label, min, max) {
        if(typeof label === 'number') {
            max = min;
            min = label;
            label = false;
        }

        var input = new Slider(min, max);
        if(label) {
            input.setLabel(label);
        }

        input.root.style['white-space'] = 'normal';
        input.setWidth(this.maxWidth);

        input.root.style.padding = '16px 16px';
        input.root.style['text-align'] = 'center';

        this.child.appendChild(input);

        this.items.push(input);
        return input;
    },

    addLabel: function(label) {
        var container                       = new Element('div');

        var labelDiv = new Element('div');

        container.root.style['white-space'] = 'normal';
        container.root.style['text-align']  = 'center';
        container.root.style.padding        = '16px 16px';

        container.setWidth(this.maxWidth);

        labelDiv.setLabel(label);
        container.appendChild(labelDiv);

        this.child.appendChild(container);
        this.items.push(container);

        return container;
    },

    setLeft: function(width) {
        this.child.setWidth(width);
        //Foldable.prototype.setLeft.call(this, width);
    },

    setWidth: function(width) {
        if(this.child) {
            //this.child.setWidth(width);
        }

        Foldable.prototype.setWidth.call(this, width);
    },

    hide: function() {

    },

    setLabel: function(label) {
        this.label.root.innerHTML = label;
    },

    refresh: function() {
        this.items.forEach(function(item) {
            if(item.refresh) {
                item.refresh();
            }
        });
    },

    __proto__: Foldable.prototype
};

module.exports = MenuItem;
},{"./button.js":"new_ui/lib/button.js","./checkbox.js":"new_ui/lib/checkbox.js","./colors.js":"new_ui/lib/colors.js","./dropdown.js":"new_ui/lib/dropdown.js","./element.js":"new_ui/lib/element.js","./foldable.js":"new_ui/lib/foldable.js","./icon_group.js":"new_ui/lib/icon_group.js","./input.js":"new_ui/lib/input.js","./slider.js":"new_ui/lib/slider.js","./v_foldable.js":"new_ui/lib/v_foldable.js","promise":46}],"new_ui/lib/sidebar.js":[function(require,module,exports){
'use strict';

var Element  = require('./element.js'),
    Foldable = require('./foldable.js'),
    Colors   = require('./colors.js'),
    Tween    = require('./tween.js'),
    Button   = require('./button.js'),
    Menu     = require('./menu.js');

var easeOutCirc = Tween.easeOutCirc;

function Sidebar(width) {
    this.maxWidth = width;
    this.foldable = new Menu(width);
    this.root     = document.createElement('div'); 
    this.appendChild(this.foldable);

    this.unfolded = 0;

    this.setHeight('100%');
    this.root.style.position = 'absolute';

    this.foldable.setBackground(Colors.sidebarBackground);
    this.foldable.setHeight('inherit');

    this.foldable.root.style.overflow = 'hidden';

    this.children = [];

    this.foldButton = new Button();
    this.appendChild(this.foldButton);

    this.foldButton.setHeight(Colors.sidebarFoldButtonSize);
    this.foldButton.setWidth(Colors.sidebarFoldButtonSize);
    this.foldButton.setBackground(Colors.sidebarFoldButtonBackground);

    this.foldButton.root.style.position = 'absolute';
    this.foldButton.root.style.top      = '0';
    this.foldButton.root.style.color    = Colors.sidebarFoldButtonFontColor;
    this.foldButton.root.style['text-align']  = 'center';
    this.foldButton.root.style['padding-top'] = Colors.sidebarFoldButtonPaddingtop + 'px';
    this.foldButton.root.style['font-size']   = Colors.sidebarFoldButtonFontSize;

    var listIcon = new Element('span');
    listIcon.root.className = 'glyphicon glyphicon-plus';

    this.foldButton.appendChild(listIcon);

    var that = this;
    this.foldButton.click(function() {
        if(that.foldable.folded) {
            listIcon.root.className = 'glyphicon glyphicon-minus';
        } else {
            listIcon.root.className = 'glyphicon glyphicon-plus';
        }

        that.invert();
    });
}

Sidebar.prototype = {
    addButton: function(icon, callback) {
        var button = new Button();

        button.root.style.display = 'inline-block';
        button.setHeight(this.foldable.buttonHeight);
        button.setWidth(this.foldable.buttonHeight);
        button.root.style['text-align'] = 'center';

        button.root.style['padding-top'] = Colors.menuButtonPaddingTop + 'px';

        var span = new Element('span');
        span.root.className = 'glyphicon glyphicon-'+icon;

        span.root.style['font-size'] = Colors.menuButtonIconSize;

        button.appendChild(span);

        this.foldable.addButton(button);
        if(callback && typeof callback === 'function') {
            button.click(callback);
        }

        return button;
    },

    addItem: function(item) {
        this.foldable.addItem(item);
        item.label.setWidth(this.maxWidth);
    },

    show: function() {
        if(this.currentTween) {
            this.currentTween.stop();
        }

        var currentWidth = this.foldable.getWidth(); 
        var destination  = this.foldable.foldableWidth - currentWidth;

        this.foldable.invert();
        var that = this;
        this.currentTween = easeOutCirc(destination, 250, function(width) {
            that.foldButton.setLeft(currentWidth + width);
        });

        //this.foldable.folded = false;
    },

    hide: function() {
        if(this.currentTween) {
            this.currentTween.stop();
        }

        var currentWidth = this.foldable.getWidth();
        var destination  = currentWidth;

        this.foldable.invert();
        var that = this;
        this.currentTween = easeOutCirc(destination, 250, function(width) {
            //that.foldable.setWidth(currentWidth  - width, true);
            that.foldButton.setLeft(currentWidth - width);
        });

        //this.foldable.folded = true;
    },

    invert: function() {
        if(this.foldable.folded) {
            this.show();
        } else {
            this.hide();
        }
    },

    __proto__: Foldable.prototype
};

module.exports = Sidebar;
},{"./button.js":"new_ui/lib/button.js","./colors.js":"new_ui/lib/colors.js","./element.js":"new_ui/lib/element.js","./foldable.js":"new_ui/lib/foldable.js","./menu.js":"new_ui/lib/menu.js","./tween.js":"new_ui/lib/tween.js"}],"new_ui/lib/slider.js":[function(require,module,exports){
'use strict';

var Input   = require('./input.js'),
    Element = require('./element.js');

function Slider(min, max) {
    Input.call(this);
    this.input.root.setAttribute('type', 'range');
    this.input.root.style.display = 'inline-block';

    this.lowestValue  = min || 0;
    this.highestValue = max || 10;

    this.input.root.setAttribute('min', this.lowestValue);
    this.input.root.setAttribute('max', this.highestValue);
    this.input.setWidth('60%');

    this.minValueDiv = new Element('div');
    this.maxValueDiv = new Element('div');

    this.minValueDiv.root.style.display = 'inline-block';
    this.maxValueDiv.root.style.display = 'inline-block';

    this.minValueDiv.root.style['margin-top'] = '2px';
    this.maxValueDiv.root.style['margin-top'] = '2px';

    this.minValueDiv.root.style.float = 'left'
    this.maxValueDiv.root.style.float = 'right'

    this.minValueDiv.setWidth('20%');
    this.maxValueDiv.setWidth('20%');

    this.minValueDiv.setLabel(this.lowestValue);
    this.maxValueDiv.setLabel(this.highestValue);

    this.setValue(this.lowestValue + 2);
    var that = this;

    this.onInput(function(evt) {
        that.minValueDiv.setLabel(that.input.root.value);
    });

    this.inputDiv.root.insertBefore(this.minValueDiv.root, this.inputDiv.root.firstChild);
    this.inputDiv.appendChild(this.maxValueDiv);

    var clear = new Element('div');
    clear.root.style.clear = 'both';

    this.inputDiv.appendChild(clear);
}

Slider.prototype = {
    setMax: function(value) {
        value = parseInt(value);
        if(isNaN(value)) {
            throw new Error('Not a number given to setMax.');
        }

        this.input.root.setAttribute('max', value);
        this.maxValueDiv.setLabel(value);

        if(this.getValue() >= value) {
            this.setValue(value);
        }
    },

    setMin: function(value) {
        value = parseInt(value);
        if(isNaN(value)) {
            throw new Error('Not a number given to setMin.');
        }
        
        this.input.root.setAttribute('min', value);
        this.minValueDiv.setLabel(value);

        if(this.getValue() <= value) {
            this.setValue(value);
        }
    },

    setValue: function(value) {
        value = parseInt(value);
        if(isNaN(value)) {
            throw new Error('Value given is not a number');
        }

        Input.prototype.setValue.call(this, value);
        this.minValueDiv.setLabel(value);
    },

    __proto__: Input.prototype
};

module.exports = Slider;
},{"./element.js":"new_ui/lib/element.js","./input.js":"new_ui/lib/input.js"}],"new_ui/lib/tween.js":[function(require,module,exports){
'use strict';

var tweening = {
    easeInQuad: function(t, b, c, d) {
        t /= d;
        return c * t * t + b;
    },

    easeOutCirc: function(t, b, c, d) {
        t /= d;
        t--;
        return c * Math.sqrt(1 - t*t) + b;
    }
};

function Tween(tween, width, duration, callback, onEnd) {
    if(!tweening[tween]) {
        throw new Error('Trying tweening with non existent tween');
    }

    var tweenFunc = tweening[tween];
    var FPS = 1000 / 60;

    var startTime  = Date.now();
    var value      = 0;

    this.stopTween = false;
    var that       = this;

    var recursive = function() {
        if(that.stopTween) {
            that.isDone = true;
            return;
        }

        var timeSinceStart = Date.now() - startTime;
        callback(tweenFunc(timeSinceStart, 0, width, duration));

        if(timeSinceStart > duration) {
            that.isDone = true;
            callback(width);
            if(onEnd) {
                onEnd();
            }
            return;
        }

        setTimeout(recursive, FPS);
    };

    recursive();
}

Tween.prototype = {
    stop: function() {
        this.stopTween = true;
    }
};

function easeOutCirc(width, duration, callback, onEnd) {
    return new Tween('easeOutCirc', width, duration, callback, onEnd);
}

module.exports = {
    easeOutCirc: easeOutCirc
}
},{}],"new_ui/lib/v_foldable.js":[function(require,module,exports){
'use strict';

var Element  = require('./element.js'),
    Foldable = require('./foldable.js'),
    Tween    = require('./tween.js');

var easeOutCirc = Tween.easeOutCirc;

function VerticalFoldable(height, positional) {
    if(!height) {
        throw new Error('Creating vertical foldable without height.');
    }

    if(typeof height !== 'number') {
        throw new Error('Width given must be a number.');
    }

    this.root = document.createElement('div');

    this.setHeight(0);

    this.folded         = true;
    this.foldableHeight = height;
    this.children       = [];
}

VerticalFoldable.prototype = {
    fold: function(onDone) {
        this.children.forEach(function(child) {
            if(child instanceof Foldable) {
                child.fold();
            }
        });

        if(this.currentTween) {
            this.currentTween.stop();
        }

        var currentHeight = this.getHeight();
        var destination  = currentHeight;

        this.root.style['overflow-y'] = 'hidden';

        var that = this;
        this.currentTween = easeOutCirc(destination, 250, function(width) {
            that.setHeight(currentHeight - width);
        }, onDone);

        this.folded = true;
    },

    unfold: function(onDone) {
        this.children.forEach(function(child) {
            if(child instanceof Foldable) {
                child.unfold();
            }
        });

        if(this.currentTween) {
            this.currentTween.stop();
        }

        var currentHeight = this.getHeight();
        var destination  = this.foldableHeight - currentHeight;

        var that = this;
        this.currentTween = easeOutCirc(destination, 250, function(width) {
            that.setHeight(currentHeight + width);
        }, function(_) {that.root.style['overflow-y'] = 'auto'; if(onDone) {onDone(_);}});
        this.folded = false;
    },

    invert: function(onDone) {
        if(this.folded) {
            this.unfold(onDone);
        } else {
            this.fold(onDone);
        }
    },

    __proto__: Foldable.prototype
};

module.exports = VerticalFoldable;
},{"./element.js":"new_ui/lib/element.js","./foldable.js":"new_ui/lib/foldable.js","./tween.js":"new_ui/lib/tween.js"}],"new_ui/new_ui.js":[function(require,module,exports){
'use strict';

module.exports = {
    Button:    require('./lib/button.js'),
    Colors:    require('./lib/colors.js'),
    Element:   require('./lib/element.js'),
    Foldable:  require('./lib/foldable.js'),
    IconGroup: require('./lib/icon_group.js'),
    Input:     require('./lib/input.js'),
    Menu:      require('./lib/menu.js'),
    MenuItem:  require('./lib/menu_item.js'),
    Sidebar:   require('./lib/sidebar.js'),
    Slider:    require('./lib/slider.js'),
    Tween:     require('./lib/tween.js')
};
},{"./lib/button.js":"new_ui/lib/button.js","./lib/colors.js":"new_ui/lib/colors.js","./lib/element.js":"new_ui/lib/element.js","./lib/foldable.js":"new_ui/lib/foldable.js","./lib/icon_group.js":"new_ui/lib/icon_group.js","./lib/input.js":"new_ui/lib/input.js","./lib/menu.js":"new_ui/lib/menu.js","./lib/menu_item.js":"new_ui/lib/menu_item.js","./lib/sidebar.js":"new_ui/lib/sidebar.js","./lib/slider.js":"new_ui/lib/slider.js","./lib/tween.js":"new_ui/lib/tween.js"}],"new_ui/package.json":[function(require,module,exports){
module.exports={
    "main": "./new_ui.js",
    "name": "new_ui"
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

module.exports = {
    notify: function(container, text, delay) {
        if (container === null) {
            return false;
        }

        var popup = new Popup(text);
        container.appendChild(popup.element);
        setTimeout(function() {
            popup.fadeOut(function() {
                container.removeChild(popup.element);
            });
        }, delay || 4000);
    }
};
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

    var keys   = Object.keys(this);
    var length = keys.length;
    for(var i = 0; i < length; i++) {
        var key = keys[i];
        if(callback.call(thisArg, this[key], key, i, keys) === false) {
            break;
        }
    }
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

function copy(tree) {
    var newObj     = {};
    var objectTree = tree || [this];

    Object.keys(this).forEach(function(key) {
        var value = this[key];
        if(Array.isArray(value)) {
            newObj[key] = copyArray(value);
        } else if(typeof value === 'object' && value) {
            if(objectTree.indexOf(value) !== -1) {
                throw new Error('Circular structure.');
            }

            var index = objectTree.length;
            objectTree.push(value);
            newObj[key] = copy.call(value, objectTree);
            objectTree.unshift(index, 1);
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
        (-loadedModel.settings.offsetX || 0) * (2 - loadedModel.settings.scaleX || 1),
        (-loadedModel.settings.offsetY || 0) * (2 - loadedModel.settings.scaleX || 1),
        canvas.width  * (2 - (loadedModel.settings.scaleX || 1)),
        canvas.height * (2 - (loadedModel.settings.scaleY || 1))
    );*/
    
    ctx.setTransform(
        loadedModel.settings.scaleX  || 1,
        0,
        0,
        loadedModel.settings.scaleY  || 1,
        loadedModel.settings.offsetX || 0,
        loadedModel.settings.offsetY || 0
    );

    next();
}

function drawNodes(ctx, canvas, loadedModel, selectedMenu, next) {
    objectHelper.forEach.call(
        loadedModel.nodeData,
        function drawEachNode(n) { 
            var nodeGui = objectHelper.merge.call(n, loadedModel.nodeGui[n.id]);
            if(!loadedModel.settings.linegraph) {
                nodeGui.linegraph = false;
            }

            nodeGui.url = loadedModel.CONFIG.url;

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
            if(loadedModel.static.showSimulate) {
                if(loadedModel.loadedScenario && loadedModel.loadedScenario.data[nodeGui.id]) {
                    drawTimeTable(ctx, nodeGui, loadedModel.loadedScenario.data[nodeGui.id]);
                } else if(nodeGui.type.toUpperCase() !== 'ACTOR') {
                    drawChange(ctx, nodeGui.x, nodeGui.y + nodeGui.radius / 6, nodeGui.radius, Math.round(n.simulateChange[loadedModel.loadedScenario.timeStepN] * 100) / 100);
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
    "main": "./scenario_index.js"
}
},{}],"scenario/scenario.js":[function(require,module,exports){
'use strict';

var FloatingWindow = require('./../floating_window/floating_window.js'),
    menuBuilder    = require('./../menu_builder');

var objectHelper   = require('./../object-helper.js');
var TimeTable      = require('./../structures/timetable.js');

function Scenario(loadedModel, syncId) {
    this.id                = loadedModel.generateId();
    this.syncId            = syncId;

    this.name              = 'New scenario';
    this.data              = {};

    this.measurement       = 'Week';
    this.measurementAmount = 1;
    this.maxIterations     = 4;
    this.timeStepN         = 0;
}

/*function Scenario(loadedModel, syncId) {
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
}*/

/*Scenario.prototype = {
    setName: function(name) {
        this.name = name;

        return this;
    },

    refresh: function(loadedModel) {
        this.generateScenarioContainer(loadedModel);

        return this;
    },

    setNodes: function() {
        //this.loadedModel.nodeData.forEach(function(data) {
        //    console.log(data);
        //});

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
                        loadedModel.emit(null, 'refresh', 'resetUI');
                    });
                    
                    this.data[node.id] = data;
                }
                
                this.container.appendChild(data.generateTimeTable());
            },
            this
        );

        loadedModel.emit('refresh');

        return this;
    }
};*/

module.exports = Scenario;

},{"./../floating_window/floating_window.js":"floating_window/floating_window.js","./../menu_builder":"menu_builder/menu_builder.js","./../object-helper.js":"object-helper.js","./../structures/timetable.js":"structures/timetable.js"}],"scenario/scenario_editor.js":[function(require,module,exports){
'use strict';

var FloatingWindow = require('./../floating_window/floating_window.js'),
    menuBuilder    = require('./../menu_builder'),
    Scenario       = require('./scenario.js');

var objectHelper   = require('./../object-helper.js');

function ScenarioEditor(loadedModel, x, y) {
    this.loadedModel     = loadedModel;
    this.floatingWindow  = new FloatingWindow(x || 20, y || 20, 440, 400, 'mb-scenario-editor');
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

            that.loadedModel.floatingWindows.forEach(function(floatingWindow) {
                floatingWindow.refresh();
            });
        });

        this.deleteScenario = menuBuilder.button('Delete scenario', function() {

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

            that.loadedModel.floatingWindows.forEach(function(floatingWindow) {
                floatingWindow.refresh();
            });
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

module.exports = ScenarioEditor;

},{"./../floating_window/floating_window.js":"floating_window/floating_window.js","./../menu_builder":"menu_builder/menu_builder.js","./../object-helper.js":"object-helper.js","./scenario.js":"scenario/scenario.js"}],"scenario/scenario_index.js":[function(require,module,exports){
'use strict';

module.exports = {
    Scenario:       require('./scenario.js'),
    ScenarioEditor: require('./scenario_editor.js')
};
},{"./scenario.js":"scenario/scenario.js","./scenario_editor.js":"scenario/scenario_editor.js"}],"selected_menu/buttons.js":[function(require,module,exports){
'use strict';

var objectHelper = require('./../object-helper');

module.exports = [
    {
        header: 'Delete selected',
        ignoreModelSettings: true,
        replacingObj:        true,
        callback: function(loadedModel, selectedData) {
            loadedModel.emit('deleteSelected');
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
var TimeTable    = require('./../structures/timetable.js');

function generateHexColor() {
    return Math.round(Math.random() * 255).toString(16);
}

function generateColor() {
    return '#' + generateHexColor() + generateHexColor() + generateHexColor();
}

function generateAvatarDiv(url, avatar, selected, name) {
    var avatarDiv = menuBuilder.div();
    var img = menuBuilder.img();

    avatarDiv.className = 'avatarPreview';

    if (selected === avatar.src) {
        avatarDiv.className += ' selected';
    }

    img.src         = url + '/' + avatar.src;
    avatarDiv.value = avatar.src;
    avatarDiv.name  = avatar.header || name;

    avatarDiv.appendChild(img);

    return avatarDiv;
}

function createAvatarButtons(url, header, value, callback, images) {
    var avatarsDiv = menuBuilder.div();
    
    avatarsDiv.className = 'avatars';

    images.forEach(function(avatar) {
        var avatarDiv = generateAvatarDiv(url, avatar, value, header);

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

    refreshTimeTable: function() {
        this.timetable.refreshTimeTable();
    },

    generateDropdown: function(key, options, value) {
        var that = this;
        var containerSelect = menuBuilder.select(key, function(evt) {
            that.data[key] = this.value;

            /*that.loadedModel.refresh = true;
            that.loadedModel.propagate();*/

            that.loadedModel.emit('refresh');
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

                /*that.loadedModel.refresh = true;
                that.loadedModel.resetUI = true;
                that.loadedModel.propagate();*/
                that.loadedModel.emit(null, 'refresh', 'resetUI');
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
                /*that.loadedModel.refresh = true;
                that.loadedModel.propagate();*/
                that.loadedModel.emit('refresh');
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

                    var linkArr = that.loadedModel.nodeGui[link.node1].links;
                    var index   = linkArr.indexOf(link.id);

                    if(index !== -1) {
                        linkArr.splice(index, 1);
                    }

                    linkArr = that.loadedModel.nodeGui[link.node2].links;
                    index   = linkArr.indexOf(link.id);

                    if(index !== -1) {
                        linkArr.splice(index, 1);
                    }

                    that.loadedModel.emit(null, 'refresh', 'resetUI');
                });

                element.appendChild(button);
            }, this);
        }

        objectHelper.forEach.call(this.data, function(value, key) {
            if(this.filter.indexOf(key) === -1) {
                return;
            }

            if (key === 'timeTable') {
                var timeTable = new TimeTable(this.data, function(step, value) {
                    that.loadedModel.emit(null, 'refresh', 'resetUI');
                }, this.loadedModel.loadedScenario.data[this.data.id].data);

                timeTable.generateTimeTable();

                this.timetable    = timeTable;
                this.timetableDiv = timeTable.timeTableDiv;

                element.appendChild(this.timetableDiv);
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

        if(!this.data[i]) {
            return;
        }

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

},{"./../menu_builder":"menu_builder/menu_builder.js","./../object-helper.js":"object-helper.js","./../settings":"settings/settings.js","./../structures/timetable.js":"structures/timetable.js","./buttons.js":"selected_menu/buttons.js"}],"settings/menu.js":[function(require,module,exports){
'use strict';

var Immutable  = null,
    modelling  = require('./modelling.js'),
    simulate   = require('./simulate.js'),
    windows    = require('./windows.js');

var modelLayer   = require('./../model_layer.js');
var objectHelper = require('./../object-helper.js');

function modeUpdate(loadedModel, savedModels) {
    var element = this;

    element.resetOptions();
    element.addOption('modelling', 'Modelling');
    element.addOption('simulate',  'Simulate');

    element.refreshList();
};

function modeCallback(loadedModel, savedModels) {
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

    if(!loadedModel.selected) {
        loadedModel.selected = loadedModel.settings;
    }

    loadedModel.emit(null, 'refresh', 'resetUI');
};

function projectUpdate(loadedModel, savedModels) {
    var element = this;

    element.resetOptions();
    element.addOption('new',    'New Model');
    element.addOption('save',   'Save Current');
    element.addOption('delete', 'Delete Current');

    modelLayer = require('./../model_layer.js');
    modelLayer.getAllModels(loadedModel).then(
        function(models) {
            objectHelper.forEach.call(
                savedModels.local,
                function(model) {
                    element.addOption(model.id, model.settings.name);
                }
            );

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

            element.refreshList();
        },

        function(error, response) {
            objectHelper.forEach.call(
                savedModels.local,
                function(model) {
                    console.log(model);
                    element.addOption(model.id, model.settings.name);
                }
            );

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

            element.refreshList();
        }
    );

    /*backendApi('/models/all', function(response, error) {
        if(error) {
            console.error(error);
            loadedModel.emit('Couldn\'t fetch all models.', 'notification');
            response = {
                response: []
            };

            //throw new Error('projectUpdate: /models/all crashed');
        }

        objectHelper.forEach.call(
            savedModels.local,
            function(model) {
                console.log(model);
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

        element.refreshList();
    });*/
};

function projectCallback(loadedModel, savedModels) {
    var option = this.value;

    if(option === undefined) {
        return;
    }

    if(typeof option === 'number') {
        option = '' + option;
    }

    this.parent.toggle();
    switch(option.toUpperCase()) {
        case 'NEW':
            loadedModel.emit('storeModel');
            loadedModel.emit([loadedModel.id, loadedModel.syncId], 'preNewModel');
            loadedModel.emit('newModel');
            break;
        case 'SAVE':
            loadedModel.emit([loadedModel.id, loadedModel.syncId], 'preSaveModel');
            loadedModel.emit([loadedModel.id, loadedModel.syncId], 'saveModel');
            break;
        case 'DELETE':
            loadedModel.emit([loadedModel.id, loadedModel.syncId], 'deleteModel');
            break;
        default:
            loadedModel.emit('storeModel');
            loadedModel.emit(option, 'loadModel');
            break;
    }

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

},{"./../model_layer.js":"model_layer.js","./../object-helper.js":"object-helper.js","./modelling.js":"settings/modelling.js","./simulate.js":"settings/simulate.js","./windows.js":"settings/windows.js"}],"settings/modelling.js":[function(require,module,exports){
'use strict';

var Immutable        = null,
    createNode       = require('../structures/create_node'),
    createOriginNode = require('../structures/create_origin'),
    createActorNode  = require('../structures/create_actor');

var model = [
    {
        header:   'Actor',
        callback: createActorNode,
        type:     'LIST',
        images: [
            {src: 'img/avatars/executive_actor.png',   header: 'Executive actor'},
            {src: 'img/avatars/legislative_actor.png', header: 'Legislative actor'},
            {src: 'img/avatars/unofficial_actor.png',  header: 'Unofficial actor'}
        ]
    },

    {
        header:   'Policy Instrument',
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
        header:   'External Factor',
        callback: createOriginNode,
        type:     'LIST',
        images: [
            {src: 'img/avatars/barriers_and_forces.png', header: 'Drivers and barriers'},
            {src: 'img/avatars/constraints.png',         header: 'External factors and constraints'},
            {src: 'img/avatars/social_change.png',       header: 'Social, demographic, and behavioural change'}
        ]
    },

    {
        header:   'Policy Impact',
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
            type:   'origin',
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
    network         = require('./../network'),
    breakout        = require('./../breakout.js'),
    objectHelper    = require('./../object-helper.js');

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
                scenario: loadedModel.loadedScenario
            };

            objectHelper.forEach.call(
                loadedModel.nodeData,
                function(node) {
                    node.simulateChange = [];
                }
            );

            console.log(data);

            network(loadedModel.CONFIG.url, '/models/' + loadedModel.CONFIG.userFilter + '/' + loadedModel.CONFIG.projectFilter + '/simulate', data, function(response, err) {
                if(err) {
                    console.error(err);
                    console.error(response);
                    loadedModel.emit(response.response.message, 'notification');
                    return;
                }

                console.log(response.response);

                var timeSteps = response.response;
                var nodeData  = loadedModel.nodeData;
                timeSteps.forEach(function(timeStep) {
                    timeStep.forEach(function(node) {
                        var currentNode = nodeData[node.id];
                        currentNode.simulateChange.push(node.relativeChange);
                    });
                });

                //loadedModel.refresh  = true;
                loadedModel.settings = loadedModel.settings;
                //loadedModel.propagate();

                loadedModel.emit(null, 'settings', 'refresh');
            });
        }
    },

    {
        header: 'Linegraph',
        type:   'CHECKBOX',
        ajax:   true,
        onCheck: function(loadedModel) {
            var settings       = loadedModel.settings;
            settings.linegraph = true;

            loadedModel.emit('refresh');
        },

        onUncheck: function(loadedModel) {
            var settings       = loadedModel.settings;
            settings.linegraph = false;

            loadedModel.emit('refresh');
        }
    },

    {
        header: 'Show simulate changes',
        type:   'CHECKBOX',

        onCheck: function(loadedModel) {
            loadedModel.static.showSimulate = true;
            loadedModel.emit('refresh');
        },

        onUncheck: function(loadedModel) {
            loadedModel.static.showSimulate = false;
            loadedModel.emit('refresh');
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

        defaultValue: function(model, values) {
            return model.loadedScenario.measurement;
        },

        onChange: function(model, value) {
            model.loadedScenario.measurement = value;
        }
    },

    {
        header: 'Time step N',
        type:   'SLIDER',
        id:     'timestep',

        defaultValue: function(model) {
            return model.loadedScenario.timeStepN;
        },

        range: function(model) {
            return [0, model.loadedScenario.maxIterations];
        },

        onSlide: function(model, value) {
            model.loadedScenario.timeStepN = parseInt(value);

            model.emit('refresh');
        },

        onChange: function(model, value) {
            model.loadedScenario.timeStepN = parseInt(value);
        }
    },

    {
        header: 'Max iterations',
        type:   'INPUT',
        id:     'iterations',

        defaultValue: function(model) {
            return model.loadedScenario.maxIterations;
        },

        onChange: function(model, value) {
            model.loadedScenario.maxIterations = parseInt(value);
        }
    }
];

module.exports = simulate;

},{"./../breakout.js":"breakout.js","./../network":"network/network.js","./../object-helper.js":"object-helper.js"}],"settings/windows.js":[function(require,module,exports){
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

    loadedModel.emit(option, 'newWindow');
    return;

    switch(option.toUpperCase()) {
        case 'SCENARIO':
            loadedModel.emit('SCENARIO', 'newWindow');
            //var scenarioEditor = new ScenarioEditor(loadedModel);
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

},{"./../scenario":"scenario/scenario_index.js"}],"strict_curry.js":[function(require,module,exports){
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
    var n = Math.round(Math.random() * 255).toString(16);

    if(n.length === 1) {
        n = '0' + n;
    }

    return n;
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
        id:            model.generateId(),
        node1:         source,
        node2:         destination,
        coefficient:   1,
        type:          type || 'fullchannel',
        timelag:       0,
        threshold:     0,
        width:         8,
        bidirectional: false,
        bidirectionalTimelag: 0,

        objectId:      'link'
    };
};

},{}],"structures/create_node.js":[function(require,module,exports){
'use strict';

var objectHelper = require('./../object-helper.js');

module.exports = function createNode(model, data, gui, type) {
    var id = model.generateId();

    var nodeData = {
        syncId:          false,
        value:           0,
        simulateChange:  [],
        type:            type || 'intermediate',
        initialValue:    0,
        measurementUnit: '',
        description:     '',
        baseline:        0,

        objectId: 'nodeData'
    };

    var x      = 600;
    var y      = 100;
    var radius = gui ? gui.radius || 45 : 45;

    var offsetX     = model.settings.offsetX;
    var offsetY     = model.settings.offsetY;
    var modelWidth  = model.static.width  || -1;
    var modelHeight = model.static.height || -1;

    objectHelper.forEach.call(model.nodeGui, function(n) {
        if(n.x < Math.abs(offsetX) || n.x > modelWidth + Math.abs(offsetX)) {
            return;
        }

        if(n.x > x) {
            x = n.x;
        }
    });

    x += radius;

    var nodeGui = {
        x:        x,
        y:        y,
        radius:   radius,
        links:    [],
        color:    '',

        objectId: 'nodeGui'
    };


    if(data !== undefined) {
        nodeData = objectHelper.merge.call(nodeData, data);
    }

    if(gui !== undefined) {
        nodeGui = objectHelper.merge.call(nodeGui, gui);
    }

    nodeData.id = id;
    nodeGui.id  = id;
    
    model.history.push({
        action: 'newNode',
        data:   {
            data: nodeData,
            gui:  nodeGui
        }
    });
    model.revertedHistory = [];

    model.nodeData[id] = nodeData;
    model.nodeGui[id]  = nodeGui;

    model.emit(null, 'resetUI', 'refresh');

    /**
     * @description A new node has been created.
     * @event newNode
     * @memberof module:model/statusEvents
     *
     * @param {integer} id - New node id.
     * @param {object} nodeData - Data relevant to the new node.
     * @param {object} nodeGui - Gui data relevant to the new node.
     * @example tool.addListener('newNode', function(id, nodeData, nodeGui) {
     *     console.log(nodeData, nodeGui);
     * })
     */
    model.emit([id, nodeData, nodeGui], 'newNode');

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
    
    return createNode(model, data, gui, 'origin');
};
},{"./create_node":"structures/create_node.js"}],"structures/timetable.js":[function(require,module,exports){
'use strict';

var menuBuilder  = require('./../menu_builder');
var objectHelper = require('./../object-helper.js');

var timeTableId = -1;
function TimeTable(node, onChange, reference, loadedModel) {
    this.id             = ++timeTableId;
    this.syncId         = false;

    this.node           = node;

    if(reference) {
        this.data = reference;
    } else {
        this.data = objectHelper.copy.call(node);
    }

    this.data.id        = timeTableId;

    this.node.timeTable = this.data.timeTable;

    this.header         = node.name;
    this.onChange       = onChange;

    this.container      = menuBuilder.div('menu');

    this.timeTable      = this.data.timeTable;

    this.timeTableDiv;
    this.rowContainer;
    this.rows           = {};

    this.dropdowns      = {};
    this.inputs         = {};
}

TimeTable.prototype = {
    setTimeStep: function(timeStepInput, timeStep, newStep) {
        if(this.timeTable[newStep] !== undefined) {
            return timeStepInput.value = timeStep;
        }

        this.timeTable[newStep] = this.timeTable[timeStep];
        delete this.timeTable[timeStep];

        this.rows[newStep] = this.rows[timeStep];
        delete this.rows[timeStep];

        timeStepInput.value = newStep;

        this.refreshTimeTable();

        this.onChange(newStep, this.timeTable[newStep]);
    },
    
    setTimeValue: function(timeValueInput, timeStep, newValue) {
        newValue = Number(newValue);
        if(isNaN(newValue)) {
            timeValueInput.value = this.timeTable[timeStep];
            return;
        }

        this.timeTable[timeStep] = newValue;
        timeValueInput.value     = newValue;

        this.node.timeTable[timeStep] = newValue;

        this.onChange(timeStep, newValue);
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
        timeStepLabel.className = 'time-label';

        var timeStepInput = menuBuilder.input('time-step', timeStep, function(input, newStep) {
            that.setTimeStep(timeStepInput, timeStep, newStep);
        });

        timeStepInput.className = 'time-step';

        var timeValueLabel = menuBuilder.span('C');
        timeValueLabel.className = 'time-label';

        var timeValueInput = menuBuilder.input('time-value', timeValue, function(input, newValue) {
            that.setTimeValue(timeValueInput, timeStep, newValue);
        });

        timeValueInput.className = 'time-value';

        rowDiv.appendChild(timeStepLabel);
        rowDiv.appendChild(timeStepInput);
        rowDiv.appendChild(timeValueLabel);
        rowDiv.appendChild(timeValueInput);

        var percentLabel = menuBuilder.span('%');
        percentLabel.className = 'time-label';

        rowDiv.appendChild(percentLabel);

        rowDiv.stepInput  = timeStepInput;
        rowDiv.valueInput = timeValueInput;

        rowContainer.appendChild(rowDiv);

        this.node.timeTable[timeStep] = timeValue;
    },

    removeTimeRow: function() {
        var size = objectHelper.size.call(this.timeTable);
        if (this.timeTable === undefined || this.timeTable === null || size === 0) {
            return;
        }
        
        var iter = 0;
        var lastKey = objectHelper.lastKey.call(this.timeTable);
        delete this.timeTable[lastKey];

        var element = objectHelper.last.call(this.rows);
        this.rowContainer.removeChild(element);

        delete this.rows[objectHelper.lastKey.call(this.rows)];

        //this.node.timeTable = objectHelper.slice.call(this.node.timeTable, 0, -1);

        this.onChange();
    },

    refreshTimeTable: function() {
        if(!this.rowContainer) {
            return;
        }

        while(this.rowContainer.firstChild) {
            this.rowContainer.removeChild(this.rowContainer.firstChild);
        }

        objectHelper.forEach.call(this.rows, function(row, key) {
            row.stepInput.deleteEvents();
            row.valueInput.deleteEvents();
        });

        this.rows = {};
        objectHelper.forEach.call(this.timeTable, function(timeValue, timeStep) {
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

        objectHelper.forEach.call(this.rows, function(row, key) {
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
                var highestIndex = -1;
                objectHelper.forEach.call(
                    that.timeTable,
                    function(value, key) {
                        var x;
                        if(!isNaN(x = parseInt(key)) && x > highestIndex) {
                            highestIndex = x;
                        }
                    }
                );

                var index = highestIndex === -1 ? 0 : highestIndex + 1;
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

module.exports = TimeTable;

},{"./../menu_builder":"menu_builder/menu_builder.js","./../object-helper.js":"object-helper.js"}],"ui/package.json":[function(require,module,exports){
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
    this.data      = sidebarData;

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
            var list = selectedMenu.createAvatarButtons(this.loadedModel.CONFIG.url, 'avatar', null, function(key, value) {
                data.callback(that.loadedModel, {name: key, role: data.header}, {avatar: value});
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
        if(data.objectId === 'link') {
            return this.getLinkFilter();
        }

        if(data.objectId === 'nodeData' || data.objectId === 'nodeGui') {
            return this.getDataFilter();
        }

        if(data.objectId === 'modelSettings') {
            return this.getModelFilter();
        }

        console.error(data);
        throw new Error('Unrecognized objectId given to getFilter.');
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
            if(selectedData.indexOf(data) === -1) {
                return true;
            }

            stillSelected.push(data);
            return false;
        }, this);

        notSelected = selectedData.filter(function(data) {
            if(stillSelected.indexOf(data) !== -1) {
                return false;
            }

            return true;
        });

        previouslySelected.forEach(function(data) {
            var selectedMenu = this.selected[data.id];

            selectedMenu.removeData(data);
            if(selectedMenu.data.length === 0) {
                delete this.selected[data.id];
            }
        }, this);

        notSelected.forEach(function(data) {
            if(data === undefined) {
                console.log('Current:',        selectedData);
                console.log('Prev:',           previouslySelected);
                console.log('Still selected:', stillSelected);
                console.log('New:',            notSelected);
                console.log('Menus:',          this.selected);
                throw new Error('What the');
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

var menuBuilder  = require('./../menu_builder'),
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

},{"./../menu_builder":"menu_builder/menu_builder.js","./../selected_menu/selected_menu":"selected_menu/selected_menu.js","./sidebar":"ui/sidebar.js","./sidebar_manager":"ui/sidebar_manager.js"}],"util/generate_link.js":[function(require,module,exports){
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
                    if(node.links === undefined) {
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

                    try {
                        var sourceGui = nodeGui[nodeId];
                        for(var i = 0; i < sourceGui.links.length; i++) {
                            var link = links[sourceGui.links[i]];
                            if((link.node1 === nodeId && link.node2 === collidedId)
                                || (link.node1 === collidedId && link.node2 === nodeId)) {
                                link.bidirectional        = true;
                                link.bidirectionalTimelag = 1;
                                
                                loadedModel.emit('selectableObjectUpdated');
                                return;
                            }
                        }

                        var newLink = createLink(loadedModel, nodeId, collidedId);

                        loadedModel.history.push({
                            action: 'newLink',
                            data:   {
                                link: newLink
                            }
                        });
                        loadedModel.revertedHistory = [];

                        links[newLink.id] = newLink;

                        nodeGui[nodeId].links.push(newLink.id);
                        nodeGui[collidedId].links.push(newLink.id);

                        loadedModel.emit(newLink, 'newLink');
                    } catch(e) {
                        console.error(nodeData);
                        console.error(nodeGui);
                        console.error(links);
                        
                        throw e;
                    }
                }
            );
        }
    );
};


},{"../structures/create_link":"structures/create_link.js","./../collisions.js":"collisions.js","./../linker.js":"linker.js","./../object-helper.js":"object-helper.js"}]},{},["main.js"]);
