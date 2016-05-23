'use strict';

var objectHelper = require('./../../object-helper.js'),
    NewUI        = require('./../../new_ui');

var Colors = NewUI.Colors;

var modelling    = require('./../../settings/modelling.js');
var roles        = {};

modelling.forEach(function(group) {
    if(!roles[group.header]) {
        roles[group.header] = [];
    }

    roles[group.header] = roles[group.header].concat(group.images);
});

var linkModellingFilter = [
    {property: 'type',        type: 'dropdown', values: ['halfchannel', 'fullchannel']},

    {property: 'threshold',   type: 'input', check: function(value) {
        var match = value.match(/\d+\.?\d*/);
        if(match === null) {
            return false;
        }

        return true;
    }}, 

    {property: 'coefficient', type: 'input', check: function(value) {
        var match = value.match(/\d+\.?\d*/);
        if(match === null) {
            return false;
        }
        
        return true;
    }},

    {property: 'timelag',     type: 'input', check: function(value) {
        var match = value.match(/\d+/);
        if(match === null) {
            return false;
        }

        return true;
    }}
],
    dataModellingFilter = [
    {property: 'name',        type: 'input', check: function() {
        return true;
    }},
    {property: 'description', type: 'input', check: function() {
        return true;
    }}
],
    guiModellingFilter  = [
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

            input.changeObject[input.changeProperty] = value;
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

                input.setLabel(row.property);
                input.refresh();

                input.show();

                inputIterator++;

                break;
        }
    });

    guiModellingFilter.forEach(function(row) {
        switch(row.type.toUpperCase()) {
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

    var inputs     = [],
        buttons    = [],
        dropdowns  = [],
        checkboxes = [],
        sliders    = [],
        iconGroups = [];

    menuItem.refresh = function() {
        var selected = loadedModel.selected;
        if(!selected || !selected.objectId) {
            hideEverything(inputs, buttons, dropdowns, checkboxes, sliders, iconGroups);
            return;
        }

        if(selected.objectId === 'nodeGui' || selected.objectId === 'nodeData') {
            var nodeData = loadedModel.nodeData[selected.id],
                nodeGui  = loadedModel.nodeGui[selected.id];

            showNodeMenu(loadedModel, menuItem, inputs, buttons, dropdowns, checkboxes, sliders, iconGroups, nodeData, nodeGui);
        } else if(selected.objectId === 'link') {
            var link = loadedModel.links[selected.id];

            showLinkMenu(loadedModel, menuItem, inputs, buttons, dropdowns, checkboxes, sliders, iconGroups, link);
        }
    };

    menuItem.refresh();

    sidebar.addItem(menuItem);
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
        }
        return;

        sidebarManager.setEnvironment(loadedModel.environment);
        sidebarManager.setLoadedModel(loadedModel);

        try {
            if(!this.selected) {
                this.selected = {};
            }

            if(this.selected.objectId === 'nodeGui' || this.selected.objectId === 'nodeData') {
                var nodeData = loadedModel.nodeData[this.selected.id];
                var nodeGui  = loadedModel.nodeGui[this.selected.id];

                sidebarManager.setSelectedMenu(nodeData, nodeGui);
                /**
                 * @description Item was selected.
                 * @event selected
                 * @memberof module:model/statusEvents
                 *
                 * @param {object} selected - The currently selected object.
                 * @example tool.addListener('selected', function(object) {
                 *     if(object.objectId !== "nodeData" && object.objectId !== "nodeGui") {
                 *         return console.log("Not a node.");
                 *     }
                 *     
                 *     var nodeData = this.nodeData[this.selected.id];
                 *     var nodeGui  = this.nodeGui[this.selected.id];
                 *     console.log("Node selected", nodeData, nodeGui);
                 * });
                 */
                loadedModel.emit(this.selected, 'selected');
            } else if(this.selected.objectId === 'link') {
                sidebarManager.setSelectedMenu(this.selected);
                loadedModel.emit(this.selected, 'selected');
            } else {
                sidebarManager.setSelectedMenu(loadedModel.settings);
                /**
                 * @description Item was deselected by any means.
                 * @event deselected
                 * @memberof module:model/statusEvents
                 *
                 * @example tool.addListener('deselected', function() {
                 *     console.log("Nothing is selected.");
                 * });
                 */
                loadedModel.emit('deselected');
            }
        } catch(err) {
            console.error('Selected menu broke down.');
            console.error(err);
        }
    });
}

module.exports = addSelectedListeners;
