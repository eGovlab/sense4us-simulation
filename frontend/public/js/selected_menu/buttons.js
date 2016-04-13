'use strict';

var objectHelper = require('./../object-helper');

module.exports = [
    {
        header: 'Delete selected',
        ignoreModelSettings: true,
        replacingObj:        true,
        callback: function(loadedModel, selectedData) {
            loadedModel.emit('deleteSelected');
        }
    }
];
