'use strict';

var Immutable   = null,
    menuBuilder = require('./../menu_builder'),
    settings    = require('./../settings'),
    buttons     = require('./buttons.js');

var objectHelper = require('./../object-helper.js');

var CONFIG      = require('./../config.js');

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
    avatarDiv.value = url + avatar.src;
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

    addTimeRow: function(timeStep, timeValue) {
        if(!this.timetable) {
            this.timetable = {};
        }

        var containerDiv = this.timetableDiv;
        if(!containerDiv) {
            var containerDiv = menuBuilder.div();
                containerDiv.className = 'mb-time-table';

            containerDiv.appendChild(menuBuilder.label(key));

            this.timetableDiv = containerDiv;
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
        timeStepLabel.className = 'label';

        var timeStepInput = menuBuilder.input('time-step', timeStep, function(input, newStep) {
            if(newStep.match(/^\d+$/) === null) {
                timeStepInput.value = timeStep;
                return;
            }

            var storingValue = that.timetable[timeStep];
            if(that.timetable[newStep]) {
                return timeStepInput.value = timeStep;
            }

            that.timetable[newStep] = that.timetable[timeStep];
            delete that.timetable[timeStep];
            that.rows[newStep] = that.rows[timeStep];
            delete that.rows[timeStep];

            timeStepInput.value = newStep;

            that.refreshTimeTable();

            that.loadedModel.refresh = true;
            that.loadedModel.resetUI = true;
            that.loadedModel.propagate();
        });

        timeStepInput.className = 'time-step';

        var timeValueLabel = menuBuilder.span('C');
        timeValueLabel.className = 'label';

        var timeValueInput = menuBuilder.input('time-value', timeValue, function(input, newValue) {
            if(newValue.match(/^\d+\.?\d*$/) === null) {
                timeValueInput.value = that.timetable[timeStep];
                return;
            }

            that.timetable[timeStep] = Number(newValue);
            timeValueInput.value     = newValue;

            that.loadedModel.refresh = true;
            that.loadedModel.resetUI = true;
            that.loadedModel.propagate();
        });

        timeValueInput.className = 'time-value';

        rowDiv.appendChild(timeStepLabel);
        rowDiv.appendChild(timeStepInput);
        rowDiv.appendChild(timeValueLabel);
        rowDiv.appendChild(timeValueInput);

        var percentLabel = menuBuilder.span('%');
        percentLabel.className = 'label';

        rowDiv.appendChild(percentLabel);

        rowDiv.stepInput  = timeStepInput;
        rowDiv.valueInput = timeValueInput;

        rowContainer.appendChild(rowDiv);
    },

    refreshTimeTable: function() {
        if(!this.rowContainer) {
            return;
        }

        while(this.rowContainer.firstChild) {
            this.rowContainer.removeChild(this.rowContainer.firstChild);
        }

        this.deleteEvents();

        this.rows = {};

        this.timetable.forEach(function(timeValue, timeStep) {
            this.addTimeRow(timeStep, timeValue);
        }, this);
    },

    generateTimeTable: function(key, value, header) {
        var containerDiv = this.timetableDiv;
        if(!containerDiv) {
            var containerDiv = menuBuilder.div();
                containerDiv.className = 'mb-time-table';

            containerDiv.appendChild(menuBuilder.label(header || key));

            this.timetableDiv = containerDiv;
        } else {
            while(this.timetableDiv.firstChild) {
                this.timetableDiv.removeChild(this.timetableDiv.firstChild);
            }

            this.timetableDiv.appendChild(menuBuilder.label(header || key));

            this.rows.forEach(function(row, key) {
                row.stepInput.deleteEvents();
                row.valueInput.deleteEvents();
            });

            this.rows = {};

            this.rowContainer = null;
        }

        var rowContainer = this.rowContainer;
        if(!rowContainer) {
            rowContainer      = menuBuilder.div('row-container');
            this.rowContainer = rowContainer;

            containerDiv.appendChild(rowContainer);
        }

        this.timetable = value;
        objectHelper.forEach.call(
            this.timetable,
            function(timeValue, timeStep) {
                this.addTimeRow(timeStep, timeValue);
            },
            this
        );

        var that = this;
        containerDiv.appendChild(menuBuilder.button('Add row', function addTimeTableRow() {
            if (that.timetable === undefined || that.timetable === null) {
                that.addTimeRow(0, 0);
            } else {
                var highestIndex = 0;
                objectHelper.forEach.call(
                    that.timetable,
                    function(value, key) {
                        var x;
                        if(!isNaN(x = parseInt(key)) && x > highestIndex) {
                            highestIndex = x;
                        }
                    }
                );

                var index = highestIndex + 1;
                var value = 0;
                that.timetable[index] = value;
                that.addTimeRow(index, value);

                that.loadedModel.refresh = true;
                that.loadedModel.resetUI = true;
                that.loadedModel.propagate();
            }
        }));

        containerDiv.appendChild(menuBuilder.button('Remove row', function removeTimeTableRow() {
            if (that.timetable === undefined || that.timetable === null || that.timetable.size() === 0) {
                return;
            }

            that.data[key] = that.timetable.slice(0, -1);
            that.timetable = that.data[key];

            var element = that.rows.last();
            that.rowContainer.removeChild(element);

            delete that.rows[that.rows.lastKey()];

            that.loadedModel.refresh = true;
            that.loadedModel.resetUI = true;
            that.loadedModel.propagate();
        }));

        return containerDiv;
    },

    generateDropdown: function(key, options, value) {
        var that = this;
        var containerSelect = menuBuilder.select(key, function(evt) {
            that.data[key] = this.value;

            that.loadedModel.refresh = true;
            that.loadedModel.propagate();
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

                that.loadedModel.refresh = true;
                that.loadedModel.resetUI = true;
                that.loadedModel.propagate();
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
                that.loadedModel.refresh = true;
                that.loadedModel.propagate();
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

                    that.loadedModel.refresh = true;
                    that.loadedModel.resetUI = true;
                    that.loadedModel.propagate();
                });

                element.appendChild(button);
            }, this);
        }

        objectHelper.forEach.call(this.data, function(value, key) {
            if(this.filter.indexOf(key) === -1) {
                return;
            }

            if (key === 'timeTable') {
                element.appendChild(this.generateTimeTable(key, value));
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
