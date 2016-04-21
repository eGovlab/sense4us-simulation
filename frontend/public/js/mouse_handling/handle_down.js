'use strict';

var middleware     = require('./../middleware.js'),
    pointRect      = require('./../collisions.js').pointRect,
    hitTest        = require('./../collisions.js').hitTest,
    linker         = require('./../linker.js'),
    aggregatedLink = require('./../aggregated_link.js'),
    icon           = require('../icon');

var objectHelper   = require('./../object-helper.js');

var mouseDownWare = middleware([
    startLinkingIfSelected,
    startMovingIconIfSelected,
    clickAndMove
]);

function clickAndMove(data, error, done, env) {
    var previouslyClickedNodes = objectHelper.filter.call(
        data.nodeGui,
        function(node) {
            return node.clicked;
        }
    );

    previouslyClickedNodes = objectHelper.map.call(
        previouslyClickedNodes,
        function(node) {
            delete node.clicked;
            return node;
        }
    );

    var previouslyClickedLinks = objectHelper.filter.call(
        data.links, function(link) {
            return link.clicked;
        }
    );

    previouslyClickedLinks = objectHelper.map.call(
        previouslyClickedLinks,
        function(link) {
            delete link.clicked;
            return link;
        }
    );

    data.nodeGui = objectHelper.merge.call(data.nodeGui, previouslyClickedNodes);
    data.links   = objectHelper.merge.call(data.links,   previouslyClickedLinks);

    /*// if we click on a icon we want to start moving it!
    var collidedNodes = data.nodeGui.
        filter(function(node) { return node.icon !== undefined && hitTest(data.pos, icon(node)); }).
        slice(-1).
        map(function(node) {
            return node.concat({
                movingIcon: true
            });
         });
    data.nodeGui = data.nodeGui.merge(collidedNodes);

    if (objectHelper.size.call(collidedNodes) > 0) {
        return done(data);
    }*/
    
    // but if we click on the node, we want to move the actual node
    var collidedNodes = objectHelper.filter.call(
        data.nodeGui,
        function(node) {
            return hitTest(node, data.pos);
        }
    );

    collidedNodes = objectHelper.slice.call(collidedNodes, -1);
    collidedNodes = objectHelper.map.call(
        collidedNodes,
        function(node) {
            node = objectHelper.merge.call(node, {
                offsetX:   data.pos.x - (node.x || 0),
                offsetY:   data.pos.y - (node.y || 0),
                clicked:   true
            });

            return node;
         }
    );

    data.nodeGui = objectHelper.merge.call(data.nodeGui, collidedNodes);

    if (Object.keys(collidedNodes).length > 0) {
        return done(data);
    }

    // if we didn't click any nodes, we check if we clicked any links

    var collidedLinks = objectHelper.filter.call(
        data.links,
        function(link) {
            return hitTest(aggregatedLink(link, data.nodeGui), data.pos);
        }
    );

    collidedLinks = objectHelper.slice.call(collidedLinks, -1);
    collidedLinks = objectHelper.map.call(
        collidedLinks,
        function(link) {
            return objectHelper.merge.call(
                link,
                {
                    offsetX:  data.pos.x - (link.x || 0),
                    offsetY:  data.pos.y - (link.y || 0),
                    clicked:  true
                }
            );
        }
    );

    data.links = objectHelper.merge.call(data.links, collidedLinks);

    if (Object.keys(collidedLinks).length > 0) {
        return done(data);
    }

    if(data.env !== 'simulate') {
        return data;
    }

    // If we didn't hit any links, look for clicked origin tables.

    var collidedTables = objectHelper.filter.call(
        data.nodeGui,
        function(node) {
            var w = node.tableWidth,
                h = node.tableHeight;

            var x = node.x - node.radius - w - 8,
                y = node.y - (h / 2);

            return pointRect(data.pos, {x: x, y: y, width: w, height: h});
        }
    );


    collidedTables = objectHelper.map.call(
        collidedTables,
        function(node) {
            return node.concat({
                offsetX: data.pos.x - (node.x || 0),
                offsetY: data.pos.y - (node.y || 0),
                clicked: true
            });
        }
    );

    data.nodeGui = objectHelper.merge.call(data.nodeGui, collidedTables);

    if (objectHelper.size.call(collidedTables) > 0) {
        return done(data);
    }

    return data;
}

function startLinkingIfSelected(data, error, done) {
    // if a node is selected and we click the linker-symbol, then start linking!
	var linkingNodes = objectHelper.filter.call(
        data.nodeGui,
        function(node) {
            return node.selected === true;
        }
    );

    linkingNodes = objectHelper.filter.call(
        linkingNodes,
		function(node) {
            return hitTest(data.pos, linker(node));
        }
    );

    linkingNodes = objectHelper.map.call(
		linkingNodes,
        function(node) {
            node.linking = true;
            return node;
        }
    );

	data.nodeGui = objectHelper.merge.call(data.nodeGui, linkingNodes);

    // if we started to link a node, we use the done-function
    // otherwise it'd go to the next mousehandling-function
    // and try to select something instead
	if (objectHelper.size.call(linkingNodes) > 0) {
		return done(data);
	}

	return data;
}

function startMovingIconIfSelected(data, error, done) {
    // if we have a node selected and we aren't linking and we click an icon, then start moving the icon!
	var movingIconNodes = objectHelper.filter.call(
        data.nodeGui,
		function(node) {
            return node.selected === true && node.linking !== true && node.icon !== undefined;
        }
    );

    movingIconNodes = objectHelper.filter.call(
        movingIconNodes,
		function(node) {
            return hitTest(data.pos, icon(node));
        }
    );
	
    movingIconNodes = objectHelper.map.call(
        movingIconNodes,
        function(node) {
            return node.set('movingIcon', true);
        }
    );

	data.nodeGui = objectHelper.merge.call(data.nodeGui, movingIconNodes);

    // if we started to move a node, we use the done-function
    // otherwise it'd go to the next mousehandling-function
    // and try to select something instead
	if (objectHelper.size.call(movingIconNodes) > 0) {
		return done(data);
	}
    
	return data;
}

module.exports = mouseDownWare;
