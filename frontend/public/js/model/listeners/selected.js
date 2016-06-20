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
    }, set: function(value){return parseInt(value);}}
],
    dataModellingFilter = [
    {property: 'name',        type: 'input', check: function() {
        return true;
    }},
    {property: 'description', type: 'input', check: function() {
        return true;
    }},
    {property: 'baseline', type: 'input', check: function(value) {
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
            loadedModel.emit('refresh');
        });
    }

    return dropdown;
}

function getCheckbox(loadedModel, menuItem, checkboxes, iterator) {

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

    dataModellingFilter.forEach(function(row) {
        switch(row.type.toUpperCase()) {
            case 'INPUT':
                var input = getInput(loadedModel, menuItem, inputs, inputIterator);

                input.changeProperty = row.property;
                input.changeObject   = nodeData;
                input.changeCheck    = row.check;

                input.setObjectValue = false;
                if(row.set) {
                    input.setObjectValue = row.set;
                }

                input.setLabel(row.property);
                input.refresh();

                input.show();

                inputIterator++;
                break;
        }
    });

    guiModellingFilter.forEach(function(row) {
        switch(row.type.toUpperCase()) {
            case 'INPUT':
                var input = getInput(loadedModel, menuItem, inputs, inputIterator);

                input.changeProperty = row.property;
                input.changeObject   = nodeGui;
                input.changeCheck    = row.check;
                
                input.setObjectValue = false;
                if(row.set) {
                    input.setObjectValue = row.set;
                }

                input.setLabel(row.property);
                input.refresh();

                input.show();

                inputIterator++;
                break;
            case 'ICONGROUP':
                var iconGroup = getIconGroup(loadedModel, menuItem, iconGroups, iconGroupIterator);

                iconGroup.changeProperty = row.property;
                iconGroup.changeObject   = nodeGui;

                iconGroup.setLabel(row.property);

                var iconIterator = 0;
                if(row.groups[nodeData.role]) {
                    row.groups[nodeData.role].forEach(function(img) {
                        var btn = iconGroup.reuseIcon(loadedModel.CONFIG.url + '/' + img.src, iconIterator);
                        btn.root.clickedIcon       = btn;
                        btn.image.root.clickedIcon = btn;

                        btn.currentImage = img;

                        btn.image.root.style.border = 'none';
                        btn.image.root.style['border-radius'] = '50%';

                        if(nodeGui[row.property] === img.src) {
                            btn.image.root.style.border = '4px solid ' + Colors.activeAvatar;
                            iconGroup.lastActive = btn;
                        }

                        iconIterator++;
                    });
                }

                iconGroup.show();
                break;
        }
    });
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

    linkModellingFilter.forEach(function(row) {
        switch(row.type.toUpperCase()) {
            case 'INPUT':
                var input = getInput(loadedModel, menuItem, inputs, inputIterator);

                input.changeProperty = row.property;
                input.changeObject   = link;

                input.setObjectValue = false;
                if(row.set) {
                    input.setObjectValue = row.set;
                }
                input.changeCheck    = row.check;

                input.setLabel(row.property);
                input.refresh();

                input.show();

                inputIterator++;

                break;
            case 'DROPDOWN':
                var dropdown = getDropdown(loadedModel, menuItem, dropdowns, dropdownIterator);

                dropdown.changeProperty = row.property;
                dropdown.changeObject   = link;

                dropdown.setLabel(row.property);
                dropdown.replaceValues(row.values);
                dropdown.refresh();

                dropdown.show();

                dropdownIterator++;

                break;
        }
    });
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
    menuItem.refresh = function() {
        if(previousSelected === loadedModel.selected) {
            return;
        }

        if(loadedModel.selected === false) {
            return loadedModel.emit('deselect');        
        }

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

            showLinkMenu(loadedModel, menuItem, inputs, buttons, dropdowns, checkboxes, sliders, iconGroups, link);
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
