const mongoose = require("mongoose");
const { Schema } = mongoose;
const plm = require("passport-local-mongoose");
const passportLocalMongoose = plm && plm.default ? plm.default : plm;

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
  },
});

// Adds username, hash, salt fields and convenience methods to the schema
userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);
