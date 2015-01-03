var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ColumnSchema = new Schema({
  name: { type: String},
  _cards: [ { type: mongoose.SchemaTypes.ObjectId,ref: "Card" } ],
});

module.exports = mongoose.model('Column', ColumnSchema);
