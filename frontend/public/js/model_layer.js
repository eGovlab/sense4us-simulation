'use strict';

/**
 * @file Model helper methods
 * @author {@link https://github.com/Rhineheart Robin Swenson}
 */

var network         = require('./network'),
    Immutable       = null,
    breakout        = require('./breakout.js'),
    Scenario        = require('./scenario').Scenario,
    TimeTable       = require('./structures/timetable.js'),
    menuBuilder     = require('./menu_builder'),
    Promise         = require('promise');

var createNode = require('./structures/create_node.js'),
    createLink = require('./structures/create_link.js');

var objectHelper = require('./object-helper');
    
var settings = require('./settings');

// Used to generate a local and incremential ID to avoid collisions for models.
var generateId = -1;

// Not used anymore, I think.
function definePropagations(obj, keys) {
    keys.forEach(function(key) {
        Object.defineProperty(obj, key, {get: function() {
            return this['_'+key];
        }, set: function(newValue) {
            this.changed[key] = true;
            /*if(key === 'scenarios') {
                console.log('Setting: ['+key+']: ' + newValue);
                console.log(new Error().stack);
            }*/
            
            this['_'+key]     = newValue;
        }});
    });
}

/**
 * Model layer for model related helper methods.
 * @module models
 */

/**
 * @description Model constructor
 * @see {@link model/Model}
 *
 * @param {integer} id
 * @param {object} data
 */ 


function Model(id, data) {
    this.changed     = {};
    this.timestamps  = {};

    this.id          = id;
    this.syncId      = false;
    this.saved       = false;
    this.synced      = false;
    this.syncId      = null;

    this.nextId      = -1;
    this.nodeData    = {};
    this.nodeGui     = {};
    this.links       = {};

    this.historyLength   = 0;
    this.history         = [];
    this.revertedHistory = [];

    this.selected        = false;
    this.environment     = 'modelling';
    this.sidebar         = settings.sidebar;
    this.floatingWindows = [];
    this.refresh         = false;
    this.resetUI         = false;

    this.settings = {
        name:          'New Model',
        //maxIterations: 4,
        offsetX:       0,
        offsetY:       0,
        zoom:          1,
        linegraph:     false,
        objectId:      'modelSettings'

        //timeStepT:     'Week',
        //timeStepN:     0
    };

    this.scenarios      = {};
    var __ = new Scenario(this);
    this.scenarios[__.id] = __;
    this.loadedScenario = __;

    if(data) {
        Object.keys(data).forEach(function(key) {
            this[key] = data[key];
        }, this);
    }

    this.objectId = 'model';
}

function getAllModels(callback) {
    var userFilter = this.CONFIG.userFilter,
        url        = this.CONFIG.url;

    return new Promise(function(fulfill, reject) {
        network(url, '/models/' + userFilter + '/all', function(response, error) {
            if(error || response.status !== 200) {
                return reject(error, response);
            }

            fulfill(response.response);
        });
    });
}

Model.prototype = {
    pushHistory: function(data) {
        if(!data.action) {
            return;
        }

        this.history.push(data);
        this.revertedHistory = [];
    },

    undo: function() {
        if(this.history.length === 0) {
            return;
        }

        var lastAction = this.history.splice(this.history.length - 1, 1)[0];
        this.revertedHistory.push(lastAction);

        switch(lastAction.action.toUpperCase()) {
            case 'NEWNODE':
                var data = lastAction.data;
                this.emit(data.data.id, 'deleteNode');
                break;
            case 'NEWLINK':
                var link = lastAction.data.link;
                this.emit(link.id, 'deleteLink');
                break;

            case 'DELETENODE':
                var data = lastAction.data;
                this.nodeData[data.data.id] = data.data;
                this.nodeGui[data.gui.id]   = data.gui;

                data.links.forEach(function(l) {
                    this.nodeGui[l.node1].links.push(l.id);
                    this.nodeGui[l.node2].links.push(l.id);

                    this.links[l.id] = l;
                }, this);

                break;

            case 'DELETELINK':
                var link = lastAction.data.link;
                this.links[link.id] = link;

                this.nodeGui[link.node1].links.push(link.id);
                this.nodeGui[link.node2].links.push(link.id);
                break;
        }

        this.selected = false;
        this.emit(null, 'selected', 'refresh', 'resetUI');
    },

    createNode: function(name) {
        createNode(this, {name: name}, {}, 'template');
    },

    redo: function() {
        if(this.revertedHistory.length === 0) {
            return;
        }

        var lastAction = this.revertedHistory.splice(this.revertedHistory.length - 1, 1)[0];
        this.history.push(lastAction);

        switch(lastAction.action.toUpperCase()) {
            case 'NEWNODE':
                var data                    = lastAction.data;
                this.nodeData[data.data.id] = data.data;
                this.nodeGui[data.gui.id]   = data.gui;
                break;
            case 'NEWLINK':
                var link            = lastAction.data.link;
                this.links[link.id] = link;

                this.nodeGui[link.node1].links.push(link.id);
                this.nodeGui[link.node2].links.push(link.id);
                break;

            case 'DELETENODE':
                var data = lastAction.data;
                this.emit(data.data.id, 'deleteNode');
                break;

            case 'DELETELINK':
                var link = lastAction.data.link;
                this.emit(link.id, 'deleteLink');
                break;
        }

        this.selected = false;
        this.emit(null, 'selected', 'refresh', 'resetUI');
    },

    emit: function() {
        if(!this.listeners) {
            return;
        }

        var data;
        var events = [];

        if(arguments.length !== 1) {
            data = arguments[0];
            for(var i = 1; i < arguments.length; i++) {
                var ev = arguments[i];
                if(typeof ev !== 'string') {
                    throw new Error('Listener id must be a string.');
                }

                events.push(ev);
            }
        } else {
            events = [arguments[0]];
        }

        if(!data || !data.forEach) {
            data = [data];
        }

        events.forEach(function(ev) { 
            if(this.listeners[ev]) {
                this.listeners[ev].forEach(function(listener) {
                    listener.apply(this, data.concat([ev]));
                }, this);
            }
        }, this);
    },

    selectNode: function(id, name) {
        if(id !== undefined && name !== undefined) {
            throw new Error('Can\'t select a node from id and name at the same time.');
        }

        if(id !== undefined && this.nodeData[id] !== undefined) {
            var n                     = this.nodeData[id];
            this.nodeGui[id].selected = true;
            this.selected             = n;

            this.emit(null, 'refresh', 'resetUI', 'selected');
            return;
        }

        objectHelper.forEach.call(this.nodeData, function(n) {
            if(n.name === name) {
                this.nodeGui[n.id].selected = true;
                this.selected               = n;

                this.emit(null, 'refresh', 'resetUI', 'selected');
                return false;
            }
        }, this);
    },

    selectNodeById: function(id) {
        this.selectNode(id, undefined);
    },

    selectNodeByName: function(name) {
        this.selectNode(undefined, name);
    },

    getAllModels: getAllModels,

    loadModel: function(id) {
        var that = this;

        var currentId     = id || this.id,
            currentSyncId = id || this.syncId;

        return new Promise(function(fulfill, reject) {
            if(id === undefined || id === null || isNaN(parseInt(id))) {
                reject(new Error('Id must be a valid number.'));
            }

            var cb = function(_id, _syncId, ev) {
                if(_id !== currentId && _syncId !== currentSyncId) {
                    return;
                }

                that.removeListener('modelLoaded',       cb);
                that.removeListener('errorLoadingModel', cb);

                if(ev === 'errorLoadingModel') {
                    return reject();
                }

                fulfill();
            };

            that.addListener('modelLoaded',       cb);
            that.addListener('errorLoadingModel', cb);

            that.emit('storeModel');
            if(id && (typeof id === 'string' || typeof id === 'number')) {
                that.emit([id, id], 'preLoadModel');
                that.emit([id, id], 'loadModel');
                return;
            }

            that.emit([that.id, that.syncId], 'preLoadModel');
            that.emit([that.id, that.syncId], 'loadModel');
        });
    },

    saveModel: function(id) {
        var that = this;

        var currentId     = id || this.id,
            currentSyncId = id || this.syncId;

        return new Promise(function(fulfill, reject) {
            if(id === undefined || id === null || isNaN(parseInt(id))) {
                reject(new Error('Id must be a valid number.'));
            }

            var cb = function(_id, _syncId, ev) {
                if(_id !== currentId && _syncId !== currentSyncId) {
                    return;
                }

                if(ev === 'errorSavingModel') {
                    return reject(id);
                }

                fulfill(id);
            };

            that.addListener('modelSaved', cb);
            if(id && (typeof id === 'string' || typeof id === 'integer')) {
                that.emit([id, id], 'preSaveModel');
                that.emit([id, id], 'saveModel');
                return;
            } 

            that.emit('storeModel');
            that.emit([currentId, currentSyncId], 'preSaveModel');
            that.emit([currentId, currentSyncId], 'saveModel');
        });
    },

    deleteModel: function(id) {
        var that = this;

        var currentId     = id || this.id,
            currentSyncId = id || this.syncId;

        return new Promise(function(fulfill, reject) {
            if(id === undefined || id === null || isNaN(parseInt(id))) {
                reject(new Error('Id must be a valid number.'));
            }

            var cb = function(_id, _syncId, ev) {
                if(_id !== currentId && _syncId !== currentSyncId) {
                    return;
                }

                that.removeListener('modelDeleted', cb);
                if(ev === 'errorDeletingModel') {
                    return reject(id);
                }

                fulfill(id);
            };

            that.addListener('modelDeleted', cb);
            if(id && (typeof id === 'string' || typeof id === 'integer')) {
                that.emit([id, id], 'deleteModel');
                return;
            } 

            that.emit('storeModel');
            that.emit([that.id, that.syncId], 'deleteModel');
        });
    },
    

    generateId: function() {
        this.nextId++;

        return this.nextId;
    },

    addListener: function(key, listener) {
        if(!this.listeners) {
            this.listeners = {};
        }

        if(!this.listeners[key]) {
            this.listeners[key] = [];
        }

        this.listeners[key].push(listener);
    },

    removeListener: function(key, listener) {
        if(!this.listeners[key]) {
            return;
        }

        var index = this.listeners[key].indexOf(listener);
        if(index === -1) {
            console.log('Didn\'t find listener.');
            return;
        }

        this.listeners[key].splice(index, 1);
    },

    removeListeners: function(key) {
        this.listeners[key] = [];
    },

    /*addListener: function(key, listener) {
        if(!Model.prototype.listeners[key]) {
            Model.prototype.listeners[key] = [];
        }

        if(Model.prototype.listeners[key].indexOf(listener) !== -1) {
            return;
        }

        Model.prototype.listeners[key].push(listener);
    },

    removeListener: function(key, listener) {
        if(!Model.prototype.listeners[key]) {
            return;
        }

        Model.prototype.listeners[key] = Model.prototype.listeners[key].filter(function(value){return value !== listener;});
    },

    removeListeners: function(key) {
        Model.prototype.listeners[key] = [];
    },*/

    propagate: function() {
        var validListeners = [];
        Object.keys(this.changed).forEach(function(key) {
            var property = this[key];
            if(!property) {
                return;
            }

            var _l = Model.prototype.listeners[key];
            if(!_l || _l.length === 0) {
                return;
            }

            _l.forEach(function(listener) {
                if(validListeners.indexOf(listener) !== -1) {
                    return;
                }

                validListeners.push(listener);
            });
        }, this);

        this.changed = {};
        validListeners.forEach(function(listener) {
            listener.call(this);
        }, this);
    },

    scenariosToJson: function() {
        var scenarios = [];
        Object.keys(this.scenarios).forEach(function(key) {
            var scenario = this.scenarios[key];
            scenarios.push(scenario.toJson(this));
        }, this);

        return scenarios;
    }
};

/*definePropagations(Model.prototype, [
    'id',
    'environment',
    'sidebar',
    'refresh',
    'floatingWindows',
    'resetUI',
    'saved',
    'synced',
    'syncId',
    'nextId',
    'selected',
    'nodeData',
    'nodeGui',
    'links',
    'settings',
    'treeSettings',
    'loadedScenario',
    'scenarios'
]);*/

module.exports = {
    newModel: function(data) {
        generateId++;
        return new Model(generateId, data);
    },

    moveModel: function(model) {
        var newModel = this.newModel();

        newModel.CONFIG          = model.CONFIG;
        newModel.id              = model.id;
        newModel.environment     = model.environment;
        newModel.sidebar         = model.sidebar;
        newModel.refresh         = false;
        newModel.resetUI         = false;
        newModel.floatingWindows = model.floatingWindows;
        newModel.saved           = model.saved;
        newModel.synced          = model.synced;
        newModel.syncId          = model.syncId;
        newModel.nextId          = model.nextId;
        newModel.selected        = null;
        newModel.nodeData        = model.nodeData;
        newModel.nodeGui         = model.nodeGui;
        newModel.links           = model.links;
        newModel.settings        = model.settings;
        newModel.treeSettings    = model.treeSettings;
        newModel.loadedScenario  = model.loadedScenario;
        newModel.scenarios       = model.scenarios;
        newModel.listeners       = model.listeners;
        newModel.static          = model.static;
        newModel.history         = model.history;

        model.floatingWindows.forEach(function(floatingWindow) {
            floatingWindow.destroyWindow();

            if(floatingWindow.hide) {
                floatingWindow.hide();
            }
        });

        model.floatingWindows = [];
        model.nodeData        = {};
        model.nodeGui         = {};
        model.links           = {};
        model.treeSettings    = {};
        var _                 = new Scenario(model);
        model.scenarios       = {};
        model.scenarios[_.id] = _;
        model.loadedScenario  = _;
        model.settings        = {};

        model.history         = [];

        return newModel;
    },

    getAllModels: function(loadedModel){return getAllModels.call(loadedModel);},

    saveModel: function(url, userFilter, loadedModel, onDone) {
        var data = {
            modelId:   loadedModel.syncId,
            settings:  loadedModel.settings,
            nodes:     breakout.nodes(loadedModel),
            links:     breakout.links(loadedModel),
            scenarios: loadedModel.scenariosToJson()
        };

        network(url, '/models/' + userFilter + '/save', data, function(response, err) {
            if (err) {
                loadedModel.emit('Couldn\'t save model: ' + err.message, 'notification');
                return;
            }

            if(response.status !== 200) {
                loadedModel.emit('Couldn\'t save model: ' + (response.errors || 'null'), 'notification');
                return;
            }

            try {
                loadedModel.synced         = true;
                loadedModel.syncId         = response.response.model.id;
                loadedModel.settings.saved = true;

                var nodes      = response.response.nodes;
                var links      = response.response.links;
                var scenarios  = response.response.scenarios;
                var timetables = response.response.timetables;
                var timesteps  = response.response.timesteps;

                var nodeLookup = {};
                nodes.forEach(function(node) {
                    loadedModel.nodeData[node.id].syncId = node.syncId;
                    loadedModel.nodeGui[node.id].syncId  = node.syncId;

                    nodeLookup[node.syncId] = loadedModel.nodeData[node.id];
                });

                links.forEach(function(link) {
                    loadedModel.links[link.id].syncId = link.syncId;
                });

                var scenarioLookup = {};
                scenarios.forEach(function(scenario) {
                    loadedModel.scenarios[scenario.id].syncId = scenario.syncId;
                    scenarioLookup[scenario.syncId] = loadedModel.scenarios[scenario.id];
                });

                var timetableLookup = {};
                timetables.forEach(function(timetable) {
                    scenarioLookup[timetable.scenario].data[nodeLookup[timetable.node].id].syncId = timetable.syncId;
                    timetableLookup[timetable.syncId] = scenarioLookup[timetable.scenario].data[nodeLookup[timetable.node]];
                });

                /*timesteps.forEach(function(timestep) {
                    timetableLookup[timestep.timetable]
                });*/

                /*loadedModel = loadedModel.set('syncId',   response.response.id);
                loadedModel = loadedModel.set('settings', loadedModel.settings.set('saved', true));
                _loadedModel(loadedModel);*/

                /*if(response.response.message) {
                    loadedModel.emit(response.response.message, 'notification');
                } else {
                    loadedModel.emit('Model['+loadedModel.settings.name+'] saved.', 'notification');
                }*/

            } catch(e) {
                console.error(e);
                throw e;
            }

            onDone();
        });
    },

    deleteModel: function(url, userFilter, modelId, savedModels, callback) {
        var that = this;
        if(savedModels.local[modelId] === undefined) {
            network(url, '/models/' + userFilter + '/' + modelId, {}, function(response, err) {
                if(err) {
                    console.error(response);
                    console.error(err);
                    return;
                }

                //delete savedModels.local[loadedModel.id];
                delete savedModels.synced[modelId];

                callback(response.response.message);
            }, 'DELETE');
        } else {
            delete savedModels.local[modelId];
            callback();
        }
    },
    
    loadSyncModel: function(url, userFilter, modelId, callback) {
        var that = this;
        network(url, '/models/' + userFilter + '/bundle/' + modelId, function(response, error) {
            if (error) {
                console.error(response);
                console.error(error);
                return;
            }

            if(response.status !== 200) {
                if(!response.response) {
                    response.response = {};
                }
                callback(new Error(response.response.message || 'Error loading model'));
                return;
            }

            var settings   = response.response.model,
                nodes      = response.response.nodes,
                links      = response.response.links,
                scenarios  = response.response.scenarios,
                timetables = response.response.timetables,
                timesteps  = response.response.timesteps;

            var newState = that.newModel();
            newState.synced = true;
            newState.syncId = settings.id;
            delete newState.scenarios;

            var highestId = 0;

            newState.scenarios = {};
                    /*name:          'New Model',
                    maxIterations: 4,
                    offsetX:       0,
                    offsetY:       0,
                    zoom:          1,
                    linegraph:     false,

                    timeStepT:     'Week',
                    timeStepN:     0*/
            /*newState.settings = {
                name:          settings.name,
                offsetX:       settings.pan_offset_x,
                offsetY:       settings.pan_offset_y,
                zoom:          settings.zoom
            };*/

            newState.settings.name    = settings.name;
            newState.settings.offsetX = settings.pan_offset_x;
            newState.settings.offsetY = settings.pan_offset_y;
            newState.settings.zoom    = settings.zoom;

            nodes.forEach(function(node) {
                newState.nodeData[node.id] = {
                    id:             node.id,
                    syncId:         node.id,
                    name:           node.name,
                    description:    node.description,
                    type:           node.type,
                    simulateChange: 0,

                    objectId:       'nodeData'
                };

                newState.nodeGui[node.id]  = {
                    id:         node.id,
                    syncId:     node.id,
                    radius:     node.radius,
                    x:          node.x,
                    y:          node.y,
                    avatar:     node.avatar,
                    color:      node.color,
                    links:      [],

                    objectId:   'nodeGui'
                };

                if(highestId < node.id) {
                    highestId = node.id;
                }
            });

            links.forEach(function(link) {
                if(!link.downstream || !link.upstream) {
                    return callback(settings.id);
                }

                newState.links[link.id] = {
                    id:          link.id,
                    syncId:      link.id,
                    coefficient: link.coefficient,
                    node1:       link.upstream,
                    node2:       link.downstream,
                    threshold:   link.threshold,
                    timelag:     link.timelag,
                    type:        link.type || 'fullchannel',
                    width:       8,

                    objectId:    'link'
                };

                newState.nodeGui[link.downstream].links.push(link.id);
                newState.nodeGui[link.upstream].links.push(link.id);

                if(highestId < link.id) {
                    highestId = link.id;
                }
            });

            scenarios.forEach(function(scenario, index) {
                var newScenario = new Scenario(newState);

                newScenario.id                = scenario.id,
                newScenario.syncId            = scenario.id,
                newScenario.name              = scenario.name,
                newScenario.maxIterations     = scenario.max_iterations,
                newScenario.timeStepN         = scenario.timestep_n,
                newScenario.measurement       = scenario.measurement,
                newScenario.measurementAmount = scenario.measurement_amount,

                newState.scenarios[newScenario.id] = newScenario;

                if(index === 0) {
                    newState.loadedScenario = newState.scenarios[scenario.id];
                }

                if(highestId < scenario.id) {
                    highestId = scenario.id;
                }
            });

            var timetableLookup = {};
            timetables.forEach(function(timetable) {
                var node = newState.nodeData[timetable.node];
                var newTimetable = new TimeTable(node, function() {
                    newState.emit(null, 'refresh', 'resetUI');
                    /*newState.refresh = true;
                    newState.resetUI = true;
                    newState.propagate();*/
                });

                timetableLookup[timetable.id] = newTimetable;

                newState.scenarios[timetable.scenario].data[node.id] = newTimetable;
            });

            timesteps.forEach(function(timestep) {
                var timetable = timetableLookup[timestep.timetable];
                if(!timetable.timeTable) {
                    timetable.timeTable = {};
                }

                if(!timetable.node.timeTable) {
                    timetable.node.timeTable = {};
                }
                
                timetable.timeTable[timestep.step]      = timestep.value;
                timetable.node.timeTable[timestep.step] = timestep.value;
            });

            /*timetableLookup.forEach(function(tt) {
                tt.refreshTimeTable();
            });*/

            newState.nextId = ++highestId;

            callback(newState);
        });
    }
};
