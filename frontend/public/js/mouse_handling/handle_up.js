'use strict';

var middleware = require('./../middleware.js'),
	hitTest      = require('./../collisions.js').hitTest,
	linker       = require('./../linker.js'),
	Immutable    = require('Immutable'),
	modelLayer   = require('./../model_layer.js');

var mouseDownWare = middleware([
	link,
	select,
	stopClicked,
	stopLinking,
	stopMovingIcon
]);

function stopClicked(data) {
	data.nodeGui = data.nodeGui.merge(
			data.nodeGui.filter(function(obj) { return obj.get('clicked') === true; })
				.map(function(obj) { return obj.delete('clicked').delete('offsetX').delete('offsetY'); })
	);

	return data;
}

var doubleTap      = false,
	doubleTapTimer = false;
function select(data, error, done) {
	if(doubleTap === false) {
		if(doubleTapTimer === false) {
			doubleTapTimer = setTimeout(function() {
				doubleTap      = false;
				doubleTapTimer = false;
			}, 200);
		}

		doubleTap = true;
		return data;
	}
    // if we click on a icon we want to start moving it!
    collidedNodes = data.nodeGui.
        filter(function(node) { return node.get('icon') !== undefined && hitTest(data.pos, icon(node)); }).
        slice(-1).
        map(function(node) {
            return node.concat({
                movingIcon: true,
                selected: true
            });
         });
    data.nodeGui = data.nodeGui.merge(collidedNodes);

    if (collidedNodes.size > 0) {
        return done(data);
    }
    
    // but if we click on the node, we want to move the actual node
    var collidedNodes = data.nodeGui.
        filter(function(node) { return hitTest(node, data.pos); }).
        slice(-1).
        map(function(node) {
            return node.concat({
                offsetX: data.pos.get('x') - (node.get('x') || 0),
                offsetY: data.pos.get('y') - (node.get('y') || 0),
                clicked: true,
                selected: true
            });
         });
    data.nodeGui = data.nodeGui.merge(collidedNodes);

    if (collidedNodes.size > 0) {
        return done(data);
    }

    // if we didn't click any nodes, we check if we clicked any links
    var collidedLinks = data.links.
        filter(function(link) { return hitTest(aggregatedLink(link, data.nodeGui), data.pos); }).
        slice(-1).
        map(function(link) {
            return link.concat({
                offsetX: data.pos.get('x') - (link.get('x') || 0),
                offsetY: data.pos.get('y') - (link.get('y') || 0),
                clicked: true,
                selected: true
            });
         })
    data.links = data.links.merge(collidedLinks);

    if (collidedLinks.size > 0) {
        return done(data);
    }

    return data;
}

function link(data) {
	data.nodeGui
		.filter(function(node) { return node.get('linking') === true; })
		.forEach(function(node) {
			var hit = data.nodeGui.filter(function(maybeCollidingNode) {
				return maybeCollidingNode.get('linking') !== true && hitTest(maybeCollidingNode, linker(node));
			}).slice(-1);

			hit = hit.forEach(function(collided) {
				var id;
				if(data.nextId !== undefined) {
					id = data.nextId
					data.nextId += 1;
				} else {
					id = data.links.size;
				}

				var nodeLinks = node.get('links');
				if(nodeLinks === undefined) {
					node = node.set('links', Immutable.List());
				}

				var collidedLinks = collided.get('links');
				if(collidedLinks === undefined) {
					collided = collided.set('links', Immutable.List());
				}

				var nodeId     = node.get('id'),
					collidedId = collided.get('id');

				data.nodeGui = data.nodeGui.set(nodeId, data.nodeGui.get(nodeId).merge(Immutable.Map({
						links: node.get('links').push(id)
					})
				)).set(collidedId, data.nodeGui.get(collidedId).merge(Immutable.Map({
						links: collided.get('links').push(id)
					})
				));

				data.links = data.links.set(id, Immutable.Map({
					id: id,
					node1:       node.get('id'),
					node2:       collided.get('id'),
					coefficient: 1,
					type:        'fullchannel',
					timelag:     0,
					width:       14
				}));
			});
		});

	return data;
}

function stopLinking(data) {
	data.nodeGui = data.nodeGui.merge(
		data.nodeGui
		.filter(function(node) { return node.get('linking') === true; })
		.map(function(node) {
			return node.delete('linkerX').delete('linkerY').delete('linking');
		})
	);

	return data;
}

function stopMovingIcon(data) {
	data.nodeGui = data.nodeGui.merge(
		data.nodeGui
		.filter(function(node) { return node.get('movingIcon') === true; })
		.map(function(node) {
			return node.delete('movingIcon');
		})
	);

	return data;
}

module.exports = mouseDownWare;