'use strict';

/*
** Author:      Robin Swenson
** Description: Namespace to create local maps containing general data for a model.
**              Uses AJAX to save and load models from remote server.
*/


/*
** Dependencies
*/
var Model           = require('./model.js'),
    network         = require('./network'),
    Immutable       = require('Immutable'),
    breakout        = require('./breakout.js'),
    notificationBar = require('./notification_bar'),
    menuBuilder     = require('./menu_builder');

/*
** Used to generate a local and incremential ID to avoid collisions for models.
*/
var generateId = 0;

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
**                  This method will try to save a model on a remote server using the network
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
                notificationBar.notify("Couldn't save model: " + response.errors);
                return;
            }

            loadedModel = loadedModel.set('syncId',   response.response.id);
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
                console.log(response);
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