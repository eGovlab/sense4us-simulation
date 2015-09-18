'use strict';

var Immutable   = require('Immutable'),
    menuBuilder = require('./../menu_builder'),
    settings    = require('./../settings'),
    buttons     = require('./buttons.js');

function createButtons(list, model, onChangeCallback) {
    var containerDiv = menuBuilder.div();
    containerDiv.className = 'menu';

    list.forEach(function(button) {
        if(model.get('maxIterations') !== undefined && button.get('ignoreModelSettings') === true) {
            return;
        }

        containerDiv.appendChild(menuBuilder.button(button.get('header'), function() {
            onChangeCallback(button.get('callback')(model));
        }));
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

    (function addToContainer(key, timeTable, callback) {
        containerDiv.appendChild(menuBuilder.label(key));

        if (timeTable !== undefined && timeTable.forEach !== undefined) {
            timeTable.forEach(function(value, rowNumber) {
                containerDiv.appendChild(menuBuilder.label('T' + rowNumber));
                var input = menuBuilder.input('T' + rowNumber, value, function whenTimeTableChanges(inputName, value) {
                    timeTable = timeTable.set(rowNumber, value);
                    callback(key, timeTable);
                    input.value = value;
                });
                containerDiv.appendChild(input);
            });
        }

        containerDiv.appendChild(menuBuilder.button('Add row', function addTimeTableRow() {
            if (timeTable === undefined || timeTable === null) {
                timeTable = Immutable.Map({0: 0});
            } else {
                timeTable = timeTable.set(timeTable.size, 0);
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

function createMenu(map, onChangeCallback, includedAttributes) {
    var menu = Immutable.Map({
        element: menuBuilder.div()
    });

    var element = menu.get('element');

    element.className = 'menu';
    element.appendChild(createButtons(buttons, map, onChangeCallback));

    var appendToEnd = [];

    map.forEach(function(value, key) {
        if (includedAttributes !== null && includedAttributes !== undefined && includedAttributes.indexOf(key) === -1) {
            return;
        }

        /*if(key === 'avatar' || key === 'icon') {
            appendToEnd.push(createAvatarSelector(key, value, onChangeCallback));
        } else*/ if (key === 'timeTable') {
            appendToEnd.push(createTimeTableEditor(key, value, onChangeCallback));
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
    var menuElement = menu.get('element');
    map.forEach(function(value, key) {
        var elements = menuElement.querySelectorAll('[name="' + key + '"]');
        var element = elements[0];

        if (element) {
            element.setAttribute('value', value);
            element.value = value;
        }
    });
    
    menu = menu.set('element', menuElement);
    
    return menu;
}

var namespace = {
    createAvatarSelector: createAvatarSelector,
    createAvatarButtons:  createAvatarButtons,
    drawSelectedMenu: function(container, menu, map, changeCallback, includedAttributes) {
        if (map === null || map === undefined) {
            if (menu !== null) {
                try {
                    container.removeChild(menu.get('element'));
                } catch(e) {
                    /* Node not found. Removed by other means? */
                }
            }

            return null;
        }

        if (menu === null || menu.get('element') === undefined) {
            menu = createMenu(map, function(key, value) {
                menu = menu.set('map_obj', menu.get('map_obj').set(key, value));
                changeCallback(menu.get('map_obj'));
            }, includedAttributes);
            menu = menu.set('map_obj', map);

            container.appendChild(menu.get('element'));

            return menu;
        } else if (menu.get('map_obj') !== map) {
            if (menu.get('map_obj').get('id') === map.get('id')) {
                // update menu
                menu = updateMenu(menu, map);
                //container.appendChild(menu.get('element'));
                menu = menu.set('map_obj', map);
            } else {
                // remake menu
                try {
                    container.removeChild(menu.get('element'));
                } catch(err) {
                    /* Node not found -- continuing. */
                }
        
                menu = createMenu(map, function(key, value) {
                    menu = menu.set('map_obj', menu.get('map_obj').set(key, value));
                    changeCallback(menu.get('map_obj'));
                }, includedAttributes);
                
                container.appendChild(menu.get('element'));
                menu = menu.set('map_obj', map);
        
                return menu;
            }
        }

        return menu;
    },

    updateSelected: function(refresh, UIRefresh, changeCallbacks, newSelected) {
        var _loadedModel = changeCallbacks.get('loadedModel'),
            loadedModel  = _loadedModel(),
            _savedModels = changeCallbacks.get('savedModels'),
            savedModels  = _savedModels();

        if (newSelected.get('timelag') !== undefined && newSelected.get('coefficient') !== undefined) {
            var coefficient = parseFloat(newSelected.get('coefficient')),
                timelag     = parseInt(newSelected.get('timelag')),
                type        = newSelected.get('type');

            if (isNaN(coefficient) || isNaN(timelag)) {
                console.log('Coefficient:', newSelected.get('coefficient'));
                console.log('Timelag:',     newSelected.get('timelag'));
                return;
            }

            if(newSelected.get('delete') === true) {
                var links = loadedModel.get('links');

                links = links.delete(newSelected.get('id'));
                loadedModel = loadedModel.set('links', links);

                _loadedModel(loadedModel);
                
                refresh();
                return;
            }
            
            _loadedModel(loadedModel.set('links', loadedModel.get('links').set(newSelected.get('id'),
                loadedModel.get('links').get(newSelected.get('id')).merge(Immutable.Map({
                        coefficient: newSelected.get('coefficient'),
                        timelag:     newSelected.get('timelag'),
                        type:        newSelected.get('type')
                    })
                )
            )));
        } else if (newSelected.get('offsetY') !== undefined || newSelected.get('offsetX') !== undefined) {
            _loadedModel(loadedModel.set('settings', newSelected));
        } else {
            var nodeData = loadedModel.get('nodeData'),
                nodeGui  = loadedModel.get('nodeGui'),
                node     = null;

            if(newSelected.get('delete') === true) {
                node = nodeGui.get(newSelected.get('id'));
                var links = loadedModel.get('links');

                if(node.get('links') !== undefined){
                    node.get('links').forEach(function(link) {
                        links = links.delete(link);
                    });
                }

                nodeData = nodeData.delete(newSelected.get('id'));
                nodeGui  = nodeGui.delete(newSelected.get('id'));

                loadedModel = loadedModel.set('nodeData', nodeData);
                loadedModel = loadedModel.set('nodeGui', nodeGui);
                loadedModel = loadedModel.set('links', links);

                _loadedModel(loadedModel);

                refresh();

                return;
            }

            node = nodeData.get(newSelected.get('id'));
            node = node.merge(Immutable.Map({
                id:             newSelected.get('id'),
                value:          newSelected.get('value'),
                relativeChange: newSelected.get('relativeChange'),
                description:    newSelected.get('description'),
                type:           newSelected.get('type'),
                timeTable:      newSelected.get('timeTable')
            }));

            nodeData = nodeData.set(node.get('id'), node);
            loadedModel = loadedModel.set('nodeData', nodeData);

            node = nodeGui.get(newSelected.get('id'));
            node = node.merge(Immutable.Map({
                radius: newSelected.get('radius'),
                avatar: newSelected.get('avatar'),
                icon:   newSelected.get('icon')
            }));

            nodeGui = nodeGui.set(node.get('id'), node);
            loadedModel = loadedModel.set('nodeGui', nodeGui);

            _loadedModel(loadedModel);
        }

        if(savedModels.get('synced').get(loadedModel.get('id')) !== undefined) {
            _savedModels(savedModels.set('synced',
                savedModels.get('synced').set(loadedModel.get('id'),
                    loadedModel.set('settings', loadedModel.get('settings').set('saved',
                        false)
                    )
                )
            ));
        } else {
            _savedModels(savedModels.set('local',
                savedModels.get('local').set(loadedModel.get('id'),
                    loadedModel.set('settings', loadedModel.get('settings').set('saved',
                        false)
                    )
                )
            ));
        }

        //UIRefresh();
        refresh();
    }
};

module.exports = namespace;