'use strict';

var Immutable   = null,
    menuBuilder = require('./../menu_builder'),
    settings    = require('./../settings'),
    buttons     = require('./buttons.js');

var objectHelper = require('./../object-helper.js');
var TimeTable    = require('./../structures/timetable.js');
var CONFIG       = require('./../config.js');

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
    avatarDiv.value = avatar.src;
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
                    that.loadedModel.nodeGui[that.data.id].links = [];

                    /*that.loadedModel.refresh = true;
                    that.loadedModel.resetUI = true;
                    that.loadedModel.propagate();*/
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
