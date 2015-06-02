'use strict';

var Model           = require('./model.js'),
    network         = require('./network'),
    Immutable       = require('Immutable'),
    breakout        = require('./breakout.js'),
    notificationBar = require('./notification_bar'),
    menuBuilder     = require('./menu_builder');

var generateId = 0;

module.exports = {
    newModel: function(id) {
        var map = Immutable.Map({
            id:       id || generateId,
            saved:    false,
            synced:   false,
            syncId:   null,

            nextId:   0,
            nodeData: Immutable.Map({}),
            nodeGui:  Immutable.Map({}),
            links:    Immutable.Map({}),
            settings: Immutable.Map({
                name:     "New Model",
                maxIterable: 0
            })
        });

        generateId += 1;

        return map;
    },

    saveModel: function(_loadedModel, refresh) {
        var loadedModel = _loadedModel();
        var data = {
            modelId: loadedModel.get('syncId'),
            model:   loadedModel.get('settings').get('name'),
            nodes:   breakout.nodes(loadedModel),
            links:   breakout.links(loadedModel)
        };

        network.postData('/models/save', data, function(response, err) {
            if (err) {
                console.log(response);
                return;
            }

            loadedModel = loadedModel.set('syncId', response.response.id);
            loadedModel = loadedModel.set('settings', loadedModel.get('settings').set('saved', true));
            _loadedModel(loadedModel);

            notificationBar.notify('Model['+loadedModel.get('settings').get('name')+'] saved.');
            refresh();
        });
    },

    deleteModel: function(_loadedModel, _savedModels, refresh) {
        var savedModels = _savedModels(),
            loadedModel = _loadedModel(),
            that        = this;

        if(loadedModel.get('synced') === true && (loadedModel.get('syncId') !== null && loadedModel.get('syncId') !== undefined)) {
            network.deleteData('/models/' + loadedModel.get('syncId'), {}, function(response, err) {
                if(err) {
                    console.log(response);
                    console.log(err);
                    return;
                }

                savedModels = savedModels.set('synced', savedModels.get('synced').delete(loadedModel.get('syncId')));
                loadedModel = savedModels.get('local').first();

                if(loadedModel === undefined) {
                    loadedModel = that.newModel();
                }

                notificationBar.notify(response.response.message);
                _savedModels(savedModels);
                _loadedModel(loadedModel);
                refresh();
            });
        } else {
            savedModels = savedModels.set('local', savedModels.get('local').delete(loadedModel.get('id')));
            loadedModel = this.newModel();

            _savedModels(savedModels);
            _loadedModel(loadedModel);
            refresh();
        }
    },
    
    loadSyncModel: function(modelId, callback) {
        var that = this;
        network.getData('/models/' + modelId, function(response, error) {
            if (error) {
                console.log(error);
                return;
            }

            var nodes    = response.response.nodes,
                links    = response.response.links,
                name     = response.response.name,
                iterable = response.response.maxIterable


            var nextId = 0;
            nodes.forEach(function() {
                nextId += 1;
            });
            links.forEach(function() {
                nextId += 1;
            });

            var newState = that.newModel();
            newState = newState.merge(Immutable.Map({
                syncId: response.response.id,
                nextId: nextId,
                synced: true
            }));
            var s = newState.get('settings');
            s = s.merge(Immutable.Map({
                name:        name,
                maxIterable: iterable,
                saved:       true
            }));
            newState = newState.set('settings', s);

            nodes.forEach(function(node) {
                var nd = newState.get('nodeData').set(node.id, Immutable.Map({
                    id:             node.id,
                    value:          node.starting_value,
                    relativeChange: node.change_value || 0,
                    simulateChange: 0,
                    type:           node.type
                }));
                newState = newState.set('nodeData', nd);

                var ng = newState.get('nodeGui').set(node.id, Immutable.Map({
                    id:     node.id,
                    x:      node.x,
                    y:      node.y,
                    radius: node.radius,
                    links:  Immutable.List()
                }));
                newState = newState.set('nodeGui', ng);
            });

            links.forEach(function(link) {
                var l = newState.get('links').set(link.id, Immutable.Map({
                    id:          link.id,
                    node1:       link.from_node,
                    node2:       link.to_node,
                    coefficient: link.threshold,
                    type:        link.type,
                    timelag:     link.timelag,
                    width:       14
                }));

                newState = newState.set('links', l);

                var ng1 = newState.get('nodeGui').get(link.from_node);
                ng1 = ng1.set('links', ng1.get('links').push(link.id));

                var ng2 = newState.get('nodeGui').get(link.to_node);
                ng2 = ng2.set('links', ng2.get('links').push(link.id));

                var ng = newState.get('nodeGui');
                ng = ng.set(link.from_node, ng1);
                ng = ng.set(link.to_node, ng2);

                newState = newState.set('nodeGui', ng);
            });

            callback(newState);
        });
    }
};

/*function ModelLayer() {
    if (!(this instanceof ModelLayer)) {
        throw new Error('ModelLayer called as a generic method.');
    }

    this.localModels = [];
    this.models = {};
    this.selected = null;
}

ModelLayer.prototype = {
    addModel: function(model) {

    },

    deleteModel: function(model) {
        if (model && model instanceof Model) {
            this.localModels = this.localModels.filter(function(m) {
                if (model.id === m.id) {
                    return false;
                }

                return true;
            });

            if (this.models[model.id]) {
                this.models[model.id] = null;
            }
        } else if (model && (typeof model === 'number' || typeof model === 'string')) {
            if (typeof model === 'string') {
                var check = model.match(/^local:(\d+)$/);
                if (isNaN(parseInt(model)) && check !== null) {
                    model = check[1];
                } else if (!isNaN(parseInt(model))) {
                    model = parseInt(model);
                } else {
                    throw new Error('Invalid ID given to deleteModel.');
                }
            }

            this.localModels = this.localModels.filter(function(m) {
                if (model === m.id) {
                    return false;
                }

                return true;
            });

            if (this.models[model]) {
                this.models[model] = null;
            }
        }

        this.localModels = this.localModels.map(function(m, i) {
            m.id = i;
            return m;
        });
    },

    reselect: function() {
        if (this.localModels.length > 0) {
            this.select(this.localModels[0]);
        } else {
            var m = this.createModel();
            this.select(m);
        }
    },

    createModel: function() {
        var model = new Model();

        model.setId(this.localModels.length);

        this.localModels.push(model);

        return model;
    },

    createSyncModel: function(data) {
        var model = new Model();

        model.name   = data.name;
        model.id     = data.id;
        model.syncId = data.id;
        model.synced = true;

        model.option = menuBuilder.option(model.getId(), model.name);

        this.models[data.id] = model;

        return model;
    },

    iterateModels: function(callback, onEnd) {
        var that = this;
        network.getData('/models/all', function(response, error) {
            var index = 0;
            that.localModels.forEach(function(model) {
                callback(model, index);
                index++;
            });

            if (error) {
                if (onEnd && typeof onEnd === 'function') {
                    onEnd();
                }
                return;
            }

            var models = response.response.models;
            models.forEach(function(model) {
                var check = that.localModels.filter(function(m) {
                    if (model.name === m.name) {
                        return true;
                    }

                    return false;
                });

                if (check.length > 0) {
                    index++;
                    return;
                }

                var modelObject;
                if (!that.models[model.id]) {
                    modelObject = that.createSyncModel(model);
                } else {
                    modelObject = that.models[model.id];
                }

                callback(modelObject, index);
                index++;
            });

            if (onEnd && typeof onEnd === 'function') {
                onEnd();
            }
        });
    },

    getNextId: function(callback) {
        network.getData('/models/next-id', function() {
            var id = response.response;
            callback(id);
        });
    },

    getModel: function(id) {

    },

    select: function(model, state) {
        if (model instanceof Model) {
            this.selected = model;
        } else if (typeof model === 'string') {
            var check = model.match(/^local:(\d+)$/);
            if (isNaN(parseInt(model)) && check !== null) {
                return this.select(this.localModels[parseInt(check[1])]);
            } else if (parseInt(model) !== null) {
                this.loadSyncModel(this.models[model], state);
                return this.select(this.models[model]);
            } else {
                throw new Error('Invalid param given to modelLayer.select');
            }
        } else {
            throw new Error('Invalid param given to modelLayer.select');
        }

        return model;
    },

    loadSyncModel: function(model, state) {
        var that = this;
        network.getData('/models/' + model.syncId, function(response, error) {
            if (error) {
                console.log(error);
                return;
            }

            var nodes = response.response.nodes;
            var links = response.response.links;

            var loadedModel = that.selected;
            loadedModel.nextId = nodes[nodes.length - 1].id + 1;

            loadedModel.nodeData = Immutable.Map();
            loadedModel.nodeGui  = Immutable.Map();
            loadedModel.links    = Immutable.Map();

            var lookUp = {};
            nodes.forEach(function(node) {
                loadedModel.setData(Immutable.Map({
                    id: node.id,
                    value: node.starting_value,
                    relativeChange: node.change_value || 0,
                    simulateChange: 0,
                    type: node.type
                }));

                loadedModel.setGui(Immutable.Map({
                    id: node.id,
                    x: node.x,
                    y: node.y,
                    radius: node.radius
                }));
            });

            links.forEach(function(link) {
                loadedModel.setLink(Immutable.Map({
                    id: link.id,
                    node1: link.from_node,
                    node2: link.to_node,
                    coefficient: link.threshold,
                    type: link.type,
                    timelag: link.timelag,
                    width: 14
                }));

                loadedModel.setGui(loadedModel.nodeGui.get(link.from_node).merge(
                    Immutable.Map({
                        links: Immutable.List().push(link.id)
                    })
                ));

                loadedModel.setGui(loadedModel.nodeGui.get(link.to_node).merge(
                    Immutable.Map({
                        links: Immutable.List().push(link.id)
                    })
                ));
            });

            state.refresh();
        });
    }
};

module.exports = new ModelLayer();*/