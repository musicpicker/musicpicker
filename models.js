var mongoose = require('mongoose');
var Schema = mongoose.Schema;

mongoose.connect('localhost', 'musicpicker');

var userSchema = new Schema({
  Username: {type: String, required: true, unique: true},
  Password: {type: String, required: true},
  Email: String,
  Token: String
});

var deviceSchema = new Schema({
  Name: {type: String, required: true},
  OwnerId: {type: Schema.Types.ObjectId, required: true},
  RegistrationDate: {type: Schema.Types.Date, required: true},
  AccessDate: Schema.Types.Date,
  Tracks: Schema.Types.Mixed
});

var artistSchema = new Schema({
  Name: {type: String, required: true},
  MbId: String
});

var albumSchema = new Schema({
  Name: {type: String, required: true},
  ArtistId: {type: Schema.Types.ObjectId, required: true},
  Year: Number,
  MbId: String,
  Artwork: String
});

var trackSchema = new Schema({
  Name: {type: String, required: true},
  Album: {type: Schema.Types.ObjectId, required: true},
  Number: Number,
  MbId: String
});

module.exports = {
  User: mongoose.model('User', userSchema),
  Device: mongoose.model('Device', deviceSchema),
  Artist: mongoose.model('Artist', artistSchema),
  Album: mongoose.model('Album', albumSchema),
  Track: mongoose.model('Track', trackSchema)
}
