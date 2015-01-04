#!/usr/bin/env node

var mongoose = require('mongoose');
var configDB = require('../config/database.js');
var db = mongoose.connection;
var Card = require("../app/models/card");
db.once('open', function() {
  require('../app/models/project');
});

mongoose.connect(configDB.url);

var getAllCardIds = function(err, callback) {
  var cardIds = Array;
  Card.find().sort({_id: 'descending'}).forEach( function(err, card) {
    if (err) { console.log(err) };
    cardIds.push( card._id );
    callback(err, cardIds);
  });
};

var getNonOprhanCards = function(err, callback) {
  var cardIds = Array;
  Column.find().forEach( function(err, column) {
    if (err) { console.log(err) };
    cardIds.push(column._id);
    callback(err, cardIds);
  });
};

var removeOrphanCards = function(err, removedCards, callback) {
};

getAllCardIds( function(err, ids) {
  console.log("IDS",ids);
});
