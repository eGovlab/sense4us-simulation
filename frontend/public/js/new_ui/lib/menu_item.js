'use strict';

var Foldable  = require('./foldable.js'),
    Colors    = require('./colors.js'),
    Element   = require('./element.js'),
    Input     = require('./input.js'),
    Slider    = require('./slider.js'),
    IconGroup = require('./icon_group.js'),
    Dropdown  = require('./dropdown.js'),
    Button    = require('./button.js');

function MenuItem(width) {
    Foldable.call(this, width, true);

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

    this.child = new Foldable(width);
    this.child.root.style.position = 'absolute';
    this.child.setBackground(Colors.itemBackground);
    this.child.root.style.color = Colors.itemFontColor;

    this.child.root.style['overflow-x']  = 'hidden';
    this.child.root.style['overflow-y']  = 'auto';
    this.child.root.style['white-space'] = 'nowrap';
    this.child.root.style['font-size']   = Colors.itemFontSize;

    this.child.root.style['max-height'] = '80%';

    this.label = new Element();
    this.label.root.style['white-space'] = 'normal';
    this.label.root.parentOwner = this;
    this.label.root.style['font-weight'] = '700';
    this.label.root.style['font-size']   = Colors.menuItemFontSize;

    this.appendChild(this.label);

    //this.items = [];
}

MenuItem.prototype = {
    addSeparator: function(height) {
        var separator = new Element('div');

        //this.items.push(separator);

        separator.setHeight(height);

        this.child.appendChild(separator);

        return separator;
    },

    addIconGroup: function(label) {
        var group = new IconGroup(label);

        //this.items.push(group);
        this.child.appendChild(group);

        group.root.style['white-space'] = 'normal';
        group.setWidth(this.maxWidth);

        return group;
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

        //this.items.push(button);
        this.child.appendChild(buttonContainer);

        return button;
    },

    addDropdown: function(label, values, callback) {
        var dropdown = new Dropdown(values, callback);
        dropdown.setLabel(label);

        //this.items.push(dropdown);

        dropdown.root.style['white-space'] = 'normal';
        dropdown.setWidth(this.maxWidth);

        dropdown.root.style.padding        = '16px 16px';
        dropdown.root.style['text-align']  = 'center';

        this.child.appendChild(dropdown);
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

        //this.items.push(input);
        this.child.appendChild(input);

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

        //this.items.push(input);
        this.child.appendChild(input);

        return input;
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

    __proto__: Foldable.prototype
};

module.exports = MenuItem;