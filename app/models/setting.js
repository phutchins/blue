var mongoose = require('mongoose');

var Schema = mongoose.Schema;
var settingSchema = new Schema({
  name: { type: String },
  enabled: { type: Boolean, default: false },
  value: { type: String, default: null },
});

module.exports = mongoose.model('Setting', settingSchema);
