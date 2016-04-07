var mongoose = require('mongoose');

var Schema = mongoose.Schema;
var settingSchema = new Schema({
  name: { type: String },
  enabled: { type: Boolean, default: false },
  value: { type: String, default: null },
});

settingSchema.statics.getAllSettings = function getAllSettings(data, callback) {
  var self = this;
  var settinglist = {};
  this.find({}, function(err, settings) {
    if (err) { return logger.error("[GET ALL SETTINGS] Error getting all users: ", err) }
    settings.forEach(function(setting) {
      self.sanitize(setting, function(sanitizedSetting) {
        settinglist[setting.name] = sanitizedSetting;
      });
    });
    return callback(settinglist);
  })
};

settingSchema.statics.sanitize = function sanitize(setting, callback) {
  var sanitizedSetting = {
    id: setting._id.toString(),
    name: setting.name,
    enabled: setting.enabled,
    value: setting.value
  };

  return callback(sanitizedSetting);
};

module.exports = mongoose.model('Setting', settingSchema);


