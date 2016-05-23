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
        if(typeof value !== 'number') {
            throw new Error('Value given is not a number');
        }

        Input.prototype.setValue.call(this, value);
        this.minValueDiv.setLabel(value);
    },

    __proto__: Input.prototype
};

module.exports = Slider;