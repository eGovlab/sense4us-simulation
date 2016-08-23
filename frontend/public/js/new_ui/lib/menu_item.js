'use strict';

var Foldable           = require('./foldable.js'),
    VerticalFoldable   = require('./v_foldable.js'),
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
            dropdown.deleteCurrent();
            deleteCallback();

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

            dropdown.changeValue(value, index);
            editCallback(index, value);
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
        stepInput.onInput(function() {
            if(!timeRowStepCheck(stepInput.getValue())) {
                stepInput.setValue(stepInput.previousValue);
                return;
            }

            stepInput.previousValue = stepInput.getValue();
        });

        stepInput.onChange(function() {
            stepCallback(stepInput.previousValue, node);
        });

        var valueInput = createInput('55%', value);
        valueInput.previousValue = step;
        valueInput.onInput(function() {
            if(!timeRowValueCheck(valueInput.getValue())) {
                valueInput.setValue(valueInput.previousValue);
                return;
            }

            valueInput.previousValue = valueInput.getValue();
        });

        valueInput.onChange(function() {
            valueCallback(valueInput.previousValue, node);
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