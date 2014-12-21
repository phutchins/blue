// app/models/project.js
// load the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Card = require( './card' );

var comment = new Schema({
  author: { type: String },
  content: { type: String },
  date: { type: Date, default: Date.now() }
});

var Card = new Schema({
  cardId: String,
  columnName: String
});

// define the schema for our user model
var boardSchema = new Schema({
  name: { type: String },
  owner: { type: String },
  last_update: { type: Date },
  columns: { type: [String], default: ["todo", "doing", "done"] },
  cards: [Card],
});

// create the model for users and expose it to our app
module.exports = mongoose.model('Board', boardSchema);
