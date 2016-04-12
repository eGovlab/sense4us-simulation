'use strict';

var curry   = require('./../strict_curry.js'),
    CONFIG  = require('./../config.js');

module.exports = curry(require('./../network'), CONFIG.get('url'));