"use strict";

module.exports = function(config) {
    config.set({
        browsers:   ["PhantomJS_custom"],
        singleRun:  true,
        basePath:   "./",
        frameworks: ["mocha", "chai"],

        customLaunchers: {
            "PhantomJS_custom": {
                base: "PhantomJS",
                options: {
                    settings: {
                        webSecurityEnabled: false
                    }
                }
            }
        },

        files: [
            "frontend/public/static/js/model-builder.debug.js",
            "test/unit/model/*.spec.js"
        ]
    });
}