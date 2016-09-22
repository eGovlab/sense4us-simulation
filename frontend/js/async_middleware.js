function asyncMiddleware() {
    var parameters = Array.apply(null, arguments);
    return function middleware() {
        var callbacks      = [],
            errorCallbacks = [];

        for(var i = 0; i < arguments.length; i++) {
            if(typeof arguments[i] !== 'function') {
                throw 'Not a function given to asyncMiddleware';
            }

            if(arguments[i].length === parameters.length + 1) {
                callbacks.push(arguments[i]);
            } else if(arguments[i].length === parameters.length + 2) {
                errorCallbacks.push(arguments[i]);
            } else {
                console.error(arguments[i].length, parameters, parameters.length);
                throw 'Invalid amount of parameters to middleware.';
            }
        }

        return function() {
            var iterator    = -1,
                errIterator = -1;
            var next = function(err) {
                if(err) {
                    errIterator++;
                    iterator = parameters.length;
                    return errorCallbacks[errIterator].apply(null, [err].concat(parameters));
                }

                iterator++;
                if(iterator >= callbacks.length) {
                    return;
                }

                var callback = callbacks[iterator];
                if(callback.length === parameters.length + 1) {
                    return callback.apply(null, parameters.concat(next));
                }
            };

            next();
        }
    };
}

module.exports = asyncMiddleware;