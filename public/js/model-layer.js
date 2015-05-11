"use strict";

var Model       = require("./model.js"),
    network     = require("./network/network_layer.js"),
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

    select: function(model) {
        if(model instanceof Model) {
            this.selected = model;
        } else if(typeof model === "string") {
            var check = model.match(/^local:(\d+)$/);
            if(isNaN(parseInt(model)) && check !== null) {
                return this.select(this.localModels[parseInt(check[1])]);
            } else if(parseInt(model) !== null) {
                return this.select(this.models[model]);
            } else {
                throw new Error("Invalid param given to modelLayer.select");
            }
        }

        return model;
    },

    loadModel: function(){}
};

module.exports = new ModelLayer();