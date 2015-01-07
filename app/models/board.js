// app/models/project.js
// load the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Column = require( './column' );

var comment = new Schema({
  author: { type: String },
  content: { type: String },
  date: { type: Date, default: Date.now() }
});

// define the schema for our user model
var boardSchema = new Schema({
  name: { type: String },
  _owner: { type: mongoose.SchemaTypes.ObjectId,ref: "User" },
  last_update: { type: Date },
  _columns: [ { type: mongoose.SchemaTypes.ObjectId,ref: "Column" } ],
});

// create the model for users and expose it to our app
module.exports = mongoose.model('Board', boardSchema);
