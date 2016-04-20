'use strict';

var curry   = require('./../strict_curry.js'),
    CONFIG  = require('./../config.js');

console.log(CONFIG.get('url'));

module.exports = curry(require('./../network'), CONFIG.get('url'));
