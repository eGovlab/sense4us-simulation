var should = require("should");

describe("Array", function() {
    describe("indexOf", function() {
        ([1,2,6,4].indexOf(4)).should.be.exactly(3);
        ([1,2,6,4].indexOf(8)).should.be.exactly(-1);
    });

    describe("pop", function() {
        it("should be its previous length - 1 once popped.", function() {
            var _              = [1,2,3,4,5];
            var previousLength = _.length;

            _.pop();
            (_.length).should.be.exactly(previousLength - 1);
            previousLength = _.length;
            _.pop();
            (_.length).should.be.exactly(previousLength - 1);
        });

        it("should have previous end value be equal to popped value.", function() {
            var _             = [1,2,3,4,5];
            var previousValue = _[_.length - 1];
            var val           = _.pop();

            (val).should.be.exactly(previousValue);
            previousValue = _[_.length - 1];
            val           = _.pop();
        });

        it("should return undefined if array is empty.", function() {
            var _   = [];
            var val = _.pop();

            (val === undefined).should.be.exactly(true);
            val = _.pop();
            (val === undefined).should.be.exactly(true);
        });
    });

    describe("push", function() {
        var _ = [1,2,3,4,5];
        _.push(6);
        (_.length).should.be.exactly(6);
        (_[_.length - 1]).should.be.exactly(6);
    });
});