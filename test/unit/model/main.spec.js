describe("Inflate model", function() {
    it("should be a function", function() {
        expect(sense4us.inflateModel).to.be.an.instanceof(Function);
    });

    it("should generate a new loadedModel", function() {
        var CONFIG       = require("config.js"),
            inflateModel = sense4us.inflateModel,
            rootDiv      = document.createElement("div");
            
        rootDiv.setAttribute("id",            "model-builder");
        rootDiv.setAttribute("data-protocol", "http");
        rootDiv.setAttribute("data-hostname", "localhost");
        rootDiv.setAttribute("data-port",     "3000");
        rootDiv.setAttribute("style",         "height: 700px; width: 1000px");

        inflateModel(rootDiv);

        expect(sense4us.loadedModel).to.be.an.instanceof(Object);
        expect(sense4us.loadedModel.nodeData).to.be.an.instanceof(Object);
        expect(sense4us.loadedModel.nodeGui).to.be.an.instanceof(Object);
        expect(sense4us.loadedModel.links).to.be.an.instanceof(Object);
        expect(sense4us.loadedModel.settings).to.be.an.instanceof(Object);
        expect(sense4us.loadedModel.settings.name).to.be.equal("New Model");
        expect(sense4us.loadedModel.settings.offsetX).to.be.equal(0);
        expect(sense4us.loadedModel.settings.offsetY).to.be.equal(0);
    });
});

describe("Backend api", function() {
    var CONFIG       = require("config.js"),
        inflateModel = sense4us.inflateModel,
        rootDiv      = document.createElement("div");

    rootDiv.setAttribute("id",            "model-builder");
    rootDiv.setAttribute("data-protocol", "http");
    rootDiv.setAttribute("data-hostname", "localhost");
    rootDiv.setAttribute("data-port",     "3000");
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

describe("Create node", function() {
    var CONFIG       = require("config.js"),
        inflateModel = sense4us.inflateModel,
        rootDiv      = document.createElement("div");

    rootDiv.setAttribute("id",            "model-builder");
    rootDiv.setAttribute("data-protocol", "http");
    rootDiv.setAttribute("data-hostname", "localhost");
    rootDiv.setAttribute("data-port",     "3000");
    rootDiv.setAttribute("style",         "height: 700px; width: 1000px");

    inflateModel(rootDiv);

    var createNode = require("structures/create_node.js");

    it("should be a function", function() {
        expect(createNode).to.be.an.instanceof(Function);
    })
});