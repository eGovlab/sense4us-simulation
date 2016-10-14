"use strict";

var fs     = require("fs"),
    CONFIG = require("rh_config-parser");

CONFIG.setConfig(__dirname + "/config.json");

function traverseDir(path) {
    var files = {
        "/": []
    };
    if(path.charAt(path.length - 1) !== "/") {
        path = path + "/";
    }

    var foundFiles = fs.readdirSync(path);

    foundFiles.forEach(function(file) {
        var stats = fs.statSync(path + file);
        if(stats.isDirectory()) {
            return files[file] = traverseDir(path + file);
        }

        files["/"].push(file);
    });

    return files;
}

function treeToStrings(tree) {
    var strings = [];
    Object.keys(tree).forEach(function(dir) {
        var files = tree[dir];

        if(!files.forEach) {
            var subDirFiles = treeToStrings(files);
            subDirFiles = subDirFiles.map(function(file) {
                return dir + "/" + file;
            });

            return strings = strings.concat(subDirFiles);
        }
        
        files.forEach(function(file) {
            strings.push(file);
        });
    });

    return strings;
}

module.exports = function(grunt) {
    var root = __dirname + "/frontend/js/";

    var tree              = traverseDir(root);
    var browserifyModules = treeToStrings(tree);

    browserifyModules = browserifyModules.map(function(str){return root + str + ":" + str;});

    var sassFiles = {};
    sassFiles[CONFIG.get("SASS", "dst") + "/model-builder.css"] = CONFIG.get("SASS", "src") + "/model-builder.scss";

    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),
        uglify: {
            options: {
                banner: "/*! <%= pkg.name %> <%= grunt.template.today(\"yyyy-mm-dd\") %> */\n"
            },

            build: {
                src:  "frontend/public/static/js/debug/model-builder.debug.js",
                dest: "frontend/public/static/js/model-builder.min.js"
            }
        },

        browserify: {
            /*options: {
                require: browserifyModules
            },*/

            client: {
                src:  ["./frontend/js/main.js"],
                dest: "./frontend/public/static/js/debug/model-builder.debug.js"
            },
        },

        watch: {
            scripts: {
                files: ["./frontend/js/**/*.js", "./frontend/js/**/*.jsdoc"],
                tasks: ["eslint", "browserify_debug", "jsdoc"]
            }
        },

        eslint: {
            options: {
                format: require("eslint-tap"),
                parserOptions: {
                    ecmaVersion: 6,
                    ecmaFeatures: {
                        impliedStrict: true
                    }
                },

                rules: {
                    "comma-dangle":   "error",
                    "eqeqeq":         ["error", "smart"],
                    "curly":          "error",
                    "quotes":         ["error", "single"],
                    "no-else-return": "error",
                    "dot-notation":   "error"
                }
            },
            target: ["./frontend/js/**/*.js"]
        },

        sass: {
            options: {
                outputStyle: "compressed"
            },

            dist: {
                files: sassFiles
            }
        },

        jsdoc: {
            dist: {
                src: [
                    "./frontend/js/**/*.js",   "./frontend/js/**/*.jsdoc",
                    "./frontend/controllers/**/*.js", "./frontend/controllers/**/*.jsdoc",
                    "./frontend/docs/**/*.jsdoc"
                ],

                dest: "./frontend/public/docs",

                options: {
                    tags: {
                        "allowUnknownTags": true,
                        "dictionaries":     ["jsdoc", "closure"]
                    },

                    templates: {
                        "systemName":        "Sense4us Server",
                        "theme":             "flatly",
                        "linenums":          "true",
                        "outputSourceFiles": "false",
                        "outputSourcePath":  "false"
                    }
                }
            }
        },

        karma: {
            unit: {
                configFile: "./karma.conf.js"
            }
        }
    });

    grunt.loadNpmTasks("grunt-eslint");
    grunt.loadNpmTasks("grunt-karma");
    grunt.loadNpmTasks("grunt-browserify");
    grunt.loadNpmTasks("grunt-contrib-uglify");
    grunt.loadNpmTasks("grunt-contrib-watch");
    grunt.loadNpmTasks("grunt-jsdoc");
    grunt.loadNpmTasks("grunt-sass");

    grunt.registerTask("browserify_debug", function() {
        var browserifyConfig = grunt.config.get("browserify");
        if(!browserifyConfig.options) {
            browserifyConfig.options = {};
        }
        
        browserifyConfig.options.browserifyOptions = {
            debug: true
        };

        grunt.config.set("browserify", browserifyConfig);
        grunt.task.run("browserify");
    });

    grunt.registerTask("default", [
        "eslint",
        "browserify_debug",
        "sass"
    ]);
};
