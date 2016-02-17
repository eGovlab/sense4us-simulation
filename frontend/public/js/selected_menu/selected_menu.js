'use strict';

var Immutable   = null,
    menuBuilder = require('./../menu_builder'),
    settings    = require('./../settings'),
    buttons     = require('./buttons.js');

function createButtons(list, map, updateModelCallback) {
    var containerDiv = menuBuilder.div();
    containerDiv.className = 'menu';

    list.forEach(function(button) {
        if(map.maxIterations !== undefined && button.ignoreModelSettings === true) {
            return;
        }

        if(button.replacingObj) {
            containerDiv.appendChild(menuBuilder.button(button.header, function() {
                updateModelCallback(null, null, button.callback(map));
            }));
        } else {
            /* No buttons are not replacing obj right now. There is one button. */
        }
    });

    return containerDiv;
}

function generateAvatarDiv(avatar, selected, name) {
    var avatarDiv = menuBuilder.div();
    var img = menuBuilder.img();

    avatarDiv.className = 'avatarPreview';

    if (selected === avatar.src) {
        avatarDiv.className += ' selected';
    }

    img.src = avatar.src;
    avatarDiv.value = avatar.src;
    avatarDiv.name = avatar.header || name;

    avatarDiv.appendChild(img);

    return avatarDiv;
}

function createAvatarButtons(header, value, callback, images) {
    var avatarsDiv   = menuBuilder.div();
    
    avatarsDiv.className = 'avatars';
    
    images.forEach(function(avatar) {
        var avatarDiv = generateAvatarDiv(avatar, value, header);

        menuBuilder.addValueCallback(avatarDiv, callback, 'click');

        avatarsDiv.appendChild(avatarDiv);
    });

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

function createTimeTableEditor(key, timeTable, callback) {
    var containerDiv = menuBuilder.div();
    containerDiv.className = "time-table";

    (function addToContainer(key, timeTable, callback) {
        while(containerDiv.firstChild) {
            containerDiv.removeChild(containerDiv.firstChild);
        }
        containerDiv.appendChild(menuBuilder.label(key));

        if (timeTable !== undefined && timeTable.forEach !== undefined) {
            /*timeTable = timeTable.sortBy(function(value, key) {
                return parseInt(key);
            });*/

            var rowContainer = menuBuilder.div();
            rowContainer.className = "row-container";
            containerDiv.appendChild(rowContainer);
            timeTable.forEach(function(value, rowNumber) {
                //containerDiv.appendChild(menuBuilder.label('T' + rowNumber));

                var rowDiv = menuBuilder.div();
                rowDiv.className = "time-row";

                var timeStepLabel = menuBuilder.span("T");
                timeStepLabel.className = "label"
                var timeStep = menuBuilder.input("time-step", rowNumber, function changedTimeStep(input, newTimeStep) {
                    if(isNaN(parseInt(newTimeStep))) {
                        addToContainer(key, timeTable, callback);
                        return;
                    }
                    var tempStorage = timeTable[rowNumber];
                    console.log(value, tempStorage, timeTable);
                    timeTable[newTimeStep] = parseInt(tempStorage);
                    delete timeTable[rowNumber];

                    /*rowNumber = newTimeStep;
                    timeTable = timeTable.sortBy(function(value, key) {
                        return parseInt(key);
                    });*/

                    callback(key, timeTable);
                    addToContainer(key, timeTable, callback);
                });

                timeStep.className = "time-step";

                var timeStepValueLabel = menuBuilder.span("V");
                timeStepValueLabel.className = "label"
                var timeStepValue = menuBuilder.input("time-value", value, function changedTimeStepValue(input, newTimeValue) {
                    if(isNaN(parseInt(newTimeValue))) {
                        addToContainer(key, timeTable, callback);
                        return;
                    }
                    timeTable[rowNumber] = parseInt(newTimeValue);
                    callback(key, timeTable);
                    timeStepValue.value = newTimeValue;
                });

                timeStepValue.className = "time-value";

                rowDiv.appendChild(timeStepLabel);
                rowDiv.appendChild(timeStep);
                rowDiv.appendChild(timeStepValueLabel);
                rowDiv.appendChild(timeStepValue);

                rowContainer.appendChild(rowDiv);
            });
        }

        containerDiv.appendChild(menuBuilder.button('Add row', function addTimeTableRow() {
            if (timeTable === undefined || timeTable === null) {
                timeTable = {0: 0};
            } else {
                var highestIndex = 0;
                timeTable.forEach(function(value, index) {
                    var x;
                    if(!isNaN(x = parseInt(index)) && x > highestIndex) {
                        highestIndex = x;
                    }
                });

                timeTable[highestIndex + 1] = 0;
            }

            callback(key, timeTable);
            containerDiv.innerHTML = '';
            addToContainer(key, timeTable, callback);
        }));

        containerDiv.appendChild(menuBuilder.button('Remove row', function removeTimeTableRow() {
            if (timeTable === undefined || timeTable === null) {
            } else {
                timeTable = timeTable.slice(0, -1);
            }

            callback(key, timeTable);
            containerDiv.innerHTML = '';
            addToContainer(key, timeTable, callback);
        }));
    }(key, timeTable, callback));

    return containerDiv;
}

function generateInput(key, value, callback) {
    var containerDiv = menuBuilder.div();

    containerDiv.appendChild(menuBuilder.label(key));
    containerDiv.appendChild(menuBuilder.input(key, value, callback));

    return containerDiv;
}

function generateDropdown(key, options, defaultValue, callback) {
    var containerSelect = menuBuilder.select(key, function(evt) {
        callback(this.name, this.value);
    });

    options.forEach(function(option) {
        var optionElement = menuBuilder.option(option, option);
        if(option === defaultValue) {
            optionElement.selected = 'selected';
        }
        
        containerSelect.appendChild(optionElement);
    });

    return containerSelect;
}

function createMenu(map, onChangeCallback, includedAttributes) {
    var menu = {
        element: menuBuilder.div()
    };

    var element = menu.element;

    element.className = 'menu';
    element.appendChild(createButtons(buttons, map, onChangeCallback));

    var appendToEnd = [];

    map.forEach(function(value, key) {
        if (includedAttributes !== null && includedAttributes !== undefined && includedAttributes.indexOf(key) === -1) {
            return;
        }

        /*if(key === 'avatar' || key === 'icon') {
            appendToEnd.push(createAvatarSelector(key, value, onChangeCallback));
        } else*/

        if (key === 'timeTable') {
            appendToEnd.push(createTimeTableEditor(key, value, onChangeCallback));
        } else if(map.coefficient !== undefined && key === 'type') {
            appendToEnd.push(generateDropdown(key, ['fullchannel', 'halfchannel'], value, onChangeCallback));
        } else {
            appendToEnd.push(generateInput(key, value, onChangeCallback));
        }
    });

    appendToEnd.forEach(function(c) {
        element.appendChild(c);
    });

    return menu;
}

function updateMenu(menu, map) {
    var menuElement = menu.element;
    map.forEach(function(value, key) {
        var elements = menuElement.querySelectorAll('[name="' + key + '"]');
        var element = elements[0];

        if (element) {
            element.setAttribute('value', value);
            element.value = value;
        }
    });
    
    menu.element = menuElement;
    
    return menu;
}

var namespace = {
    createAvatarSelector: createAvatarSelector,
    createAvatarButtons:  createAvatarButtons,
    drawSelectedMenu: function(container, loadedModel, menu, map, changeCallback, includedAttributes) {
        if (map === null || map === undefined) {
            if (menu !== null) {
                try {
                    container.removeChild(menu.element);
                } catch(e) {
                    /* Node not found. Removed by other means? */
                }
            }

            return null;
        }

        var updateMenuMapObj = function(key, value, replacedObj) {
            console.log("REPLACING MAPOBJ");
            if(replacedObj) {
                //menu = menu.set('map_obj', replacedObj);
                menu.map_obj = replacedObj;
            } else {
                menu.map_obj[key] = value;
                //menu = menu.set('map_obj', menu.map_obj.set(key, value));
            }

            changeCallback(loadedModel, menu.map_obj);
        };

        if (!menu || menu.element === undefined) {
            menu = createMenu(map, updateMenuMapObj, includedAttributes);
            menu.map_obj = map;

            container.appendChild(menu.element);

            return menu;
        } else if (menu.map_obj !== map) {
            if (menu.map_obj && menu.map_obj.id === map.id) {
                // update menu
                menu = updateMenu(menu, map);
                //container.appendChild(menu.element);
                menu.map_obj = map;
            } else {
                // remake menu
                try {
                    container.removeChild(menu.element);
                } catch(err) {
                    /* Node not found -- continuing. */
                }
        
                menu = createMenu(map, updateMenuMapObj, includedAttributes);
                
                container.appendChild(menu.element);
                menu.map_obj = map;
        
                return menu;
            }
        }

        return menu;
    },

    updateSelected: function(loadedModel, newSelected, refresh, UIRefresh) {
        if (newSelected.timelag !== undefined && newSelected.coefficient !== undefined) {
            var coefficient = parseFloat(newSelected.coefficient),
                timelag     = parseInt(newSelected.timelag),
                threshold   = parseFloat(newSelected.threshold),
                type        = newSelected.type;

            if (isNaN(coefficient) || isNaN(timelag) || isNaN(threshold)) {
                console.log('Coefficient:', newSelected.coefficient);
                console.log('Timelag:',     newSelected.timelag);
                return;
            }

            if(newSelected.delete === true) {
                console.log("Deleting!");
                var links = loadedModel.links;

                delete links[newSelected.id];
                loadedModel.links = links;

                refresh();
                return;
            }
            
            loadedModel.links[newSelected.id] = loadedModel.links[newSelected.id].merge({
                coefficient: coefficient,
                timelag:     timelag,
                threshold:   threshold,
                type:        type
            });
        } else if (newSelected.offsetY !== undefined || newSelected.offsetX !== undefined) {
            loadedModel.settings = newSelected;
        } else {
            var nodeData = loadedModel.nodeData,
                nodeGui  = loadedModel.nodeGui,
                node     = null;

            if(newSelected.delete === true) {
                node      = nodeGui[newSelected.id];
                var links = loadedModel.links;

                if(node.links !== undefined){
                    node.links.forEach(function(link) {
                        links = links.delete(link);
                    });
                }

                delete nodeData[newSelected.id];
                delete nodeGui[newSelected.id];

                refresh();

                return;
            }

            node = nodeData[newSelected.id];
            nodeData[newSelected.id] = node.merge(newSelected);

            node = nodeGui[newSelected.id];
            nodeGui[newSelected.id] = node.merge({
                radius: parseFloat(newSelected.radius),
                avatar: newSelected.avatar,
                icon:   newSelected.icon
            });
        }

        /*if(savedModels.synced[loadedModel.id] !== undefined) {
            loadedModel.settings.saved = false;
            savedModels.synced[loadedModel.id] = loadedModel;
            _savedModels(savedModels);*/
            /*
            _savedModels(savedModels.set('synced',
                savedModels.synced.set(loadedModel.id,
                    loadedModel.set('settings', loadedModel.settings.set('saved',
                        false)
                    )
                )
            ));*/
        /*} else {
            loadedModel.settings.saved = false;
            savedModels.local[loadedModel.id] = loadedModel;
            _savedModels(savedModels);*/
            /*_savedModels(savedModels.set('local',
                savedModels.local.set(loadedModel.id,
                    loadedModel.set('settings', loadedModel.settings.set('saved',
                        false)
                    )
                )
            ));*/
        //}

        //UIRefresh();
        refresh();
    }
};

module.exports = namespace;
