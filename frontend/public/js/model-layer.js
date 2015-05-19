"use strict";

var Model       = require("./model.js"),
    network     = require("./network"),
    menuBuilder = require("./menu_builder");

function ModelLayer() {
    if(!(this instanceof ModelLayer)) {
        throw new Error("ModelLayer called as a generic method.");
    }

    this.localIds = 0;

    this.localModels = [];
    this.models = {};
    this.selected = null;
}

ModelLayer.prototype = {
    addModel: function(model) {

    },

    createModel: function() {
        var model = new Model();

        model.setId(this.localIds);
        this.localIds += 1;

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
        network.getData("/models/all", function(response, error) {
            var index = 0;
            that.localModels.forEach(function(model) {
                callback(model, index);
                index++;
            });

            if(error) {
                if(onEnd && typeof onEnd === "function") {
                    onEnd();
                }
                return;
            }

            var models = response.response.models;
            models.forEach(function(model) {
                if(that.selected.name === model.name && that.selected.syncId === model.id && that.selected.local) {
                    index++;
                    return;
                }

                var modelObject;
                if(!that.models[model.id]) {
                    modelObject = that.createSyncModel(model);
                } else {
                    modelObject = that.models[model.id];
                }

                callback(modelObject, index);
                index++;
            });

            if(onEnd && typeof onEnd === "function") {
                onEnd();
            }
        });
    },

    getNextId: function(callback) {
        network.getData("/models/next-id", function() {
            var id = response.response;
            callback(id);
        });
    },

    getModel: function(id) {

    },

    select: function(model, state) {
        if(model instanceof Model) {
            this.selected = model;
        } else if(typeof model === "string") {
            var check = model.match(/^local:(\d+)$/);
            if(isNaN(parseInt(model)) && check !== null) {
                return this.select(this.localModels[parseInt(check[1])]);
            } else if(parseInt(model) !== null) {
                this.loadSyncModel(this.models[model], state);
                return this.select(this.models[model]);
            } else {
                throw new Error("Invalid param given to modelLayer.select");
            }
        }

        return model;
    },

    loadSyncModel: function(model, state) {
        var that = this;
        network.getData("/models/" + model.syncId, function(response, error) {
            if(error) {
                console.log(error);
                return;
            }

            var nodes = response.response.nodes;
            var links = response.response.links;

            var loadedModel = that.selected;
            loadedModel.nextId = 0;

            loadedModel.nodeData = Immutable.Map();
            loadedModel.nodeGui  = Immutable.Map();
            loadedModel.links    = Immutable.Map();

            var lookUp = {};
            nodes.forEach(function(node) {
                var id = loadedModel.generateId();
                loadedModel.setData(Immutable.Map({
                    id: node.id,
                    value: node.starting_value,
                    relativeChange: 0,
                    simulateChange: 0,
                    type: node.type
                }));

                loadedModel.setGui(Immutable.Map({
                    id: node.id,
                    x: node.x,
                    y: node.y,
                    radius: node.radius
                }));

                lookUp[node.id] = id;
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
            });

            state.refresh();
        });
    }
};

module.exports = new ModelLayer();