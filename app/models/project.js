// app/models/project.js
// load the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// define the schema for our user model
var projectSchema = new Schema({
  name: { type: String },
  description: { type: String },
  owner: { type: String },
  last_update: { type: Date },
  membership: {
    boards: { type: Array },
    _defaultBoard: { type: mongoose.SchemaTypes.ObjectId,ref: "Board" },
  }
});

// create the model for users and expose it to our app
module.exports = mongoose.model('Project', projectSchema);
