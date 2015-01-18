var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var commentSchema = new Schema({
  _user: { type: mongoose.SchemaTypes.ObjectId,ref: "User" },
  postDate: { type: Date, default: Date.now() },
  updateDate: { type: Date, default: Date.now() },
  content: { type: String },
  membership: {
    _card: { type: mongoose.SchemaTypes.ObjectId,ref: "Card" },
  }
});

module.exports = mongoose.model('Comment', commentSchema);
