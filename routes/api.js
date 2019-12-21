/*
 *
 *
 *       Complete the API routing below
 *
 *
 */

"use strict";

var expect = require("chai").expect;
var MongoClient = require("mongodb");
var fetch = require("node-fetch");
var async = require("async");
var lodash = require("lodash");

const CONNECTION_STRING = process.env.DB; //MongoClient.connect(CONNECTION_STRING, function(err, db) {});

const mongoose = require("mongoose");
mongoose.connect(CONNECTION_STRING, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
var db = mongoose.connection;
db.once("open", function() {
  console.log("Successfully connected");
});

const Schema = mongoose.Schema;

let stockSchema = new Schema({
  _id: { type: mongoose.Schema.Types.ObjectId },
  stock: { type: String },
  likes: { type: Number },
  ip: { type: String }
});

var Stock = mongoose.model("Stock", stockSchema, "stocks");

function done(err, data) {
  if (err) {
    console.log(err);
  }
  if (data) {
    console.log(data);
  }
  return;
}

module.exports = function(app) {
  app.route("/api/stock-prices").get(function(req, res) {
    if (Array.isArray(req.query.stock)) {
      doubleStock(req, res);
    } else {
      singleStock(req, res);
    }
  });
};

function singleStock(req, res) {
  let symbol = req.query.stock;
  let likes = req.query.like === "true" ? 1 : 0;

  let url = "https://repeated-alpaca.glitch.me/v1/stock/" + symbol + "/quote";
  fetch(url)
    .then(response => {
      return response.json();
    })
    .then(response => {
      if (response === "Unknown symbol" || lodash.isEmpty(response) ) {
        res.json({ stockData: { error: "external source error", likes: 0 } });
      } else {
        let stock = response.symbol;
        let price = response.latestPrice;
        let ip = req.ip;

        Stock.findOne({ stock: stock, ip: ip }).exec((err, stockInDb) => {
          if (err) {
            done(err);
          }
          if (stockInDb && likes === 1) {
            let stockUpdate = {
              _id: stockInDb._id,
              likes: likes
            };

            Stock.findByIdAndUpdate(
              stockInDb._id,
              stockUpdate,
              { new: true },
              (err, theUpdatedStock) => {
                if (err) {
                  done(err);
                }

                res.json({
                  stockData: {
                    stock: stock,
                    price: price,
                    likes: theUpdatedStock.likes
                  }
                });
              }
            );
          } else if (stockInDb) {
            res.json({
              stockData: {
                stock: stock,
                price: price,
                likes: stockInDb.likes
              }
            });
          } else {
            let newStock = new Stock({
              _id: new mongoose.mongo.ObjectId(),
              stock: stock,
              likes: likes,
              ip: ip
            });
            newStock.save((err, theNewStock) => {
              if (err) {
                done(err);
              }
              res.json({
                stockData: {
                  stock: stock,
                  price: price,
                  likes: theNewStock.likes
                }
              });
            });
          }
        });
      }
    })
    .catch(err => {
      res.json({ stockData: { error: "external source error", likes: 0 } });
    });
}

async function doubleStock(req, res) {
  let symbols = [];
  let urls = [];
  let likes = req.query.like === "true" ? 1 : 0;
  for (let i = 0; i < 2; i++) {
    symbols.push(req.query.stock[i]);
    urls.push(
      "https://repeated-alpaca.glitch.me/v1/stock/" + symbols[i] + "/quote"
    );
  }
  let responses = await getAllUrls(urls);
  let finalResponses = [];
  let stocks = [];
  let prices = [];
  let setResponse = [];
  let ip = req.ip;
  let finalLikes = [];
  let index = [];

  for (let i = 0; i < 2; i++) {
    if (responses[i] === "Unknown symbol" || lodash.isEmpty(responses[i]) ) {
      finalResponses[i] = {
        error: "external source error",
        rel_likes: 0
      };
      setResponse[i] = true;
    } else {
      stocks.push(responses[i].symbol);
      prices.push(responses[i].latestPrice);
      index.push(i);
    }
  }

  let updatedLikes = await updateLikes(stocks, ip, likes);
  if (setResponse[0] === true || setResponse[1] === true) {
    finalLikes[0] = 0;
    finalLikes[1] = 0;
  } else {
    for (let i = 0; i < 2; i++) {
      finalLikes[i] = updatedLikes[index[i]];
    }
  }

  for (let i = 0; i < 2; i++) {
    if (setResponse[i] !== true) {
      finalResponses[i] = {
        stock: stocks[index[i]],
        price: prices[index[i]],
        rel_likes:
          i === 0
            ? finalLikes[0] - finalLikes[1]
            : finalLikes[1] - finalLikes[0]
      };
    }
  }
  res.json({ stockData: [finalResponses[0], finalResponses[1]] });
}

async function getAllUrls(urls) {
  try {
    var data = await Promise.all(
      urls.map(url => fetch(url).then(response => response.json()))
    );

    return data;
  } catch (error) {
    console.log(error);

    throw error;
  }
}

async function updateLikes(stocks, ip, likes) {
  try {
    var updatedLikes = await Promise.all(
      stocks.map(stock =>
        StockFindOne({ stock: stock, ip: ip }).then(async function(stockInDb){
          let updatedLike = await updateOneLike(stockInDb, likes, stock, ip);
          return updatedLike;
        })
      )
    );
    return updatedLikes;
  } catch (error) {
    console.log(error);

    throw error;
  }
}

function StockFindOne(criteria) {
  return new Promise(resolve => {
    Stock.findOne(criteria, (err, stockInDb) => resolve(stockInDb));
  });
}

async function updateOneLike(stockInDb, likes, stock, ip) {
  try {
    if (stockInDb && likes === 1) {
      let stockUpdate = {
        _id: stockInDb._id,
        likes: likes
      };

      let updatedLike = await StockFindByIdAndUpdate(
        stockInDb._id,
        stockUpdate
      );

      return updatedLike;
    } else if (stockInDb) {
      return stockInDb.likes;
    } else {
      let newStock = new Stock({
        _id: new mongoose.mongo.ObjectId(),
        stock: stock,
        likes: likes,
        ip: ip
      });
      let updatedLike = await NewStockSave(newStock);
      return updatedLike;
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
}

function StockFindByIdAndUpdate(stockInDbId, stockUpdate) {
  return new Promise(resolve => {
    Stock.findByIdAndUpdate(
      stockInDbId,
      stockUpdate,
      { new: true },
      (err, theUpdatedStock) => resolve(theUpdatedStock.likes)
    );
  });
}

function NewStockSave(newStock) {
  return new Promise(resolve => {
    newStock.save((err, theNewStock) => {
      resolve(theNewStock.likes);
    });
  });
}
