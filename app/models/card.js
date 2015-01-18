var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var cardSchema = new Schema({
  name: { type: String },
  description: { type: String, default: "" },
  membership: {
    //_column: { type: String },
    _column: { type: mongoose.SchemaTypes.ObjectId,ref: "Column" },
    _comments: [ { type: mongoose.SchemaTypes.ObjectId,ref: "Comment" } ],
    position: { type: Number },
    // make this _owner and reference
    owner: { type: String },
    members: [ { type: String } ]
  },
  classification: {
    priority: { type: Number },
    estimate: { type: Number }
  },
});

module.exports = mongoose.model('Card', cardSchema);
