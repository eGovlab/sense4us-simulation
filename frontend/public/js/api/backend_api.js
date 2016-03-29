'use strict';

var curry   = require('./../strict_curry.js'),
    CONFIG  = require('rh_config-parser');

module.exports = curry(require('./../network'), CONFIG.get('url'));