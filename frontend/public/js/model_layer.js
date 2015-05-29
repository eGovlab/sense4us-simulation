'use strict';

var Model       = require('./model.js'),
    network     = require('./network'),
    menuBuilder = require('./menu_builder');

module.exports = {
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
    
    loadSyncModel: function(modelId, callback) {
        var that = this;
        network.getData('/models/' + modelId, function(response, error) {
            if (error) {
                console.log(error);
                return;
            }

            var nodes = response.response.nodes;
            var links = response.response.links;

            var newState = Immutable.Map();
            newState = newState.set('nextId', nodes[nodes.length - 1].id + 1);

            newState = newState.set('nodeData',Immutable.Map());
            newState = newState.set('nodeGui', Immutable.Map());
            newState = newState.set('links',   Immutable.Map());

            var lookUp = {};
            nodes.forEach(function(node) {
                newState = newState.set('nodeData',
                    newState.get('nodeData').set(node.id, Immutable.Map({
                        id: node.id,
                        value: node.starting_value,
                        relativeChange: node.change_value || 0,
                        simulateChange: 0,
                        type: node.type
                    })
                ));

                newState = newState.set('nodeGui',
                    newState.get('nodeGui').set(node.id, Immutable.Map({
                        id: node.id,
                        x: node.x,
                        y: node.y,
                        radius: node.radius
                    })
                ));
            });

            links.forEach(function(link) {
                newState = newState.set('links',
                    newState.get('links').set(link.id,
                        Immutable.Map({
                            id: link.id,
                            node1: link.from_node,
                            node2: link.to_node,
                            coefficient: link.threshold,
                            type: link.type,
                            timelag: link.timelag,
                            width: 14
                        })
                    )
                );

                var fromNode = newState.get('nodeGui').get(link.from_node);
                if(fromNode.get('links') === undefined) {
                    fromNode = fromNode.set('links', Immutable.List());
                }
                newState = newState.set('nodeGui',
                    newState.get('nodeGui').set(link.from_node, 
                        fromNode.set('links',
                            fromNode.get('links').merge(
                                Immutable.List([link.id])
                            )
                        )
                    )
                );

                var toNode = newState.get('nodeGui').get(link.to_node);
                if(toNode.get('links') === undefined) {
                    toNode = toNode.set('links', Immutable.List());
                }
                newState = newState.set('nodeGui',
                    newState.get('nodeGui').set(link.to_node, 
                        toNode.set('links',
                            toNode.get('links').merge(
                                Immutable.List([link.id])
                            )
                        )
                    )
                );
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