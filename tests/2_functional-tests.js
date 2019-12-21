/*
 *
 *
 *       FILL IN EACH FUNCTIONAL TEST BELOW COMPLETELY
 *       -----[Keep the tests in the same order!]-----
 *       (if additional are added, keep them at the very end!)
 */

var chaiHttp = require("chai-http");
var chai = require("chai");
var assert = chai.assert;
var server = require("../server");

chai.use(chaiHttp);

suite("Functional Tests", function() {
  suite("GET /api/stock-prices => stockData object", function() {
    before(function(done) {
      chai
        .request(server)
        .get("/api/stock-prices")
        .query({ stock: "amzn" })
        .end(function(err, res) {
          done();
        });
    });

    test("1 stock", function(done) {
      chai
        .request(server)
        .get("/api/stock-prices")
        .query({ stock: "goog" })
        .end(function(err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.body.stockData.stock, "GOOG");
          assert.property(res.body.stockData, "price");
          assert.property(res.body.stockData, "likes");
          done();
        });
    });

    test("1 stock with like", function(done) {
      chai
        .request(server)
        .get("/api/stock-prices")
        .query({ stock: "msft", like: "true" })
        .end(function(err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.body.stockData.stock, "MSFT");
          assert.property(res.body.stockData, "price");
          assert.equal(res.body.stockData.likes, 1);
          done();
        });
    });

    test("1 stock with like again (ensure likes arent double counted)", function(done) {
      chai
        .request(server)
        .get("/api/stock-prices")
        .query({ stock: "amzn", like: "true" })
        .end(function(err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.body.stockData.stock, "AMZN");
          assert.property(res.body.stockData, "price");
          assert.equal(res.body.stockData.likes, 1);
          done();
        });
    });

    test("2 stocks", function(done) {
      chai
        .request(server)
        .get("/api/stock-prices")
        .query({ stock: ["amzn", "goog"] })
        .end(function(err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.body.stockData[0].stock, "AMZN");
          assert.property(res.body.stockData[0], "price");
          assert.property(res.body.stockData[0], "rel_likes");
          assert.equal(res.body.stockData[1].stock, "GOOG");
          assert.property(res.body.stockData[1], "price");
          assert.property(res.body.stockData[1], "rel_likes");
          done();
        });
    });

    test("2 stocks with like", function(done) {
      chai
        .request(server)
        .get("/api/stock-prices")
        .query({ stock: ["amzn", "goog"], like: "true" })
        .end(function(err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.body.stockData[0].stock, "AMZN");
          assert.property(res.body.stockData[0], "price");
          assert.equal(res.body.stockData[0].rel_likes, 0);
          assert.equal(res.body.stockData[1].stock, "GOOG");
          assert.property(res.body.stockData[1], "price");
          assert.equal(res.body.stockData[1].rel_likes, 0);
          done();
        });
    });
  });
});
