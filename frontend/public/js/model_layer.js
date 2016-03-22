'use strict';

/*
** Dependencies
*/
var backendApi      = require('./api/backend_api.js'),
    Immutable       = null,
    breakout        = require('./breakout.js'),
    notificationBar = require('./notification_bar'),
    Scenario        = require('./scenario').Scenario,
    TimeTable       = require('./scenario').TimeTable,
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
            this.changed[key] = true;
            /*if(key === "scenarios") {
                console.log("Setting: ["+key+"]: " + newValue);
                console.log(new Error().stack);
            }*/
            
            this["_"+key]     = newValue;
        }});
    });
}

function Model(id, data) {
    this.changed    = {};
    this.timestamps = {};

    this.id          = id;
    this.syncId      = false;
    this.saved       = false;
    this.synced      = false;
    this.syncId      = null;

    this.nextId      = -1;
    this.nodeData    = {};
    this.nodeGui     = {};
    this.links       = {};

    this.selected        = false;
    this.environment     = "modelling";
    this.sidebar         = settings.sidebar;
    this.floatingWindows = [];
    this.refresh         = false;
    this.resetUI         = false;

    this.settings = {
        name:          "New Model",
        //maxIterations: 4,
        offsetX:       0,
        offsetY:       0,
        zoom:          1,
        linegraph:     false

        //timeStepT:     "Week",
        //timeStepN:     0
    };

    this.treeSettings = {
        x:      400,
        y:      20,
        width:  200,
        height: 0,
        scroll: 0
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

    console.log(this);
}

Model.prototype = {
    listeners:   {},
    generateId: function() {
        this.nextId++;

        return this.nextId;
    },

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

    moveModel: function(model) {
        var newModel = this.newModel();

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

        return newModel;
    },

    saveModel: function(loadedModel, onDone) {
        var data = {
            modelId:   loadedModel.settings.syncId,
            settings:  loadedModel.settings,
            nodes:     breakout.nodes(loadedModel),
            links:     breakout.links(loadedModel),
            scenarios: loadedModel.scenariosToJson()
        };

        backendApi('/models/save', data, function(response, err) {
            if (err) {
                console.log(response);
                console.log(err);
                //notificationBar.notify("Couldn't save model: " + (response.errors || "null"));
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

            if(response.response.message) {
                notificationBar.notify(response.response.message);
            } else {
                notificationBar.notify('Model['+loadedModel.settings.name+'] saved.');
            }

            } catch(e) {
                console.log(e);
                throw e;
            }

            onDone();
        });
    },

    deleteModel: function(loadedModel, savedModels, callback) {
        var that = this;
        var modelId = loadedModel.syncId;
        if(loadedModel.syncId !== null && loadedModel.syncId !== undefined) {
            backendApi('/models/' + loadedModel.syncId, {}, function(response, err) {
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

                notificationBar.notify(response.response.message);
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
            newState.scenarios = {};
                    /*name:          "New Model",
                    maxIterations: 4,
                    offsetX:       0,
                    offsetY:       0,
                    zoom:          1,
                    linegraph:     false,

                    timeStepT:     "Week",
                    timeStepN:     0*/
            newState.settings = {
                name:          settings.name,
                offsetX:       settings.pan_offset_x,
                offsetY:       settings.pan_offset_y,
                zoom:          settings.zoom
            };

            nodes.forEach(function(node) {
                newState.nodeData[node.id] = {
                    id:             node.id,
                    syncId:         node.id,
                    name:           node.name,
                    description:    node.description,
                    type:           node.type,
                    simulateChange: 0,
                    links:          []
                };

                newState.nodeGui[node.id]  = {
                    id:         node.id,
                    syncId:     node.id,
                    radius:     node.radius,
                    x:          node.x,
                    y:          node.y,
                    avatar:     node.avatar,
                    graphColor: node.color
                };
            });

            links.forEach(function(link) {
                if(!link.downstream || !link.upstream) {
                    notificationBar.notify("Model with id " + modelId + " is corrupt. Its id is loaded and may be deleted from running 'Delete current'. Otherwise, contact sysadmin.", 10000);
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
                    type:        link.type || "fullchannel",
                    width:       8
                };

                newState.nodeData[link.downstream].links.push(link.id);
                newState.nodeData[link.upstream].links.push(link.id);
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
            });

            var timetableLookup = {};
            timetables.forEach(function(timetable) {
                var node = newState.nodeData[timetable.node];
                var newTimetable = new TimeTable(node, function() {
                    newState.refresh = true;
                    newState.resetUI = true;
                    newState.propagate();
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

            callback(newState);
        });
    }
};
