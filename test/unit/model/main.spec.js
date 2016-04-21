"use strict";

describe("Inflate model", function() {
    it("should be a function", function() {
        expect(sense4us.inflateModel).to.be.an.instanceof(Function);
    });

    it("should generate a new loadedModel", function() {
        var CONFIG       = require("config.js"),
            inflateModel = sense4us.inflateModel,
            rootDiv      = document.createElement("div");
            
        rootDiv.setAttribute("id",            "model-builder");
        rootDiv.setAttribute("data-protocol", config.PROTOCOL);
        rootDiv.setAttribute("data-hostname", config.HOSTNAME);
        rootDiv.setAttribute("data-port",     config.PORT);
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