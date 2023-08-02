const mongoose = require("mongoose");

const VerifiedNumberSchema = new mongoose.Schema({
  number: {
    type: mongoose.SchemaTypes.String,
  },
  verified: {
    type: mongoose.SchemaTypes.Boolean,
    default: false,
  },
  updatedAt: {
    type: mongoose.SchemaTypes.Number,
    default: new Date().getTime(),
  },
});

module.exports = mongoose.model("VerifiedNumber", VerifiedNumberSchema);
