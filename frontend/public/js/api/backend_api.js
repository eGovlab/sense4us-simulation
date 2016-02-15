'use strict';

var curry   = require('./../strict_curry.js'),
    CONFIG  = require('rh_config-parser');

CONFIG.setConfig(require('./../config.js'));

module.exports = curry(require('./../network'), CONFIG.get('BACKEND_HOSTNAME'), CONFIG.get('BACKEND_PORT'));