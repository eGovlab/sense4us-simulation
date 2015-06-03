'use strict';

var Immutable   = require('Immutable'),
    menuBuilder = require('./../menu_builder'),
    settings    = require('./../settings'),
    buttons     = require('./buttons.js');

function createButtons(list, model, onChangeCallback) {
    var containerDiv = menuBuilder.div();
    containerDiv.className = 'menu';

    list.forEach(function(button) {
        containerDiv.appendChild(menuBuilder.button(button.get('header'), function() {
            onChangeCallback(button.get('callback')(model));
        }));
    });

    return containerDiv;
};

function createAvatarSelector(header, value, callback) {
    var containerDiv = menuBuilder.div(),
        labelDiv     = menuBuilder.div(),
        avatarsDiv   = menuBuilder.div();
    
    avatarsDiv.className = 'avatars';

    labelDiv.appendChild(menuBuilder.label(header));
    
    settings.avatars.forEach(function(avatar) {
        var avatarDiv = menuBuilder.div();
        var img = menuBuilder.img();
        
        avatarDiv.className = 'avatarPreview';
        
        if (value === avatar.src) {
            avatarDiv.className += ' selected';
        }
    
        img.src = avatar.src;
        avatarDiv.value = avatar.src;
        avatarDiv.name = header;
        
        menuBuilder.addValueCallback(avatarDiv, callback, 'click');
        
        avatarDiv.appendChild(img);
        avatarsDiv.appendChild(avatarDiv);
    });

    containerDiv.appendChild(labelDiv);
    containerDiv.appendChild(avatarsDiv);

    return containerDiv;
};

function createMenu(map, onChangeCallback) {
    var menu = Immutable.Map({
        element: menuBuilder.div()
    });

    menu.get('element').className = 'menu';
    menu.get('element').appendChild(createButtons(buttons, map, onChangeCallback));

    map.forEach(function(value, key) {
        var containerDiv = menuBuilder.div(),
            inputDiv     = menuBuilder.div();

        if(key === 'avatar' || key === 'icon') {
            containerDiv = createAvatarSelector(key, value, function(inputKey, inputValue) {
                onChangeCallback(map.set(inputKey, inputValue));
            });
        } else {
            var labelDiv = menuBuilder.div();
            labelDiv.appendChild(menuBuilder.label(key));
            inputDiv.appendChild(menuBuilder.input(key, value, function(inputKey, inputValue) {
                onChangeCallback(map.set(inputKey, inputValue));
            }));

            containerDiv.appendChild(labelDiv);
            containerDiv.appendChild(inputDiv);
        }

        menu.get('element').appendChild(containerDiv);
    });

    return menu;
}

var namespace = {
    drawSelectedMenu: function(container, menu, map, changeCallback) {
        if (map === null || map === undefined) {
            if (menu !== null) {
                container.removeChild(menu.get('element'));
            }

            return null;
        }

        if (menu === null || menu.get('element') === undefined) {
            menu = createMenu(map, changeCallback);
            menu = menu.set('map_obj', map);

            container.appendChild(menu.get('element'));

            return menu;
        } else if (menu.get('map_obj') !== map) {
            try {
                container.removeChild(menu.get('element'));
            } catch(err) {
                /* Node not found -- continuing. */
            }

            menu = createMenu(map, changeCallback);
            container.appendChild(menu.get('element'));
            menu = menu.set('map_obj', map);

            return menu;
        }

        console.log(menu);

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
                console.log('LINK');
                console.log(newSelected);
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
        } else if (newSelected.get('maxIterable') !== undefined) {
            _loadedModel(loadedModel.set('settings', newSelected));
        } else {
            if(newSelected.get('delete') === true) {
                console.log('NODE');

                var seq = newSelected.get('links').toSeq();
                seq.forEach(function(linkId) {
                    console.log(linkId);
                });
                return;
            }

            var nodeData = loadedModel.get('nodeData'),
                nodeGui  = loadedModel.get('nodeGui'),
                node     = nodeData.get(newSelected.get('id'));

            node = node.merge(Immutable.Map({
                id:             newSelected.get('id'),
                value:          newSelected.get('value'),
                relativeChange: newSelected.get('relativeChange'),
                description:    newSelected.get('description')
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

        UIRefresh();
        refresh();
    }
};

module.exports = namespace;