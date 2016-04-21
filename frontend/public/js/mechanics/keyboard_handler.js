'use strict';

module.exports = function(container, canvas, loadedModel, hotkeys) {
    var lookupTable = {};
    hotkeys.forEach(function(hotkey) {
        if(!lookupTable[hotkey.keyCode]) {
            lookupTable[hotkey.keyCode] = [];
        }

        lookupTable[hotkey.keyCode].push(hotkey);
    });

    var SHIFT = 16,
        CTRL  = 17,
        ALT   = 18,
        ALTGR = 225;

    if(!loadedModel.static.modifiers) {
        loadedModel.static.modifiers = [];
    }

    container.addEventListener('keydown', function(evt) {
        if(loadedModel.static.modifiers.indexOf(ALTGR) !== -1) {
            console.log(evt.keyCode);
        }

        switch(evt.keyCode) {
            case CTRL:
                loadedModel.static.modifiers.push(CTRL);
                break;
            case ALT:
                loadedModel.static.modifiers.push(ALT);
                break;
            case ALTGR:
                loadedModel.static.modifiers.push(ALTGR);
                break;
            case SHIFT:
                loadedModel.static.modifiers.push(SHIFT);
                break;
        }

        if(window.sense4us.lastTarget !== canvas) {
            return;
        }

        if(!lookupTable[evt.keyCode]) {
            return true;
        }

        lookupTable[evt.keyCode].forEach(function(hotkey) {
            if(!hotkey.onDown || typeof hotkey.onDown !== 'function') {
                return;
            }

            hotkey.onDown(canvas, loadedModel, evt);
        });

        //evt.preventDefault();
        //return false;
    });

    container.addEventListener('keyup', function(evt) {
        switch(evt.keyCode) {
            case CTRL:
                var index = loadedModel.static.modifiers.indexOf(CTRL);
                loadedModel.static.modifiers.splice(index, 1);
                break;
            case ALT:
                var index = loadedModel.static.modifiers.indexOf(ALT);
                loadedModel.static.modifiers.splice(index, 1);
                break;
            case ALTGR:
                var index = loadedModel.static.modifiers.indexOf(ALTGR);
                loadedModel.static.modifiers.splice(index, 1);
                break;
            case SHIFT:
                var index = loadedModel.static.modifiers.indexOf(SHIFT);
                loadedModel.static.modifiers.splice(index, 1);
                break;
        }

        if(window.sense4us.lastTarget !== canvas) {
            return;
        }

        if(!lookupTable[evt.keyCode]) {
            return true;
        }

        lookupTable[evt.keyCode].forEach(function(hotkey) {
            if(!hotkey.onUp || typeof hotkey.onUp !== 'function') {
                return;
            }

            hotkey.onUp(canvas, loadedModel, evt);
        });

        //evt.preventDefault();
        //return false;
    });
};
