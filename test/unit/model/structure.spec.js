"use strict";

describe("Create node", function() {
    var CONFIG       = require("config.js"),
        inflateModel = sense4us.inflateModel,
        rootDiv      = document.createElement("div");

    rootDiv.setAttribute("id",            "model-builder");
    rootDiv.setAttribute("data-protocol", config.PROTOCOL);
    rootDiv.setAttribute("data-hostname", config.HOSTNAME);
    rootDiv.setAttribute("data-port",     config.PORT);
    rootDiv.setAttribute("style",         "height: 700px; width: 1000px");

    inflateModel(rootDiv);

    var createNode = require("structures/create_node.js");

    it("should be a function", function() {
        expect(createNode).to.be.an.instanceof(Function);
    })
});