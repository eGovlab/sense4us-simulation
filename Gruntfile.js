"use strict";

var fs = require("fs");

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
    var root = __dirname + "/frontend/public/js/";

    var tree              = traverseDir(root);
    var browserifyModules = treeToStrings(tree);

    browserifyModules = browserifyModules.map(function(str){return root + str + ":" + str;});

    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),
        uglify: {
            options: {
                banner: "/*! <%= pkg.name %> <%= grunt.template.today(\"yyyy-mm-dd\") %> */\n"
            },

            build: {
                src:  "frontend/public/static/js/model-builder.debug.js",
                dest: "frontend/public/static/js/model-builder.min.js"
            }
        },

        browserify: {
            options: {
                require: browserifyModules
            },

            client: {
                src:  ["./frontend/public/js/main.js"],
                dest: "./frontend/public/static/js/model-builder.debug.js"
            }
        },

        watch: {
            scripts: {
                files: ["./frontend/public/js/**/*.js"],
                tasks: ["eslint", "browserify_debug"]
            }
        },

        eslint: {
            options: {
                format: require("eslint-tap"),
                parserOptions: {
                    ecmaVersion: 5,
                    ecmaFeatures: {
                        impliedStrict: true
                    }
                },

                rules: {
                    "comma-dangle":   "error",
                    "eqeqeq":         ["error", "smart"],
                    "curly":          "error",
                    "quotes":         ["error", "single"],
                    "no-console":     ["error", {allow: ["warn", "error"]}],
                    "no-else-return": "error",
                    "dot-notation":   "error"
                }
            },
            target: ["./frontend/public/js/**/*.js"]
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

    grunt.registerTask("browserify_debug", function() {
        var browserifyConfig = grunt.config.get("browserify");
        browserifyConfig.options.browserifyOptions = {
            debug: true
        };

        grunt.config.set("browserify", browserifyConfig);
        grunt.task.run("browserify");
    });

    grunt.registerTask("default", [
        "eslint",
        "browserify",
        "uglify"
    ]);
};
