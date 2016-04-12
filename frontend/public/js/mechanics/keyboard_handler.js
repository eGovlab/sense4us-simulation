'use strict';

module.exports = function(container, canvas, loadedModel, hotkeys) {
    var lookupTable = {};
    hotkeys.forEach(function(hotkey) {
        if(!lookupTable[hotkey.keyCode]) {
            lookupTable[hotkey.keyCode] = [];
        }

        lookupTable[hotkey.keyCode].push(hotkey);
    });

    container.addEventListener('keydown', function(evt) {
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