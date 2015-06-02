'use strict';

module.exports = {
    nodes: function(model) {
        var dd = model.get('nodeData').toJSON(),
            dg = model.get('nodeGui').toJSON(),
            allNodes = [];

        Object.keys(dd).forEach(function(_dd_id) {
            if (!dg[_dd_id]) {
                return;
            }

            var obj = dd[_dd_id];
            Object.keys(dg[_dd_id]).forEach(function(_dg_property) {
                obj[_dg_property] = dg[_dd_id][_dg_property];
            });

            allNodes.push(obj);
        });

        return allNodes;
    },

    links: function(model) {
        var links = model.get('links').toJSON(),
            allLinks = [];

        Object.keys(links).forEach(function(key) {
            allLinks.push(links[key]);
        });

        return allLinks;
    }
};