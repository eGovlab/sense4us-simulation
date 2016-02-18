'use strict';

/*
** Dependencies
*/
var backendApi      = require('./api/backend_api.js'),
    Immutable       = null,
    breakout        = require('./breakout.js'),
    notificationBar = require('./notification_bar'),
    menuBuilder     = require('./menu_builder');
    
var settings = require('./settings');

/*
** Used to generate a local and incremential ID to avoid collisions for models.
*/
var generateId = -1;

/*
** Said namespace.
** Methods exposed:
**     name:        newModel()
**     params:      id
**     description: The argument given may override the above local variable generateId.
**                  Only for advance usage.
**     returns:     An immutable map with data relevant to a model. See method for data.

**     name:        saveModel()
**     params:      loadedModelCallback, refreshCallback
**     description: This method will run AJAX and should not be expected to
**                  return anything at runtime.
**                  The refreshCallback will be called at AJAX completion.
**                  The loadedModelCallback should return a map with a model if called
**                  without parameters. If called with one argument, it should replace
**                  the model with the argument.
**                  This method will try to save a model on a remote server using the backendApi
**                  dependency above. If successful, will notify the user with notificationBar.

**     name:        deleteModel()
**     params:      loadedModelCallback, savedModelsCallback, refreshCallback
**     description: This method will run AJAX and should not be expected to
**                  return anything at runtime.
**                  The refreshCallback will be called at AJAX completion.
**                  The loadedModelCallback should return a map with a model if called
**                  without parameters. If called with one argument, it should replace
**                  the model with the argument.
**                  The savedModelsCallback should return a map with saved models if called
**                  without parameters. If called with one argument, it should replace
**                  the map with the argument. See /js/main.js for structure.
**                  This method will try to delete the model from a remote server if it exists,
**                  if not, only delete it from the local savedModels map. It will also load the
**                  first local model from savedModels, or if there is none, create a new one.

**     name:        loadSyncModel()
**     params:      id, onDoneCallback
**     description: This method will run AJAX and should not be expected to
**                  return anything at runtime.
**                  The AJAX will try to fetch a model with given id argument from a remote server.
**                  If successful, will setup a new model map.
**     returns:     Will call onDoneCallback with the remote models data in a map similar to
**                  newModel as the only argument.
*/

function definePropagations(obj, keys) {
    keys.forEach(function(key) {
        Object.defineProperty(obj, key, {get: function() {
            return this["_"+key];
        }, set: function(newValue) {
            //console.log("Setting: ["+key+"]: " + newValue);
            //console.log(new Error().stack);
            this.changed[key]    = true;
            this["_"+key] = newValue;
        }});
    });
}

function Model(id, data) {
    this.changed    = {};
    this.timestamps = {};

    this.id          = id;
    this.saved       = false;
    this.synced      = false;
    this.syncId      = null;

    this.nextId      = 0;
    this.nodeData    = {};
    this.nodeGui     = {};
    this.links       = {};

    this.selected        = false;
    this.environment     = "modelling";
    this.sidebar         = settings.sidebar;
    this.floatingWindows = undefined;
    this.refresh         = false;
    this.resetUI         = false;

    this.settings = {
        name:          "New Model",
        maxIterations: 4,
        offsetX:       0,
        offsetY:       0,
        zoom:          1,
        linegraph:     false,

        timeStepT:     "Week",
        timeStepN:     0
    };

    this.treeSettings = {
        x:      400,
        y:      20,
        width:  200,
        height: 0,
        scroll: 0
    };

    this.loadedScenario = 0;
    this.scenarios      = [];

    if(data) {
        Object.keys(data).forEach(function(key) {
            this[key] = data[key];
        }, this);
    }
}

Model.prototype = {
    listeners:   {},
    addListener: function(key, listener) {
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
    },

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

        validListeners.forEach(function(listener) {
            listener.call(this);
        }, this);

        this.changed = {};
    }
};

definePropagations(Model.prototype, [
    "id",
    "environment",
    "sidebar",
    "refresh",
    "floatingWindows",
    "resetUI",
    "saved",
    "synced",
    "syncId",
    "nextId",
    "selected",
    "nodeData",
    "nodeGui",
    "links",
    "settings",
    "treeSettings",
    "loadedScenario",
    "scenarios"
]);

module.exports = {
    newModel: function(data) {
        generateId++;
        return new Model(generateId, data);
    },

    saveModel: function(loadedModel, refresh) {
        var data = {
            modelId:  loadedModel.syncId,
            settings: loadedModel.settings,
            nodes:    breakout.nodes(loadedModel),
            links:    breakout.links(loadedModel)
        };

        console.log(data);
        backendApi('/models/save', data, function(response, err) {
            if (err) {
                console.log(response);
                notificationBar.notify("Couldn't save model: " + response.errors);
                return;
            }

            loadedModel.synced         = true;
            loadedModel.syncId         = response.response.id;
            loadedModel.settings.saved = true;

            /*loadedModel = loadedModel.set('syncId',   response.response.id);
            loadedModel = loadedModel.set('settings', loadedModel.settings.set('saved', true));
            _loadedModel(loadedModel);*/

            if(response.response.message) {
                notificationBar.notify(response.response.message);
            } else {
                notificationBar.notify('Model['+loadedModel.settings.name+'] saved.');
            }
        });
    },

    deleteModel: function(loadedModel, savedModels, callback) {
        var that = this;
        if(loadedModel.synced === true && (loadedModel.syncId !== null && loadedModel.syncId !== undefined)) {
            backendApi('/models/bundle/' + loadedModel.syncId, {}, function(response, err) {
                if(err) {
                    console.log(response);
                    console.log(err);
                    return;
                }

                delete savedModels.local[loadedModel.id];
                delete savedModels.synced[loadedModel.syncId];
                var firstLocal = savedModels.local.first();

                console.log(savedModels.local, firstLocal);
                if(firstLocal === undefined) {
                    firstLocal = that.newModel();
                }

                firstLocal.forEach(function(value, key) {
                    loadedModel[key] = value;
                });

                notificationBar.notify(response.response);
                callback();
            }, "DELETE");
        } else {
            delete savedModels.local[loadedModel.id];
            var newModel = this.newModel();
            newModel.forEach(function(value, key) {
                loadedModel[key] = value;
            });

            callback();
        }
    },
    
    loadSyncModel: function(modelId, callback) {
        var that = this;
        backendApi('/models/bundle/' + modelId, function(response, error) {
            if (error) {
                console.log(response);
                console.log(error);
                return;
            }

            var nodes    = response.response.nodes,
                links    = response.response.links,
                settings = response.response.settings

            var highestId = 0;
            //var nextId = 0;
            nodes.forEach(function(n) {
                if(n.id > highestId) {
                    highestId = n.id;
                }
            });

            links.forEach(function(l) {
                if(l.id > highestId) {
                    highestId = l.id;
                }
            });

            var newState = that.newModel();
            newState.syncId = response.response.id;
            newState.nextId = highestId + 1;
            newState.synced = true;

            settings.forEach(function(value, key) {
                newState.settings[key] = value;
            });

            nodes.forEach(function(node) {
                var newNode = {
                    id:             node.id,
                    value:          node.starting_value,
                    relativeChange: node.change_value   || 0,
                    simulateChange: [],
                    threshold:      node.threshold      || 0,
                    type:           node.type,
                    name:           node.name           || "",
                    description:    node.description    || "",
                    timeTable:      {}
                };

                if(node.timeTable) {
                    newNode.timeTable = node.timeTable;
                }

                newState.nodeData[node.id] = newNode;

                var ng = {
                    id:     node.id,
                    x:      parseInt(node.x),
                    y:      parseInt(node.y),
                    radius: parseFloat(node.radius),
                    links:  [],
                    avatar: node.avatar,
                    icon:   node.icon,
                    color:  node.color || undefined
                };

                newState.nodeGui[node.id] = ng;
            });

            links.forEach(function(link) {
                var l = {
                    id:          link.id,
                    node1:       link.upstream,
                    node2:       link.downstream,
                    coefficient: link.coefficient,
                    threshold:   link.threshold,
                    type:        link.type,
                    timelag:     link.timelag,
                    width:       8
                };

                newState.links[link.id] = l;

                newState.nodeGui[link.upstream].links.push(link.id);
                newState.nodeGui[link.downstream].links.push(link.id);
            });

            callback(newState);
        });
    }
};
