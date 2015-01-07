var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var cardSchema = new Schema({
  name: { type: String },
  description: { type: String, default: "" },
  membership: {
    //_column: { type: String },
    _column: { type: mongoose.SchemaTypes.ObjectId,ref: "Column" },
    position: { type: Number },
    // make this _owner and reference
    owner: { type: String },
    members: [ { type: String } ]
  },
  classification: {
    priority: { type: Number },
    estimate: { type: Number }
  },
  comments: [comment]
});

var comment = new Schema({
  user: { type: String },
  content: { type: String }
});

module.exports = mongoose.model('Card', cardSchema);
