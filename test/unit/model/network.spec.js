"use strict";

describe("Backend api", function() {
    var CONFIG       = require("config.js"),
        inflateModel = sense4us.inflateModel,
        rootDiv      = document.createElement("div");

    rootDiv.setAttribute("id",            "model-builder");
    rootDiv.setAttribute("data-protocol", config.PROTOCOL);
    rootDiv.setAttribute("data-hostname", config.HOSTNAME);
    rootDiv.setAttribute("data-port",     config.PORT);
    rootDiv.setAttribute("style",         "height: 700px; width: 1000px");

    inflateModel(rootDiv);

    var backendApi = require("api/backend_api.js");
    it("should be a function", function() {
        expect(backendApi).to.be.an.instanceof(Function);
    });

    it("should get 404 on invalid request", function(done) {
        backendApi("/thisShould404", function(response, err) {
            if(err) {
                return done(err);
            }

            if(response.status === 404) {
                return done();
            }

            throw new Error("Status is not 404.");
        });
    });

    it("should crash if non json data is given", function(done) {
        try {
            backendApi("/thisShouldCrash", "Hello, world!", function(response, err) {
                throw new Error("It didn't crash!");
            });
        } catch(e) {
            done();
        }
    });
});