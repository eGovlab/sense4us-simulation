(function(httpCB) {
    "use strict"

    var CONFIG = require("rh_config-parser");
    CONFIG.setConfig(__dirname + "/../config.json");

    Error.stackTraceLimit = CONFIG.get("STACKTRACELENGTH");
    process.on("uncaughtException", function(error) {
        if(error.stack) {
            console.log("Error Stack:", error.stack);
        } else {
            console.log("Error:", error);
        }
        process.abort();
    });

    var _LIB = CONFIG.get("ROOT") + CONFIG.get("LIB") || __dirname + "/../lib/";

    var express          = require("express"),
        cookieParser     = require("cookie-parser"),
        bodyParser       = require("body-parser"),
        ejs              = require("ejs-locals"),
        fs               = require("fs"),
        constants        = require("constants"),
        router           = require("rh_router"),
        logger           = require("rh_logger"),
        fe               = require("rh_fe"),
        CookieCutter     = require("rh_cookie-cutter");

    var _PORT = CONFIG.get("PORT") || 3000;

    logger.setConfig(CONFIG.get("LOGGER"));
    var routerOptions = CONFIG.get("ROUTER");
    routerOptions.hostname = CONFIG.get("HOSTNAME");
    router.setConfig(routerOptions);

    router.addMethod("dev", router.devMethod());
    router.addMethod("dev", fe.devMethod(router));

    fe.domain(CONFIG.get("HOSTNAME"));
    fe.setPorts(parseInt(_PORT), 443);
    fe.setPath(CONFIG.get("ROOT") + CONFIG.get("CONTROLLERS"));
    router.addRoute(fe.parseControllers());

    var cookieCutter = new CookieCutter();
    cookieCutter.addCookieCutter("template", "template", function(data){return true;});

    var setupGlobalView = function(req, res, next) {
        if(!res.globalView) {
            res.globalView = {};
        }

        next();
    };

    var addPathToGlobal = function(req, res, next) {
        res.globalView.path = req._parsedUrl.path;

        next();
    };

    var notFound = function(req, res, next) {
        res.status(404);

        var locals = {};
        if(res.globalView && typeof res.globalView === "object") {
            for(var key in res.globalView) {
                locals[key] = res.globalView[key];
            }
        }

        locals.path = req.path;
        locals.method = req.method;

        res.render("status-codes/404", {locals: locals});

        next();
    };

    var errorHandler = function(err, req, res, next) {
        res.status(500);

        var locals = {};
        if(res.globalView && typeof res.globalView === "object") {
            for(var key in res.globalView) {
                locals[key] = res.globalView[key];
            }
        }

        if(err) {
            if(err.stack) {
                locals.stackError = "<style>p {margin: 0px 0px 0px 30px; font-size: 14px;} p.first {font-weight: bold; margin: 0px; font-size: 16px;}</style><div class='error_container'><p class='first'>" + err.stack.replace(new RegExp("\n", "g"), "</p><p>") + "</p></div>";
            }

            switch(typeof err) {
                case "string":
                    locals.error = err;
                    break;
            }

            res.render("status-codes/500", {locals: locals});
        } else {
            locals.error = "How did you get here without an error?";
            res.render("status-codes/500", {locals: locals});
        }
    };

    var expressDaemon = express();
    expressDaemon.set("views", CONFIG.get("ROOT") + CONFIG.get("VIEWS"));
    expressDaemon.set("view engine", "ejs");
    expressDaemon.engine("ejs", ejs);
    expressDaemon.use(bodyParser.json()
                    , bodyParser.urlencoded({extended: true})
                    , cookieParser()
                    , setupGlobalView
                    , addPathToGlobal
                    , express.static(CONFIG.get("ROOT") + CONFIG.get("PUBLIC"))
                    , logger.middleware
                    , cookieCutter.middleware
                    , router.middleware
                    , notFound
                    , errorHandler);

    httpCB(expressDaemon, _PORT);
}(function(daemon, _PORT) {
    var http = require("http");
    http.createServer(daemon).listen(_PORT, function() {
        console.log(" -- Listening["+_PORT+"]: \033[32mSuccessful\033[0m");
    });
}));
