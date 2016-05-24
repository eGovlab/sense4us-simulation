'use strict';

// a function to generate a function which has predefined parameters
function strictCurry(fn) {
    // arguments are all arguments used to call the strictCurry-function
    // it's not an array, so we can't splice it
    // but by using apply we can use the Array's splice-function
    // to get all arguments after the first one (which is the function to be curried)
    var predefinedArguments = Array.prototype.splice.call(arguments, 1);

    // the curried function!
    return function() {
        // we must first get the additional arguments, again we have to splice them
        // though from zero this time, since we want to use all inserted arguments
        var newArguments = Array.prototype.splice.call(arguments, 0);

        // the predefined arguments together with the new ones
        var allArguments = predefinedArguments.concat(newArguments);

        // we call the function with all the arguments
        return fn.apply(this, allArguments);
    };
}

module.exports = strictCurry;