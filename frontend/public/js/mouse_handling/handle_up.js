'use strict';

var middleware = require('./../middleware.js'),
	hitTest      = require('./../collisions.js').hitTest,
	linker       = require('./../linker.js'),
	Immutable    = require('Immutable'),
	modelLayer   = require('./../model_layer.js');

var mouseDownWare = middleware([
	link,
	//stopClicked,
	stopLinking,
	stopMovingIcon,
	deselect,
	select
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

		var selectedNodes = data.nodeGui.filter(function(node) {
			return node.get('clicked');
		});

		doubleTap = selectedNodes;
		return data;
	}

	data.nodeGui = data.nodeGui.merge(doubleTap.map(function(node) {
		return node.set('selected', true);
	}));

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

function deselect(data) {
    data.nodeGui = data.nodeGui.merge(
        data.nodeGui.
            filter(function(node) { return node.get('selected') === true && !node.get('clicked'); }).
            map(function(node)    { return node.delete('selected').delete('offsetX').delete('offsetY'); })
    );

    data.links = data.links.merge(
        data.links.
            filter(function(node) { return node.get('selected') === true && !node.get('clicked'); }).
            map(function(node)    { return node.delete('selected').delete('offsetX').delete('offsetY'); })
    );

    return data;
}

module.exports = mouseDownWare;