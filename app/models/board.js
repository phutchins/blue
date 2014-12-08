// app/models/project.js
// load the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var comment = new Schema({
  author: { type: String },
  content: { type: String },
  date: { type: Date, default: Date.now() }
});

var item = new Schema({
  name: { type: String },
  description: { type: String },
  comments: [comment]
});

// define the schema for our user model
var boardSchema = new Schema({
  name: { type: String },
  owner: { type: String },
  last_update: { type: Date },
  columns: { type: [String], default: ["todo", "doing", "done"] },
  items: [item]

});

// create the model for users and expose it to our app
module.exports = mongoose.model('Board', boardSchema);
